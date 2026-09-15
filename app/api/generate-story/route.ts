import { NextResponse } from 'next/server';
import { createJson } from '@/lib/openai';

export const runtime = 'nodejs';

type Story = { title: string; cards: { title: string; body: string; imagePrompt: string }[] };

export async function POST(request: Request) {
  try {
    const { persona, topic, count } = await request.json();
    if (!persona?.trim() || !topic?.trim()) return NextResponse.json({ error: '브랜드 페르소나와 주제를 모두 입력해 주세요.' }, { status: 400 });
    const story = await createJson<Story>(`Create a Korean ${count}-card social card-news story. Brand persona: ${persona}. Topic: ${topic}.
Return exactly this JSON shape: {"title":"overall short title","cards":[{"title":"short Korean title, max 22 chars","body":"helpful Korean body, 2 concise sentences, max 105 chars","imagePrompt":"detailed ENGLISH prompt for a vertical editorial illustration with NO text, NO letters, NO numbers, no logo"}]}. The first card must hook, middle cards explain, last card has an actionable close. Never include text that should appear in artwork.`);
    if (!Array.isArray(story.cards)) throw new Error('카드 구성이 올바르지 않습니다.');
    return NextResponse.json({ ...story, cards: story.cards.slice(0, Math.max(2, Math.min(10, Number(count) || 5))) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '카피 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
