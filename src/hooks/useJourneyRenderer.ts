import { useEffect, useRef, useState } from 'react';
import { getAnimationState } from '@/lib/animation';
import { journeyLayout, journeyPoint, journeyRoute, type JourneyLayout } from '@/lib/journey';
import { getCharacterPose, type JointName } from '@/lib/characterPose';
import type { AnimationInput, AnimationState } from '@/types/animation';

/** Frame-level pose/position updates live in DOM refs, never in React state. */
export function useJourneyRenderer(input: AnimationInput, state: AnimationState, sampledAt: number) {
  const scene = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const snapshot = useRef({ input, sampledAt });
  const animations = useRef<Animation[]>([]);
  const joints = useRef<{ element: SVGGElement; name: JointName }[]>([]);
  const cycleMs = useRef(780);
  const [layout, setLayout] = useState<JourneyLayout>('standard');
  const currentLayout = useRef<JourneyLayout>('standard');

  useEffect(() => { snapshot.current = { input, sampledAt }; }, [input, sampledAt]);
  useEffect(() => {
    animations.current = body.current?.getAnimations({ subtree: true }) ?? [];
    for (const animation of animations.current) animation.pause();
    joints.current = Array.from(body.current?.querySelectorAll<SVGGElement>('[data-joint]') ?? [])
      .map((element) => ({ element, name: element.dataset.joint as JointName }));
    cycleMs.current = Number.parseFloat(body.current ? getComputedStyle(body.current).getPropertyValue('--cycle') : '780') || 780;
  }, [state.phaseKey, state.characterAction]);

  useEffect(() => {
    const element = scene.current;
    const actor = wrapper.current;
    if (!element || !actor) return;
    let frame = 0;
    let width = element.clientWidth;
    let height = element.clientHeight;
    let actorWidth = actor.offsetWidth;
    let actorHeight = actor.offsetHeight;
    const layers = Array.from(element.querySelectorAll<HTMLElement>('[data-layer]'));
    const traveled = element.querySelector<SVGPathElement>('[data-traveled]');
    const stones = Array.from(element.querySelectorAll<SVGElement>('[data-stone-position]'));
    const shadow = element.querySelector<HTMLElement>('.character-shadow');
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const resize = new ResizeObserver(() => {
      width = element.clientWidth; height = element.clientHeight;
      const nextLayout = journeyLayout(width, height);
      currentLayout.current = nextLayout;
      setLayout((previous) => previous === nextLayout ? previous : nextLayout);
      // Reserve headroom for the jump at the ACTUAL finish coordinate, even in a short fullscreen view.
      const finishY = journeyRoute(nextLayout).finish.y / 600 * height;
      element.style.setProperty('--actor-limit', `${Math.max(58, (finishY - 24) * 160 / (210 * .94)).toFixed(1)}px`);
      actorWidth = actor.offsetWidth; actorHeight = actor.offsetHeight;
      draw();
    });
    resize.observe(element);
    resize.observe(actor);

    const draw = () => {
      const sample = snapshot.current;
      const delta = sample.sampledAt > 0 ? Math.max(0, Date.now() - sample.sampledAt) : 0;
      const frozen = sample.input.isPaused;
      const nextInput = { ...sample.input,
        remainingTime: frozen || sample.input.isFinished ? sample.input.remainingTime : Math.max(0, sample.input.remainingTime - delta),
        finishElapsedMs: sample.input.finishElapsedMs + (sample.input.isFinished && !frozen ? delta : 0),
      };
      const pose = getAnimationState(nextInput);
      const point = journeyPoint(pose.position, currentLayout.current);
      // Reserve actual sprite width and overshoot space, including narrow/landscape screens.
      const x = Math.min(width - actorWidth / 2 - 8, Math.max(actorWidth / 2 + 8, point.x / 800 * width));
      const y = Math.min(height - 16, Math.max(actorHeight * .94 + 12, point.y / 600 * height));
      actor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      actor.dataset.position = pose.position.toFixed(6);
      actor.style.setProperty('--jump-height', `${Math.max(3, Math.min(30, y - actorHeight * .94 - 10))}px`);
      traveled?.setAttribute('stroke-dasharray', `${Math.max(.00001, Math.min(1, pose.position))} 1`);
      traveled?.setAttribute('opacity', pose.position > .00001 ? '1' : '0');
      for (const stone of stones) {
        const walked = String(Number(stone.dataset.stonePosition) <= pose.position);
        if (stone.dataset.walked !== walked) stone.dataset.walked = walked;
      }
      const fast = pose.backgroundMode === 'fast';
      const focused = pose.phase === 'COUNTDOWN' || pose.phase === 'SPRINT';
      const rates = [fast ? .10 : .05, fast ? .30 : .20, fast ? .60 : .40];
      layers.forEach((layer, index) => {
        // Freeze the camera at the final-ten-second anchor instead of resetting its offset.
        const position = focused ? .96 : Math.min(1, pose.position);
        const rate = focused ? [.05, .20, .40][index] : rates[index];
        layer.style.transform = `translate3d(${-position * width * .12 * rate}px, 0, 0)`;
        layer.dataset.parallaxRate = String(focused ? 0 : rate);
      });
      for (const animation of animations.current) animation.currentTime = pose.actionElapsedMs;
      const jointPose = getCharacterPose(pose.characterAction, pose.actionElapsedMs, cycleMs.current, motionPreference.matches);
      for (const joint of joints.current) joint.element.setAttribute('transform', `rotate(${jointPose[joint.name].toFixed(3)})`);
      if (shadow) {
        const airborne = pose.characterAction === 'jump' || pose.characterAction === 'hop';
        const duration = pose.characterAction === 'jump' ? 600 : 800;
        const heightRatio = airborne ? Math.sin(Math.PI * Math.min(1, pose.actionElapsedMs / duration)) : 0;
        shadow.style.transform = `scale(${1 - Math.max(0, heightRatio) * .35})`;
        shadow.style.opacity = String(.8 - Math.max(0, heightRatio) * .25);
      }
    };
    const loop = () => { draw(); if (!snapshot.current.input.isPaused) frame = requestAnimationFrame(loop); };
    const visibility = () => {
      cancelAnimationFrame(frame);
      element.dataset.suspended = String(document.hidden);
      if (!document.hidden) loop();
    };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    motionPreference.addEventListener('change', draw);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); document.removeEventListener('visibilitychange', visibility); motionPreference.removeEventListener('change', draw); };
  }, [input.isPaused, layout]);
  return { scene, wrapper, body, layout };
}
