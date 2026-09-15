import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = supabaseAdmin();
    if (!db) return NextResponse.json({ configured: false, projects: [] });
    const { data, error } = await db.from('card_projects').select('id,title,persona,topic,card_count,canvas_size,created_at,updated_at').order('updated_at', { ascending: false }).limit(30);
    if (error) throw error;
    return NextResponse.json({ configured: true, projects: data || [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : '기록을 불러오지 못했습니다.' }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const db = supabaseAdmin();
    if (!db) return NextResponse.json({ configured: false, message: 'Supabase 환경 변수가 없어 이 브라우저에만 저장됩니다.' });
    const project = await request.json();
    const { data, error } = await db.from('card_projects').upsert({
      id: project.id || undefined, title: project.title, persona: project.persona, topic: project.topic,
      card_count: project.cards?.length || 0, canvas_size: project.size,
      // Generated image data is intentionally excluded so records stay lightweight.
      cards: (project.cards || []).map(({ image, loading, ...card }: { image?: string; loading?: boolean; [key: string]: unknown }) => card),
      character_sheet: project.characterSheet ? 'created' : null
    }).select('id, updated_at').single();
    if (error) throw error;
    return NextResponse.json({ configured: true, project: data });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : '기록을 저장하지 못했습니다.' }, { status: 500 }); }
}
