import Link from 'next/link';

export default function NotFound() {
  return <main className="not-found"><span aria-hidden="true">🐰</span><h1>여행길을 다시 찾아볼까요?</h1><p>약속 여행의 출발점으로 돌아가요.</p><Link href="/" className="primary-button">출발점으로 →</Link></main>;
}
