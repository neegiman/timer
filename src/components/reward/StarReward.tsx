import { StoryIcon } from '../StoryIcon';

export function StarReward({ awarded, count, onAward, onNewJourney }: { awarded: boolean; count: number; onAward: () => void; onNewJourney: () => void }) {
  return <div className="reward-panel">
    <button className={`primary-button reward-button ${awarded ? 'awarded' : ''}`} disabled={awarded} onClick={onAward}
      aria-label={awarded ? '⭐ 별을 받았어요!' : '⭐ 약속 지켰어요'}>
      <StoryIcon name="star" size={34} />{awarded ? '별을 받았어요!' : '약속 지켰어요'}
    </button>
    <p className="today-reward">{awarded ? `잘했어요! 오늘의 별 ${count}개` : '약속을 지키고 별을 받아요.'}</p>
    <button className="text-button" onClick={onNewJourney}>다시 하기 <span aria-hidden="true">↻</span></button>
  </div>;
}
