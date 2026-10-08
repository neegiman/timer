import { useEffect, useRef } from 'react';
import { getAnimationState } from '@/lib/animation';
import { clamp, finishApproach, groundDistance, locomotionTime, loopOffset, smoothstep, TILE_WIDTH } from '@/lib/journey';
import { getCharacterPose, type JointName } from '@/lib/characterPose';
import { motionProfile } from '@/lib/motionProfiles';
import type { AnimationInput, AnimationState } from '@/types/animation';

/** A shared elapsed-time clock drives feet, ground and scenery. Frame updates never enter React state. */
export function useJourneyRenderer(input: AnimationInput, state: AnimationState, sampledAt: number, characterId: string) {
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

  useEffect(() => { snapshot.current = { input, sampledAt }; }, [input, sampledAt]);
  useEffect(() => {
    animations.current = body.current?.getAnimations({ subtree: true }) ?? [];
    for (const animation of animations.current) animation.pause();
    joints.current = Array.from(body.current?.querySelectorAll<SVGGElement>('[data-joint]') ?? [])
      .map((element) => ({ element, name: element.dataset.joint as JointName }));
  }, [state.phaseKey, state.characterAction, characterId]);

  useEffect(() => {
    const element = scene.current;
    const actor = wrapper.current;
    const sprite = body.current;
    if (!element || !actor || !sprite) return;
    const profile = motionProfile(characterId);
    const layers = Array.from(element.querySelectorAll<HTMLElement>('[data-layer]'));
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let width = element.clientWidth;
    let height = element.clientHeight;
    let actorWidth = actor.getBoundingClientRect().width;
    let progressWidth = track.current?.clientWidth ?? 0;

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
      const gait = locomotionTime(elapsed, next.totalDuration);
      const scale = actorWidth / 160;
      const distance = groundDistance(gait, profile.cycleMs) * scale;
      const x = width * .42;
      const groundY = height * .78;
      const reduced = preference.matches;
      const walking = pose.phase === 'WALK';
      const bob = walking && !reduced && profile.kind === 'animal' ? Math.sin(gait / profile.cycleMs * Math.PI * 4) * .55 : 0;

      actor.style.transform = `translate3d(${x}px, ${groundY}px, 0)`;
      actor.dataset.position = '.42';
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

      let jointPose = getCharacterPose(pose.characterAction, animationTime, profile.cycleMs, reduced, bob);
      if (pose.phase === 'SETTLE') {
        const last = getCharacterPose('walk', gait, profile.cycleMs, reduced);
        const blend = smoothstep(pose.actionElapsedMs / 350);
        for (const name of Object.keys(jointPose) as JointName[]) jointPose[name] = last[name] + (jointPose[name] - last[name]) * blend;
      }
      if (profile.kind === 'vehicle' && !reduced) {
        const angle = groundDistance(gait, profile.cycleMs) / 16 * 180 / Math.PI % 360;
        jointPose = { ...jointPose, 'wheel-front': angle, 'wheel-back': angle, 'wheel-middle': angle };
      }
      for (const joint of joints.current) joint.element.setAttribute('transform', `rotate(${jointPose[joint.name].toFixed(5)})`);
      for (const layer of layers) {
        const rate = Number(layer.dataset.rate);
        const offset = reduced ? 0 : loopOffset(distance * rate, TILE_WIDTH);
        layer.style.transform = `translate3d(${-offset}px, 0, 0)`;
        layer.dataset.scrollOffset = offset.toFixed(6);
      }
      const destination = finishApproach(pose.position, width, x, actorWidth);
      if (goal.current) {
        goal.current.style.transform = `translate3d(${destination.x}px, ${groundY}px, 0)`;
        goal.current.style.opacity = String(destination.opacity);
        goal.current.dataset.distance = Math.max(0, destination.x - destination.target).toFixed(6);
      }
      fill.current?.style.setProperty('transform', `scaleX(${pose.position})`);
      marker.current?.style.setProperty('transform', `translate3d(${pose.position * progressWidth}px, 0, 0)`);
      if (marker.current) marker.current.dataset.progress = pose.position.toFixed(6);
    };
    const resize = new ResizeObserver(() => {
      width = element.clientWidth; height = element.clientHeight;
      element.style.setProperty('--actor-limit', `${Math.min(168, (height * .78 - 20) * 160 / profile.groundY)}px`);
      actorWidth = actor.getBoundingClientRect().width;
      progressWidth = track.current?.clientWidth ?? 0;
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
  }, [input.isPaused, characterId]);
  return { scene, wrapper, body, goal, track, fill, marker };
}
