import { Check, Star } from 'lucide-react';

export function StarReward({ awarded, count, onAward, onNewJourney }: { awarded: boolean; count: number; onAward: () => void; onNewJourney: () => void }) {
  return <div className="reward-panel">
    <div className="reward-medallion" aria-hidden="true">⭐</div><h2>기다림도, 약속도 참 잘했어요!</h2>
    <p>약속을 지켰다면 반짝이는 별 하나를 모아요.</p>
    <button className={`primary-button reward-button ${awarded ? 'awarded' : ''}`} disabled={awarded} onClick={onAward}>
      {awarded ? <Check size={20} /> : <Star size={20} />}{awarded ? '반짝! 별을 받았어요' : '⭐ 약속 지켰어요'}
    </button>
    <p className="today-reward">오늘 모은 별 <strong>{count}개</strong></p>
    <button className="text-button" onClick={onNewJourney}>새로운 약속 만들기 <span>→</span></button>
  </div>;
}
