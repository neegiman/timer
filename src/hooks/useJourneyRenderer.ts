import { useEffect, useRef } from 'react';
import { getAnimationState } from '@/lib/animation';
import { clamp, finishOpacity, groundDistance, loopOffset, smoothstep, TILE_WIDTH } from '@/lib/journey';
import { arrivalMotion, finishGeometry } from '@/lib/arrivalMotion';
import { getCharacterPose, type JointName } from '@/lib/characterPose';
import { motionProfile } from '@/lib/motionProfiles';
import type { AnimationInput, AnimationState } from '@/types/animation';
import { animalActionPose, isAnimalId, settleAnimalPose } from '@/lib/animalActionPose';
import { animalProfiles, type AnimalJoint } from '@/lib/animalMotion';
import { PRINCESS_GAIT, princessPose, settlePrincessPose } from '@/lib/princessMotion';
import { PRINCE_GAIT, princeFrame, princeViewBox } from '@/lib/princeMotion';
import { isPixelVehicle, vehicleFrame, vehicleViewBox } from '@/lib/pixelVehicles';
import { sceneryEvent, sceneryParticle } from '@/lib/sceneryEvents';
import type { Season } from '@/lib/seasons';
import type { SceneTheme } from '@/lib/dayNight';

/** A shared elapsed-time clock drives feet, ground and scenery. Frame updates never enter React state. */
export function useJourneyRenderer(input: AnimationInput, state: AnimationState, sampledAt: number, characterId: string, season: Season, theme: SceneTheme) {
  const scene = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const goal = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const snapshot = useRef({ input, sampledAt });
  const animations = useRef<Animation[]>([]);
  const joints = useRef<{ element: SVGGElement; name: JointName }[]>([]);
  const animalJoints = useRef<{ element: SVGGElement; name: AnimalJoint }[]>([]);
  const animalBody = useRef<SVGGElement | null>(null);
  const princeSprite = useRef<SVGSVGElement | null>(null);
  const vehicleSprite = useRef<SVGSVGElement | null>(null);

  useEffect(() => { snapshot.current = { input, sampledAt }; }, [input, sampledAt]);
  useEffect(() => {
    animations.current = body.current?.getAnimations({ subtree: true }) ?? [];
    for (const animation of animations.current) animation.pause();
    joints.current = Array.from(body.current?.querySelectorAll<SVGGElement>('[data-joint]') ?? [])
      .map((element) => ({ element, name: element.dataset.joint as JointName }));
    animalJoints.current = Array.from(body.current?.querySelectorAll<SVGGElement>('[data-animal-joint]') ?? [])
      .map((element) => ({ element, name: element.dataset.animalJoint as AnimalJoint }));
    animalBody.current = body.current?.querySelector<SVGGElement>('[data-animal-body]') ?? null;
    princeSprite.current = body.current?.querySelector<SVGSVGElement>('[data-prince-sprite]') ?? null;
    vehicleSprite.current = body.current?.querySelector<SVGSVGElement>('[data-vehicle-sprite]') ?? null;
  }, [state.phaseKey, state.characterAction, characterId]);

  useEffect(() => {
    const element = scene.current;
    const actor = wrapper.current;
    const sprite = body.current;
    if (!element || !actor || !sprite) return;
    const profile = motionProfile(characterId);
    const animalId = isAnimalId(characterId) ? characterId : null;
    const vehicleId = isPixelVehicle(characterId) ? characterId : null;
    const layers = Array.from(element.querySelectorAll<HTMLElement>('[data-layer]'));
    const visitor = element.querySelector<HTMLElement>('[data-scenery-visitor]');
    const particles = Array.from(element.querySelectorAll<HTMLElement>('[data-scenery-particle]'));
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let width = element.clientWidth;
    let height = element.clientHeight;
    let actorWidth = actor.getBoundingClientRect().width;
    let progressWidth = track.current?.clientWidth ?? 0;
    let geometry = finishGeometry(width, actorWidth);
    element.style.setProperty('--finish-x', `${geometry.lineX}px`);

    const draw = () => {
      const sample = snapshot.current;
      const frozen = sample.input.isPaused;
      const delta = sample.sampledAt > 0 ? Math.max(0, Date.now() - sample.sampledAt) : 0;
      const next = { ...sample.input,
        remainingTime: frozen || sample.input.isFinished ? sample.input.remainingTime : Math.max(0, sample.input.remainingTime - delta),
        finishElapsedMs: sample.input.finishElapsedMs + (sample.input.isFinished && !frozen ? delta : 0),
      };
      const pose = getAnimationState(next);
      const elapsed = clamp(next.totalDuration - next.remainingTime, 0, next.totalDuration);
      const scale = actorWidth / 160;
      const speed = (animalId ? animalProfiles[animalId].travel / profile.cycleMs
        : characterId === 'princess' ? PRINCESS_GAIT.travel / profile.cycleMs
        : characterId === 'prince' ? PRINCE_GAIT.travel / profile.cycleMs : groundDistance(1, profile.cycleMs)) * scale;
      const motion = arrivalMotion(elapsed, next.totalDuration, next.finishElapsedMs, geometry, speed);
      const gait = motion.gait, distance = motion.backgroundDistance, x = motion.x;
      const groundY = height * .78;
      const reduced = preference.matches;
      const walking = pose.characterAction === 'walk';
      const bob = 0;

      actor.style.transform = `translate3d(${x}px, ${groundY}px, 0)`;
      actor.dataset.position = x === geometry.startX ? '.42' : (x / width).toFixed(6);
      actor.dataset.finishLineX = geometry.lineX.toFixed(6);
      actor.dataset.finishStopX = geometry.stopX.toFixed(6);
      actor.dataset.gaitTime = gait.toFixed(4);
      element.dataset.groundDistance = distance.toFixed(6);
      element.dataset.groundY = groundY.toFixed(4);
      element.style.setProperty('--jump-height', '12px');
      sprite.style.transform = `translateY(${bob * scale}px)`;
      // Finish actions change on the frame clock too, so a 250ms text/UI tick
      // cannot start a body jump halfway through its joint animation.
      if (sprite.dataset.action !== pose.characterAction) {
        sprite.dataset.action = pose.characterAction;
        sprite.dataset.phaseKey = pose.phaseKey;
        animations.current = sprite.getAnimations({ subtree: true });
        for (const animation of animations.current) animation.pause();
      }
      const animationTime = walking ? gait : pose.actionElapsedMs;
      for (const animation of animations.current) animation.currentTime = animationTime;

      if (princeSprite.current) {
        const pixelFrame = pose.phase === 'SETTLE' && pose.actionElapsedMs < 175 ? princeFrame('walk', gait, reduced)
          : princeFrame(pose.characterAction, animationTime, reduced);
        if (princeSprite.current.dataset.frame !== String(pixelFrame)) {
          princeSprite.current.setAttribute('viewBox', princeViewBox(pixelFrame));
          princeSprite.current.dataset.frame = String(pixelFrame);
        }
      }

      if (vehicleSprite.current && vehicleId) {
        const pixelFrame = pose.phase === 'SETTLE' && pose.actionElapsedMs < 175 ? vehicleFrame(vehicleId, 'walk', gait, reduced)
          : vehicleFrame(vehicleId, pose.characterAction, animationTime, reduced);
        if (vehicleSprite.current.dataset.frame !== String(pixelFrame)) {
          vehicleSprite.current.setAttribute('viewBox', vehicleViewBox(pixelFrame));
          vehicleSprite.current.dataset.frame = String(pixelFrame);
        }
      }

      if (animalId) {
        const animal = pose.phase === 'SETTLE' ? settleAnimalPose(animalId, gait, pose.actionElapsedMs, reduced)
          : animalActionPose(animalId, pose.characterAction, animationTime, reduced);
        animalBody.current?.setAttribute('transform', `translate(0 ${animal.bob.toFixed(5)})`);
        for (const joint of animalJoints.current) joint.element.setAttribute('transform', `rotate(${animal.joints[joint.name].toFixed(5)})`);
      }
      let jointPose = characterId === 'princess' ? princessPose(pose.characterAction, animationTime, reduced)
        : getCharacterPose(pose.characterAction, animationTime, profile.cycleMs, reduced, bob);
      if (characterId === 'princess' && pose.phase === 'SETTLE') {
        jointPose = settlePrincessPose(gait, pose.actionElapsedMs, reduced);
      } else if (!animalId && pose.phase === 'SETTLE') {
        const last = getCharacterPose('walk', gait, profile.cycleMs, reduced);
        const blend = smoothstep(pose.actionElapsedMs / 350);
        for (const name of Object.keys(jointPose) as JointName[]) jointPose[name] = last[name] + (jointPose[name] - last[name]) * blend;
      }
      for (const joint of joints.current) joint.element.setAttribute('transform', `rotate(${jointPose[joint.name].toFixed(5)})`);
      for (const layer of layers) {
        const rate = Number(layer.dataset.rate);
        const offset = reduced ? 0 : loopOffset(distance * rate, TILE_WIDTH);
        layer.style.transform = `translate3d(${-offset}px, 0, 0)`;
        layer.dataset.scrollOffset = offset.toFixed(6);
      }
      if (visitor && !reduced) {
        const event = sceneryEvent(elapsed, season, theme);
        if (visitor.dataset.event !== event.kind) visitor.dataset.event = event.kind;
        visitor.style.opacity = String(event.opacity);
        const eventY = event.kind === 'shooting-star' ? height * (.08 + event.progress * .2) : height * (.22 + .05 * Math.sin(event.progress * Math.PI * 3));
        visitor.style.transform = `translate3d(${width * (1.05 - event.progress * 1.35)}px, ${eventY}px, 0)`;
        visitor.style.setProperty('--wing', event.flutter.toFixed(3));
      }
      for (const [index, particle] of particles.entries()) {
        if (reduced) continue;
        const pose = sceneryParticle(elapsed, index);
        particle.style.transform = `translate3d(${pose.x * width}px, ${pose.y * height}px, 0) rotate(${pose.rotation}deg)`;
        particle.style.opacity = String(pose.opacity);
      }
      if (goal.current) goal.current.style.opacity = String(finishOpacity(pose.position));
      fill.current?.style.setProperty('transform', `scaleX(${pose.position})`);
      marker.current?.style.setProperty('transform', `translate3d(${pose.position * progressWidth}px, 0, 0)`);
      if (marker.current) marker.current.dataset.progress = pose.position.toFixed(6);
    };
    const resize = new ResizeObserver(() => {
      width = element.clientWidth; height = element.clientHeight;
      element.style.setProperty('--actor-limit', `${Math.min(168, (height * .78 - 20) * 160 / profile.groundY)}px`);
      actorWidth = actor.getBoundingClientRect().width;
      progressWidth = track.current?.clientWidth ?? 0;
      geometry = finishGeometry(width, actorWidth);
      element.style.setProperty('--finish-x', `${geometry.lineX}px`);
      draw();
    });
    resize.observe(element); resize.observe(actor);
    if (track.current) resize.observe(track.current);
    const loop = () => { draw(); if (!snapshot.current.input.isPaused) frame = requestAnimationFrame(loop); };
    const visibility = () => {
      cancelAnimationFrame(frame); element.dataset.suspended = String(document.hidden);
      if (!document.hidden) loop();
    };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    preference.addEventListener('change', draw);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); document.removeEventListener('visibilitychange', visibility); preference.removeEventListener('change', draw); };
  }, [input.isPaused, characterId, season, theme]);
  return { scene, wrapper, body, goal, track, fill, marker };
}
