import { NextResponse } from 'next/server';
import { createImage } from '@/lib/openai';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { reference, persona } = await request.json();
    if (!reference) return NextResponse.json({ error: '참조 사진을 업로드해 주세요.' }, { status: 400 });
    const prompt = `Use the supplied person/character only as identity reference. Create a polished character design sheet with one main full-body three-quarter pose and 3 small expression details on a clean warm studio background. Preserve recognisable face, hairstyle and identity, choose one stylish consistent outfit fitting this brand persona: ${persona || 'friendly modern Korean creator'}. Cohesive premium digital editorial illustration, no written words, no letters, no numbers, no logos, no watermark. This sheet will be the canonical reference for a consistent social-media illustration series.`;
    const image = await createImage(prompt, '1024x1024', reference);
    return NextResponse.json({ image });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '캐릭터 시트를 만들지 못했습니다.' }, { status: 500 });
  }
}
