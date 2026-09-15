import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Card Atelier | 브랜드 카드뉴스 스튜디오',
  description: '브랜드 페르소나로 완성하는 AI 카드뉴스 제작 도구'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
