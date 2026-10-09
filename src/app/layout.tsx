import type { Metadata, Viewport } from 'next';
import { assetPath, PRODUCTION_URL } from '@/lib/assetPath';
import './globals.css';

export const metadata: Metadata = {
  title: '약속 여행 — 작은 기다림, 즐거운 약속',
  description: '숫자 대신 친구의 여행으로 시간을 느끼는, 우리 아이의 다정한 비주얼 타이머.',
  metadataBase: new URL(PRODUCTION_URL),
  alternates: { canonical: PRODUCTION_URL },
  icons: {
    icon: [
      { url: assetPath('/images/favicon-handshake-v1.png'), sizes: '48x48', type: 'image/png' },
      { url: assetPath('/images/promise-handshake-v1.png'), sizes: '192x192', type: 'image/png' },
    ],
    apple: { url: assetPath('/images/apple-touch-handshake-v1.png'), sizes: '180x180', type: 'image/png' },
  },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#faf8f2' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
