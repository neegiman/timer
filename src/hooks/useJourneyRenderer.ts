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

function drawPrinceFrame(element: SVGSVGElement | null | undefined, frame: number) {
  if (!element || element.dataset.frame === String(frame)) return;
  element.setAttribute('viewBox', princeViewBox(frame));
  element.dataset.frame = String(frame);
}

function drawVehicleFrame(element: SVGSVGElement | null | undefined, frame: number) {
  if (!element || element.dataset.frame === String(frame)) return;
  element.setAttribute('viewBox', vehicleViewBox(frame));
  element.dataset.frame = String(frame);
}

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
    const progressPrince = marker.current?.querySelector<SVGSVGElement>('[data-prince-sprite]');
    const progressVehicle = marker.current?.querySelector<SVGSVGElement>('[data-vehicle-sprite]');
    const progressAnimalBody = marker.current?.querySelector<SVGGElement>('[data-animal-body]');
    const progressAnimalJoints = Array.from(marker.current?.querySelectorAll<SVGGElement>('[data-animal-joint]') ?? [])
      .map((element) => ({ element, name: element.dataset.animalJoint as AnimalJoint }));
    const progressJoints = Array.from(marker.current?.querySelectorAll<SVGGElement>('[data-joint]') ?? [])
      .map((element) => ({ element, name: element.dataset.joint as JointName }));
    const profile = motionProfile(characterId);
    const animalId = isAnimalId(characterId) ? characterId : null;
    const vehicleId = isPixelVehicle(characterId) ? characterId : null;
    const layers = Array.from(element.querySelectorAll<HTMLElement>('[data-layer]'));
    const visitor = element.querySelector<HTMLElement>('[data-scenery-visitor]');
    const particles = Array.from(element.querySelectorAll<HTMLElement>('[data-scenery-particle]'));
    const light = element.querySelector<HTMLElement>('[data-scenery-light]');
    const planets = Array.from(element.querySelectorAll<HTMLElement>('[data-space-planet]'));
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let width = element.clientWidth;
    let height = element.clientHeight;
    // WebKit can round transformed bounds differently at each X position.
    // Read the layout width so moving/pausing the actor cannot move its goal.
    const measureActorWidth = () => Number.parseFloat(getComputedStyle(actor).width);
    let actorWidth = measureActorWidth();
    let progressWidth = track.current?.clientWidth ?? 0;
    let geometry = finishGeometry(width, actorWidth);
    element.style.setProperty('--finish-x', `${geometry.lineX}px`);
    element.style.setProperty('--scene-height', `${height}px`);
    const sizeLayers = () => {
      for (const layer of layers) {
        const period = layer.dataset.tileScale ? height * Number(layer.dataset.tileScale) : TILE_WIDTH;
        layer.style.setProperty('--tile-width', `${period}px`);
        layer.dataset.tileWidth = String(period);
      }
    };
    sizeLayers();

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
      const miniatureAction = next.hasStarted && !next.isFinished && next.remainingTime > 0 ? 'walk' : 'idle';
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
        drawPrinceFrame(princeSprite.current, pixelFrame);
      }
      // The miniature shares the existing gait clock, but rests at its destination
      // once time is up while the main character finishes its crossing/celebration.
      drawPrinceFrame(progressPrince, princeFrame(miniatureAction, gait, reduced));

      if (vehicleSprite.current && vehicleId) {
        const pixelFrame = pose.phase === 'SETTLE' && pose.actionElapsedMs < 175 ? vehicleFrame(vehicleId, 'walk', gait, reduced)
          : vehicleFrame(vehicleId, pose.characterAction, animationTime, reduced);
        drawVehicleFrame(vehicleSprite.current, pixelFrame);
      }
      if (vehicleId) drawVehicleFrame(progressVehicle, vehicleFrame(vehicleId, miniatureAction, gait, reduced));

      if (animalId) {
        const animal = pose.phase === 'SETTLE' ? settleAnimalPose(animalId, gait, pose.actionElapsedMs, reduced)
          : animalActionPose(animalId, pose.characterAction, animationTime, reduced);
        animalBody.current?.setAttribute('transform', `translate(0 ${animal.bob.toFixed(5)})`);
        for (const joint of animalJoints.current) joint.element.setAttribute('transform', `rotate(${animal.joints[joint.name].toFixed(5)})`);
        // Reuse the exact main pose during travel; the miniature rests at the
        // endpoint while the main character crosses and celebrates.
        const miniature = miniatureAction === 'walk' && walking ? animal : animalActionPose(animalId, miniatureAction, gait, reduced);
        progressAnimalBody?.setAttribute('transform', `translate(0 ${miniature.bob.toFixed(5)})`);
        for (const joint of progressAnimalJoints) joint.element.setAttribute('transform', `rotate(${miniature.joints[joint.name].toFixed(5)})`);
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
      if (progressJoints.length > 0) {
        const miniature = miniatureAction === 'walk' && walking ? jointPose
          : characterId === 'princess' ? princessPose(miniatureAction, gait, reduced)
          : getCharacterPose(miniatureAction, gait, profile.cycleMs, reduced);
        for (const joint of progressJoints) joint.element.setAttribute('transform', `rotate(${miniature[joint.name].toFixed(5)})`);
      }
      for (const layer of layers) {
        const rate = Number(layer.dataset.rate);
        const offset = reduced ? 0 : loopOffset(distance * rate, Number(layer.dataset.tileWidth));
        layer.style.transform = `translate3d(${-offset}px, 0, 0)`;
        layer.dataset.scrollOffset = offset.toFixed(6);
      }
      if (light && !reduced) {
        light.style.opacity = String((theme === 'day' ? .12 : .09) + .035 * Math.sin(elapsed / 6500));
        light.style.transform = `translate3d(${Math.sin(elapsed / 11_000) * 6}px, 0, 0)`;
      }
      if (visitor && !reduced) {
        const event = sceneryEvent(elapsed, season, theme, characterId === 'rocket');
        if (visitor.dataset.event !== event.kind) visitor.dataset.event = event.kind;
        visitor.style.opacity = String(event.opacity);
        const meteor = event.kind === 'shooting-star', bird = event.kind === 'birds';
        const eventX = meteor ? width * (.9 - event.progress * .72) : width * (1.05 - event.progress * 1.35);
        const eventY = meteor ? height * (.025 + event.progress * .23)
          : height * (bird ? .1 + .025 * Math.sin(event.progress * Math.PI * 2) : .22 + .05 * Math.sin(event.progress * Math.PI * 3));
        visitor.style.transform = `translate3d(${eventX}px, ${eventY}px, 0)`;
        visitor.style.setProperty('--wing', event.flutter.toFixed(3));
        visitor.style.setProperty('--wing-angle', `${(Math.sin(elapsed / 150) * 28).toFixed(2)}deg`);
        visitor.style.setProperty('--ufo-glow', (.65 + .25 * Math.sin(elapsed / 400)).toFixed(3));
      }
      for (const [index, planet] of planets.entries()) {
        const driftX = reduced ? 0 : Math.sin(elapsed / (19_000 + index * 6000) + index) * (5 + index * 2);
        const driftY = reduced ? 0 : Math.sin(elapsed / (14_000 + index * 4000) + index) * 4;
        planet.style.transform = `translate3d(${driftX.toFixed(3)}px, ${driftY.toFixed(3)}px, 0)`;
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
      if (marker.current) {
        marker.current.dataset.progress = pose.position.toFixed(6);
        marker.current.dataset.action = miniatureAction;
      }
    };
    const resize = new ResizeObserver(() => {
      width = element.clientWidth; height = element.clientHeight;
      element.style.setProperty('--actor-limit', `${Math.min(168, (height * .78 - 20) * 160 / profile.groundY)}px`);
      actorWidth = measureActorWidth();
      progressWidth = track.current?.clientWidth ?? 0;
      geometry = finishGeometry(width, actorWidth);
      element.style.setProperty('--finish-x', `${geometry.lineX}px`);
      element.style.setProperty('--scene-height', `${height}px`);
      sizeLayers();
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
