import type { CSSProperties, RefObject } from 'react';
import { motionProfile } from '@/lib/motionProfiles';
import { CharacterSprite } from './CharacterSprite';
import { ScrollingScenery } from './ScrollingScenery';
import { SeasonalAtmosphere } from './SeasonalAtmosphere';
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
  const celebration = animation.phase === 'LAND' || animation.phase === 'CELEBRATE';
  const space = character.id === 'rocket';
  const variables = { '--cycle': `${profile.cycleMs}ms`, '--foot-origin': `${profile.groundY / 210 * 100}%` } as CSSProperties;
  return <div ref={sceneRef} className={`journey-scene ${input.isPaused ? 'is-paused' : ''}`} data-phase={animation.phase} data-stage={animation.messageStage} data-theme={space ? undefined : theme} data-season={space ? undefined : season} data-environment={space ? 'space' : 'nature'}
    role="img" aria-label={`${space ? '별과 행성이 떠 있는 8비트 우주' : `${SEASONS[season].name} ${theme === 'day' ? '낮' : '밤'} 풍경`}에서 ${character.name}와 함께 ${promise.name}까지 여행해요`}>
    <ScrollingScenery season={season} theme={theme} characterId={character.id} showDestination={animation.position >= .9} destinationRef={goalRef} />
    <SeasonalAtmosphere season={season} space={space} />
    <div ref={wrapperRef} className="character-wrapper" style={variables} data-position=".42" data-profile={profile.kind}>
      <div className="character-anchor" data-testid="traveler" data-progress={animation.position}>
        <div ref={bodyRef} className="traveler-body sprite-motion" data-character={character.id} data-action={animation.characterAction} data-phase-key={animation.phaseKey}>
          <CharacterSprite character={character} />
        </div><span className="character-shadow" />
      </div>
    </div>
    {input.isPaused && !input.isAdjusting ? <span className="paused-sign">잠깐 쉬어요!</span> : null}
    {animation.messageStage === 'halfway' ? <span className="midpoint-sparkle" aria-hidden="true">✦</span> : null}
    {celebration ? <div className="arrival-sparkles" aria-hidden="true"><span>✦</span><span>⭐</span><span>✧</span><span>✦</span><span>⭐</span><span>✧</span><i /><i /><i /><i /><i /><i /></div> : null}
  </div>;
}
