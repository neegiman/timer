import { StoryIcon } from '../StoryIcon';
import type { TimerMode } from '@/types/timer';

export function StarReward({ awarded, count, total, mode, goal, filled, onAward, onNewJourney, onViewRewards }: {
  awarded: boolean; count: number; total: number; mode: TimerMode; goal: number; filled: number;
  onAward: () => void; onNewJourney: () => void; onViewRewards: () => void;
}) {
  return <div className="reward-panel">
    <button className={`primary-button reward-button ${awarded ? 'awarded' : ''}`} disabled={awarded} onClick={onAward}
      aria-label={awarded ? '⭐ 별을 받았어요!' : '⭐ 약속 지켰어요'}>
      <StoryIcon name="star" size={34} />{awarded ? '별을 받았어요!' : '약속 지켰어요'}
    </button>
    <p className="today-reward">{awarded ? `잘했어요! 오늘 ${count}개 · 모은 별 ${total}개` : mode === 'after' ? '약속한 활동을 시작한 뒤 별을 받아요.' : '약속한 활동을 마무리한 뒤 별을 받아요.'}</p>
    {awarded ? <button className={`reward-collection-link ${filled === goal ? 'goal-reached' : ''}`} onClick={onViewRewards}><StoryIcon name="star" size={26} />{filled === goal ? '별판을 다 채웠어요!' : `별 모으기 ${filled} / ${goal}`}<span>달력 보기</span></button> : null}
    <button className="text-button" onClick={onNewJourney}>다시 하기 <span aria-hidden="true">↻</span></button>
  </div>;
}
