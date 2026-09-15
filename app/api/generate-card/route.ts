import { NextResponse } from 'next/server';
import { createImage } from '@/lib/openai';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { prompt, size, characterSheet, persona } = await request.json();
    if (!prompt) return NextResponse.json({ error: '이미지 설명이 필요합니다.' }, { status: 400 });
    const dimensions: Record<string, string> = { square: '1024x1024', portrait: '1024x1536', landscape: '1536x1024' };
    const consistent = characterSheet ? 'The attached character sheet is the canonical reference: retain the exact same person, facial features, hairstyle, outfit, palette and illustration style in this scene.' : '';
    const image = await createImage(`Create a premium Korean social-media card background image. Brand direction: ${persona || 'modern and warm'}. Scene: ${prompt}. ${consistent} Leave a clean high-contrast text-safe area across the upper third and lower left. No text, no Korean, no letters, no numbers, no typography, no logo, no watermark. Editorial art direction, strong composition.`, dimensions[size] || dimensions.portrait, characterSheet);
    return NextResponse.json({ image });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '이미지 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
