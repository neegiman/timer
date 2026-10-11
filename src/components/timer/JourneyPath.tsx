import type { CSSProperties, RefObject } from 'react';
import { motionProfile } from '@/lib/motionProfiles';
import { CharacterSprite } from './CharacterSprite';
import { ScrollingScenery } from './ScrollingScenery';
import { SeasonalAtmosphere } from './SeasonalAtmosphere';
import { PromiseIcon } from '../StoryIcon';
import type { Character, PromiseActivity } from '@/types/timer';
import type { AnimationInput, AnimationState } from '@/types/animation';
import type { SceneTheme } from '@/lib/dayNight';
import { SEASONS, type Season } from '@/lib/seasons';

export function JourneyPath({ character, promise, animation, input, theme, season, sceneRef, goalRef, wrapperRef, bodyRef }: {
  character: Character; promise: PromiseActivity; animation: AnimationState; input: AnimationInput; theme: SceneTheme; season: Season;
  sceneRef: RefObject<HTMLDivElement | null>; goalRef: RefObject<HTMLDivElement | null>;
  wrapperRef: RefObject<HTMLDivElement | null>; bodyRef: RefObject<HTMLDivElement | null>;
}) {
  const profile = motionProfile(character.id);
  const arrived = animation.messageStage === 'arrived';
  const celebration = animation.phase === 'LAND' || animation.phase === 'CELEBRATE';
  const space = character.id === 'rocket';
  const variables = { '--cycle': `${profile.cycleMs}ms`, '--foot-origin': `${profile.groundY / 210 * 100}%` } as CSSProperties;
  return <div ref={sceneRef} className={`journey-scene ${input.isPaused ? 'is-paused' : ''}`} data-phase={animation.phase} data-stage={animation.messageStage} data-theme={theme} data-season={season} data-environment={space ? 'space' : 'nature'}
    role="img" aria-label={`${SEASONS[season].name} ${theme === 'day' ? '낮' : '밤'} ${space ? '행성이 떠 있는 우주' : ''} 풍경에서 ${character.name}와 함께 ${promise.name}까지 여행해요`}>
    <ScrollingScenery season={season} space={space} />
    <SeasonalAtmosphere season={season} space={space} />
    {animation.position >= .9 ? <div ref={goalRef} className={`journey-goal ${arrived ? 'goal-arrived' : ''}`} data-testid="journey-goal" aria-hidden="true">
      <span className="goal-line" />
      <svg className="finish-flag" viewBox="0 0 36 48">
        <path d="M18 47V3" fill="none" stroke="#876f4d" strokeWidth="3" strokeLinecap="round" />
        <g className="flag-cloth" transform="translate(16 0)"><path d="M3 6C12 1 23 11 33 7L31 24C20 28 12 16 3 22Z" fill="#e87957" stroke="#bc6548" strokeWidth="1" /></g>
      </svg>
      <div className="finish-point"><PromiseIcon id={promise.id} size={32} className="destination-icon" /><span className="endpoint-label">도착</span></div>
    </div> : null}
    <div ref={wrapperRef} className="character-wrapper" style={variables} data-position=".42" data-profile={profile.kind}>
      <div className="character-anchor" data-testid="traveler" data-progress={animation.position}>
        <div ref={bodyRef} className="traveler-body sprite-motion" data-character={character.id} data-action={animation.characterAction} data-phase-key={animation.phaseKey}>
          <CharacterSprite character={character} />
        </div><span className="character-shadow" />
      </div>
    </div>
    {input.isPaused ? <span className="paused-sign">잠깐 쉬어요!</span> : null}
    {animation.messageStage === 'halfway' ? <span className="midpoint-sparkle" aria-hidden="true">✦</span> : null}
    {celebration ? <div className="arrival-sparkles" aria-hidden="true"><span>✦</span><span>⭐</span><span>✧</span><span>✦</span><span>⭐</span><span>✧</span><i /><i /><i /><i /><i /><i /></div> : null}
  </div>;
}
