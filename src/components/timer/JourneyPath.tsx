import Image from 'next/image';
import type { CSSProperties } from 'react';
import { assetPath } from '@/lib/assetPath';
import { JOURNEY_PATH } from '@/lib/journey';
import { motionProfile } from '@/lib/motionProfiles';
import { useJourneyRenderer } from '@/hooks/useJourneyRenderer';
import { CharacterSprite } from './CharacterSprite';
import type { Character, PromiseActivity } from '@/types/timer';
import type { AnimationInput, AnimationState } from '@/types/animation';

export function JourneyPath({ progress, character, promise, animation, input, sampledAt }: {
  progress: number; character: Character; promise: PromiseActivity; animation: AnimationState; input: AnimationInput; sampledAt: number;
}) {
  const { scene, wrapper, body } = useJourneyRenderer(input, animation, sampledAt);
  const profile = motionProfile(character.id);
  const celebration = animation.phase === 'CELEBRATE';
  const midpoint = animation.phaseKey === 'mid-jump';
  const finishVisible = ['LOOK_FINISH', 'RUN_START', 'RUN', 'COUNTDOWN', 'SPRINT', 'CROSS_FINISH', 'OVERSHOOT', 'BRAKE', 'TURN', 'JUMP', 'LAND', 'CELEBRATE'].includes(animation.phase);
  const variables = { '--cycle': `${profile.cycleMs / animation.speed}ms`, '--bounce': `${profile.bounce}px`, '--lean': `${profile.lean}deg` } as CSSProperties;
  return <div ref={scene} className={`journey-scene ${input.isPaused ? 'is-paused' : ''}`} data-phase={animation.phase} data-background={animation.backgroundMode}
    role="img" aria-label={`${character.name}, ${promise.name}까지 ${Math.round((1 - progress) * 100)}퍼센트 남았어요`}>
    <Image className="scene-backdrop" src={assetPath('/images/meadow.svg')} alt="" width={800} height={600} priority />
    <div className="parallax-layer cloud-layer" data-layer="cloud" aria-hidden="true"><svg className="cloud-drift" viewBox="0 0 800 600" preserveAspectRatio="none"><g fill="#fffdf5"><path d="M235 77c-27 0-30-32-5-39 5-28 49-30 60-3 32-14 51 11 35 32 24 0 28 23 3 23h-93Z" /><path d="M556 48c-21 0-23-23-6-28 5-20 32-20 41-3 25-8 41 10 31 23 17 0 19 16 0 16h-62Z" /></g></svg></div>
    <div className="parallax-layer tree-layer" data-layer="tree" aria-hidden="true"><svg viewBox="0 0 800 600" preserveAspectRatio="none"><g fill="#97ba7d"><circle cx="48" cy="278" r="31" /><circle cx="40" cy="247" r="27" /><circle cx="752" cy="377" r="37" /><circle cx="751" cy="343" r="30" /></g><g stroke="#839e68" strokeWidth="6" strokeLinecap="round"><path d="M46 282v40M750 384v43" /></g></svg></div>
    <svg className="route-svg" viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true">
      <path d={JOURNEY_PATH} fill="none" stroke="#b4cc9c" strokeWidth="40" strokeLinecap="round" vectorEffect="non-scaling-stroke" transform="translate(0 4)" />
      <path d={JOURNEY_PATH} fill="none" stroke="#fff3d6" strokeWidth="36" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d={JOURNEY_PATH} fill="none" stroke="#d4b885" strokeWidth="3" strokeDasharray="3 15" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path data-traveled d={JOURNEY_PATH} fill="none" stroke="#e8b65f" strokeWidth="36" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength="1" strokeDasharray={`${Math.max(.00001, Math.min(1, animation.position))} 1`} />
    </svg>
    <div className="parallax-layer grass-layer" data-layer="grass" aria-hidden="true"><svg viewBox="0 0 800 600" preserveAspectRatio="none"><g stroke="#9abc7c" strokeWidth="4" strokeLinecap="round" fill="none"><path d="m85 530 4-14 5 14m605-30 5-14 5 14m-296 44 5-14 5 14" /></g><g fill="#fff7d4"><circle cx="143" cy="362" r="7" /><circle cx="631" cy="463" r="7" /><circle cx="405" cy="530" r="6" /></g></svg></div>
    <div className="start-point"><span className="house" aria-hidden="true">🏡</span><span className="endpoint-label">출발</span></div>
    <div className={`finish-point ${finishVisible ? 'finish-recognized' : ''}`}><span className={`finish-flag ${finishVisible ? 'flag-wave' : ''}`} aria-hidden="true">🚩</span><span className="destination-icon" aria-hidden="true">{promise.icon}</span><span className="endpoint-label">도착</span></div>
    <div ref={wrapper} className="character-wrapper" style={variables} data-position={animation.position} data-profile={profile.kind}>
      <div className="character-anchor" data-testid="traveler" data-progress={progress}>
        <div ref={body} key={`${animation.phaseKey}:${animation.characterAction}`} className="traveler-body sprite-motion" data-action={animation.characterAction} data-phase-key={animation.phaseKey}>
          <CharacterSprite character={character} />
        </div><span className="character-shadow" />
      </div>
    </div>
    {animation.phase === 'BRAKE' ? <div className="brake-dust" aria-hidden="true"><i /><i /><i /></div> : null}
    {midpoint ? <div className="midpoint-sparkle" aria-hidden="true">✦</div> : null}
    {celebration ? <div className="arrival-sparkles" aria-hidden="true"><span>✦</span><span>⭐</span><span>✧</span><span>✦</span><span>⭐</span><span>✧</span></div> : null}
  </div>;
}
