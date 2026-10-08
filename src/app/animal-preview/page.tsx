import type { Metadata } from 'next';
import { AnimalMotionPreview } from '@/components/AnimalMotionPreview';

export const metadata: Metadata = {
  title: '동물처럼 움직여요 · 약속 여행 시안',
  alternates: { canonical: 'https://neegiman.github.io/timer/animal-preview/' },
};
export default function AnimalPreviewPage() { return <AnimalMotionPreview />; }
