import Image from 'next/image';
import type { CSSProperties } from 'react';
import { assetPath } from '@/lib/assetPath';
import { journeyRoute } from '@/lib/journey';
import { motionProfile } from '@/lib/motionProfiles';
import { useJourneyRenderer } from '@/hooks/useJourneyRenderer';
import { CharacterSprite } from './CharacterSprite';
import type { Character, PromiseActivity } from '@/types/timer';
import type { AnimationInput, AnimationState } from '@/types/animation';

export function JourneyPath({ progress, character, promise, animation, input, sampledAt }: {
  progress: number; character: Character; promise: PromiseActivity; animation: AnimationState; input: AnimationInput; sampledAt: number;
}) {
  const { scene, wrapper, body, layout } = useJourneyRenderer(input, animation, sampledAt);
  const route = journeyRoute(layout);
  const halfway = route.point(.5);
  const profile = motionProfile(character.id);
  const celebration = animation.phase === 'CELEBRATE';
  const midpoint = animation.phaseKey === 'mid-jump';
  const finishVisible = ['LOOK_FINISH', 'RUN_START', 'RUN', 'COUNTDOWN', 'SPRINT', 'CROSS_FINISH', 'OVERSHOOT', 'BRAKE', 'TURN', 'JUMP', 'LAND', 'CELEBRATE'].includes(animation.phase);
  const variables = { '--cycle': `${profile.cycleMs / animation.speed}ms`, '--bounce': `${profile.bounce}px`, '--lean': `${profile.lean}deg` } as CSSProperties;
  const endpoints = { '--start-x': `${route.start.x / 8}%`, '--start-y': `${route.start.y / 6}%`, '--finish-x': `${route.finish.x / 8}%`, '--finish-y': `${route.finish.y / 6}%` } as CSSProperties;
  return <div ref={scene} className={`journey-scene ${input.isPaused ? 'is-paused' : ''}`} data-phase={animation.phase} data-background={animation.backgroundMode}
    style={endpoints} data-route-layout={layout}
    role="img" aria-label={`${character.name}, ${promise.name}까지 ${Math.round((1 - progress) * 100)}퍼센트 남았어요`}>
    <Image className="scene-backdrop" src={assetPath('/images/meadow.svg')} alt="" width={800} height={600} priority />
    <div className="parallax-layer cloud-layer" data-layer="cloud" aria-hidden="true"><svg className="cloud-drift" viewBox="0 0 800 600" preserveAspectRatio="none"><g fill="#fffdf5"><path d="M235 77c-27 0-30-32-5-39 5-28 49-30 60-3 32-14 51 11 35 32 24 0 28 23 3 23h-93Z" /><path d="M556 48c-21 0-23-23-6-28 5-20 32-20 41-3 25-8 41 10 31 23 17 0 19 16 0 16h-62Z" /></g></svg></div>
    <div className="parallax-layer tree-layer" data-layer="tree" aria-hidden="true"><svg viewBox="0 0 800 600" preserveAspectRatio="none"><g fill="#97ba7d"><circle cx="48" cy="278" r="31" /><circle cx="40" cy="247" r="27" /><circle cx="752" cy="377" r="37" /><circle cx="751" cy="343" r="30" /></g><g stroke="#839e68" strokeWidth="6" strokeLinecap="round"><path d="M46 282v40M750 384v43" /></g></svg></div>
    <svg className="route-svg" viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true">
      <ellipse cx={route.finish.x + route.distance * .045} cy={route.finish.y} rx={route.distance * .06 + 22} ry="33" fill="#e8edcd" stroke="#b9c899" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <path className="route-shadow" d={route.path} transform="translate(0 5)" />
      <path className="route-verge" d={route.path} />
      <path className="route-edge" d={route.path} />
      <path className="route-surface" data-route-path d={route.path} />
      <path className="route-traveled" data-traveled d={route.path} pathLength="1" opacity={animation.position > .00001 ? 1 : 0} strokeDasharray={`${Math.max(.00001, Math.min(1, animation.position))} 1`} />
      {route.stones.map((stone) => <ellipse key={stone.position} className="route-stone" data-stone-position={stone.position} data-walked={stone.position <= animation.position}
        cx={stone.x} cy={stone.y} rx="8" ry="5" transform={`rotate(${stone.angle} ${stone.x} ${stone.y})`} vectorEffect="non-scaling-stroke" />)}
      <ellipse cx={route.start.x} cy={route.start.y} rx="20" ry="13" fill="#fff8e6" stroke="#cfb98d" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
    <div className="parallax-layer grass-layer" data-layer="grass" aria-hidden="true"><svg viewBox="0 0 800 600" preserveAspectRatio="none"><g stroke="#9abc7c" strokeWidth="4" strokeLinecap="round" fill="none"><path d="m85 530 4-14 5 14m605-30 5-14 5 14m-296 44 5-14 5 14" /></g><g fill="#fff7d4"><circle cx="143" cy="362" r="7" /><circle cx="631" cy="463" r="7" /><circle cx="405" cy="530" r="6" /></g></svg></div>
    <span className="route-finish-line" aria-hidden="true" />
    <svg className="finish-flag" viewBox="0 0 36 48" aria-hidden="true">
      <path d="M2 47V3" fill="none" stroke="#876f4d" strokeWidth="3" strokeLinecap="round" />
      <g className={`flag-cloth ${finishVisible ? 'flag-wave' : ''}`}>
        <path d="M3 6C12 1 23 11 33 7L31 24C20 28 12 16 3 22Z" fill="#e87957" stroke="#bc6548" strokeWidth="1" strokeLinejoin="round" />
      </g>
    </svg>
    <div className="start-point"><span className="house" aria-hidden="true">🏡</span><span className="endpoint-label">출발</span></div>
    <div className={`finish-point ${finishVisible ? 'finish-recognized' : ''}`}><span className="destination-icon" aria-hidden="true">{promise.icon}</span><span className="endpoint-label">도착</span></div>
    <div ref={wrapper} className="character-wrapper" style={variables} data-position={animation.position} data-profile={profile.kind}>
      <div className="character-anchor" data-testid="traveler" data-progress={progress}>
        <div ref={body} key={`${animation.phaseKey}:${animation.characterAction}`} className="traveler-body sprite-motion" data-action={animation.characterAction} data-phase-key={animation.phaseKey}>
          <CharacterSprite character={character} />
        </div><span className="character-shadow" />
      </div>
    </div>
    {animation.phase === 'BRAKE' ? <div className="brake-dust" aria-hidden="true"><i /><i /><i /></div> : null}
    {midpoint ? <div className="midpoint-sparkle" style={{ left: `${halfway.x / 8}%`, top: `${halfway.y / 6}%` }} aria-hidden="true">✦</div> : null}
    {celebration ? <div className="arrival-sparkles" aria-hidden="true"><span>✦</span><span>⭐</span><span>✧</span><span>✦</span><span>⭐</span><span>✧</span></div> : null}
  </div>;
}
