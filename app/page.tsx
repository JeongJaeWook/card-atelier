'use client';

import { ChangeEvent, useMemo, useState } from 'react';

type Size = 'square' | 'portrait' | 'landscape';
type Card = { id: string; title: string; body: string; imagePrompt: string; image?: string; accent: string; loading?: boolean };
const accents = ['#F26A3D', '#EFC258', '#9CE2D9', '#AABCF1', '#E8A6BB'];
const dimensions: Record<Size, [number, number]> = { square: [1080, 1080], portrait: [1080, 1620], landscape: [1620, 1080] };

async function api<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '요청을 처리하지 못했습니다.');
  return data as T;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(''); const lines: string[] = []; let line = '';
  words.forEach((word) => { const test = line + word; if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test; });
  if (line) lines.push(line); return lines;
}

export default function Home() {
  const [persona, setPersona] = useState('따뜻하지만 똑부러지는 1인 브랜드 코치. 실용적인 조언을 쉽고 친근하게 전달합니다.');
  const [topic, setTopic] = useState('초보 프리랜서가 첫 달에 반드시 세팅해야 할 5가지');
  const [count, setCount] = useState(5);
  const [size, setSize] = useState<Size>('portrait');
  const [useCharacter, setUseCharacter] = useState(false);
  const [sourcePhoto, setSourcePhoto] = useState<string>();
  const [characterSheet, setCharacterSheet] = useState<string>();
  const [cards, setCards] = useState<Card[]>([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectId, setProjectId] = useState<string>();
  const [busy, setBusy] = useState<'all' | 'character' | string>();
  const [message, setMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const ratioLabel = useMemo(() => ({ square: '1:1 정사각형', portrait: '2:3 세로형', landscape: '3:2 가로형' }[size]), [size]);
  const notify = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(''), 3400); };
  const updateCard = (id: string, patch: Partial<Card>) => setCards((all) => all.map((card) => card.id === id ? { ...card, ...patch } : card));

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 8 * 1024 * 1024) { notify('8MB 이하의 사진을 올려 주세요.'); return; }
    const reader = new FileReader(); reader.onload = () => { setSourcePhoto(reader.result as string); setCharacterSheet(undefined); }; reader.readAsDataURL(file);
  };

  const createCharacter = async () => {
    if (!sourcePhoto) { notify('먼저 사진 또는 캐릭터 파일을 업로드해 주세요.'); return; }
    setBusy('character');
    try { const data = await api<{ image: string }>('/api/generate-character', { reference: sourcePhoto, persona }); setCharacterSheet(data.image); notify('일관된 카드 제작용 캐릭터 시트가 완성됐어요.'); }
    catch (error) { notify(error instanceof Error ? error.message : '캐릭터 시트를 만들지 못했습니다.'); }
    finally { setBusy(undefined); }
  };

  const makeCardImage = async (card: Card, sheet = characterSheet) => {
    updateCard(card.id, { loading: true }); setBusy(card.id);
    try {
      const data = await api<{ image: string }>('/api/generate-card', { prompt: card.imagePrompt, size, characterSheet: useCharacter ? sheet : undefined, persona });
      updateCard(card.id, { image: data.image, loading: false });
      return data.image;
    } catch (error) { updateCard(card.id, { loading: false }); notify(error instanceof Error ? error.message : '이미지 생성 중 오류가 발생했습니다.'); }
    finally { setBusy(undefined); }
  };

  const generateAll = async () => {
    if (!persona.trim() || !topic.trim()) { notify('브랜드 페르소나와 주제를 입력해 주세요.'); return; }
    if (useCharacter && !sourcePhoto) { notify('캐릭터 사용을 선택했다면 사진을 업로드해 주세요.'); return; }
    setBusy('all'); setCards([]); setProjectId(undefined);
    try {
      let sheet = characterSheet;
      if (useCharacter && !sheet) {
        const result = await api<{ image: string }>('/api/generate-character', { reference: sourcePhoto, persona }); sheet = result.image; setCharacterSheet(sheet);
      }
      const story = await api<{ title: string; cards: Omit<Card, 'id' | 'accent'>[] }>('/api/generate-story', { persona, topic, count });
      setProjectTitle(story.title);
      const draft = story.cards.map((card, index) => ({ ...card, id: crypto.randomUUID(), accent: accents[index % accents.length] }));
      setCards(draft);
      for (const card of draft) await makeCardImage(card, sheet);
      notify('카드뉴스 초안이 완성됐어요. 문구와 디자인을 다듬어 보세요.');
    } catch (error) { notify(error instanceof Error ? error.message : '카드뉴스 생성 중 오류가 발생했습니다.'); }
    finally { setBusy(undefined); }
  };

  const moveCard = (index: number, direction: -1 | 1) => {
    const next = [...cards]; const target = index + direction; if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]]; setCards(next);
  };

  const exportCard = async (card: Card, index: number) => {
    const [width, height] = dimensions[size]; const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#163e3e'; ctx.fillRect(0, 0, width, height);
    if (card.image) {
      const img = new Image(); img.src = card.image; await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(); });
      const scale = Math.max(width / img.width, height / img.height); const iw = img.width * scale; const ih = img.height * scale;
      ctx.drawImage(img, (width - iw) / 2, (height - ih) / 2, iw, ih);
    }
    const shade = ctx.createLinearGradient(0, 0, 0, height); shade.addColorStop(0, 'rgba(4,17,16,.66)'); shade.addColorStop(.47, 'rgba(4,17,16,0)'); shade.addColorStop(1, 'rgba(4,17,16,.78)'); ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height);
    const pad = Math.round(width * .085); ctx.fillStyle = card.accent; ctx.fillRect(pad, Math.round(height * .075), Math.round(width * .13), 13);
    ctx.fillStyle = 'white'; ctx.font = `600 ${Math.round(width * .027)}px Manrope, sans-serif`; ctx.fillText(`${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`, pad, Math.round(height * .065));
    ctx.font = `800 ${Math.round(width * .077)}px 'Noto Sans KR', sans-serif`; const titleLines = wrapText(ctx, card.title, width - pad * 2); let y = Math.round(height * .68); titleLines.slice(0, 3).forEach((line) => { ctx.fillText(line, pad, y); y += Math.round(width * .103); });
    ctx.font = `500 ${Math.round(width * .032)}px 'Noto Sans KR', sans-serif`; const bodyLines = wrapText(ctx, card.body, width - pad * 2); y += Math.round(width * .012); bodyLines.slice(0, 4).forEach((line) => { ctx.fillText(line, pad, y); y += Math.round(width * .05); });
    const link = document.createElement('a'); link.download = `card-atelier-${String(index + 1).padStart(2, '0')}.png`; link.href = canvas.toDataURL('image/png'); link.click();
  };

  const saveProject = async () => {
    if (!cards.length) return;
    setSaveStatus('저장 중');
    try {
      const data = await api<{ configured: boolean; project?: { id: string }; message?: string }>('/api/projects', { id: projectId, title: projectTitle || topic, persona, topic, size, cards, characterSheet });
      if (!data.configured) { setSaveStatus('Supabase 연결 필요'); notify(data.message || 'Supabase 환경 변수를 연결해 주세요.'); return; }
      setProjectId(data.project?.id || projectId); setSaveStatus('Supabase에 저장됨'); notify('생성 기록을 Supabase에 저장했습니다.');
    } catch (error) { setSaveStatus('저장 실패'); notify(error instanceof Error ? error.message : '저장하지 못했습니다.'); }
  };

  return <>
    <header className="hero"><nav className="nav"><div className="brand"><span className="brand-mark">C</span>Card Atelier</div><div className="nav-right"><span className="status"/> AI CREATIVE STUDIO</div></nav><div className="hero-copy"><div className="kicker">brand story, beautifully sequenced</div><h1>당신의 브랜드를<br/>넘기는 이야기로.</h1><p>글은 정확하게, 이미지는 일관되게. 한 장씩 다듬어 완성하는 카드뉴스 스튜디오.</p></div></header>
    <main className="workspace">
      <aside className="controls panel">
        <section className="section"><div className="section-title"><span className="number">01</span>브랜드의 목소리</div><label>브랜드 페르소나</label><textarea className="textarea" value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="말투, 대상, 분위기를 적어 주세요"/><label>카드뉴스 주제</label><textarea className="textarea" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 첫 고객을 만드는 콘텐츠 전략"/></section>
        <section className="section"><div className="section-title"><span className="number">02</span>포맷 설정</div><label>카드 수</label><div className="pill-grid">{[3,5,7].map((value) => <button key={value} className={`pill ${count === value ? 'active' : ''}`} onClick={() => setCount(value)}>{value}장</button>)}</div><label>이미지 크기</label><div className="pill-grid">{(['square','portrait','landscape'] as Size[]).map((value) => <button key={value} className={`pill ${size === value ? 'active' : ''}`} onClick={() => setSize(value)}>{value === 'square' ? '정사각형' : value === 'portrait' ? '세로형' : '가로형'}</button>)}</div><p className="hint">선택됨: {ratioLabel}. PNG로 원본 크기 다운로드됩니다.</p></section>
        <section className="section"><div className="section-title"><span className="number">03</span>나만의 캐릭터 <span style={{fontWeight:500,color:'#7b8986'}}>선택</span></div><div className="switch-row"><div><strong style={{fontSize:12}}>내 사진/캐릭터 사용</strong><p className="hint">먼저 캐릭터 시트를 만들고 모든 장면에 참조합니다.</p></div><button aria-label="캐릭터 사용 토글" className={`toggle ${useCharacter ? 'active' : ''}`} onClick={() => setUseCharacter(!useCharacter)}/></div>{useCharacter && <><div className="upload-box" style={{marginTop:13}}><input id="photo" type="file" accept="image/*" onChange={chooseFile}/><label htmlFor="photo">사진 또는 캐릭터 업로드<br/><span style={{fontWeight:500,color:'#87938f'}}>PNG, JPG · 최대 8MB</span></label></div>{sourcePhoto && <img className="thumb" src={sourcePhoto} alt="업로드한 참조"/>}<button className="secondary" style={{width:'100%',marginTop:9}} onClick={createCharacter} disabled={busy === 'character'}>{busy === 'character' && <span className="loader"/>}{characterSheet ? '캐릭터 시트 다시 만들기' : '캐릭터 시트 만들기'}</button>{characterSheet && <img className="thumb" src={characterSheet} alt="AI 캐릭터 시트"/>}</>}</section>
        <button className="primary" onClick={generateAll} disabled={!!busy}>{busy === 'all' && <><span className="loader"/>제작 중...</>}{busy !== 'all' && '카드뉴스 만들기 →'}</button>
      </aside>
      <section className="stage"><div className="stage-head"><div><h2>{cards.length ? '편집 보드' : '카드뉴스 스튜디오'}</h2><p>{cards.length ? '제목, 본문, 이미지 설명과 순서를 바로 편집할 수 있어요.' : '왼쪽에 브랜드와 주제를 입력하면 카드뉴스 초안이 여기에 펼쳐집니다.'}</p></div>{saveStatus && <div className="save-status">{saveStatus}</div>}</div>
      {!cards.length ? <div className="panel blank"><div><div className="blank-icon">▧</div><h3>한 장의 콘텐츠가, 한 편의 이야기로.</h3><p>브랜드의 말투와 주제를 설정하고 카드 수를 고르세요. 텍스트 없이 생성한 이미지 위에 정확한 한글을 합성합니다.</p></div></div> : <><div className="result-tools"><div className="project-name">{projectTitle || topic}</div><div className="tool-actions"><button className="small-button" onClick={saveProject}>생성 기록 저장</button><button className="small-button" onClick={async () => { for (let i=0;i<cards.length;i++) { await exportCard(cards[i], i); } }}>전체 PNG 다운로드</button></div></div><div className="card-grid">{cards.map((card,index) => <article className="card-editor panel" key={card.id}><div className={`card-image ${size}`}>{card.image ? <img src={card.image} alt={`${index+1}번 카드 이미지`}/> : <div className="fallback-art">{card.loading ? <span className="loader"/> : '✦'}</div>}<div className="card-overlay"><div><div className="accent" style={{background:card.accent}}/><span className="index">{String(index+1).padStart(2,'0')} / {String(cards.length).padStart(2,'0')}</span></div><div><h3>{card.title}</h3><p>{card.body}</p></div></div></div><div className="card-meta"><div className="card-head"><span className="drag">CARD {String(index+1).padStart(2,'0')}</span><div className="row-actions"><button className="small-button" onClick={() => moveCard(index,-1)}>↑</button><button className="small-button" onClick={() => moveCard(index,1)}>↓</button><button className="small-button danger" onClick={() => setCards((all) => all.filter((item)=>item.id !== card.id))}>삭제</button></div></div><input value={card.title} onChange={(e)=>updateCard(card.id,{title:e.target.value})} aria-label="카드 제목"/><textarea value={card.body} onChange={(e)=>updateCard(card.id,{body:e.target.value})} aria-label="카드 본문"/><div className="prompt-row"><textarea value={card.imagePrompt} onChange={(e)=>updateCard(card.id,{imagePrompt:e.target.value})} aria-label="이미지 프롬프트"/><button className="small-button regenerate" onClick={()=>makeCardImage(card)} disabled={!!busy}>재생성</button></div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:5}}><input type="color" value={card.accent} onChange={(e)=>updateCard(card.id,{accent:e.target.value})} aria-label="강조색" style={{width:28,height:22,padding:1,border:0,background:'transparent'}}/><button className="small-button" onClick={()=>exportCard(card,index)}>PNG 저장</button></div></div></article>)}</div><p className="empty-note">이미지에는 글자를 생성하지 않습니다. 모든 한글은 여기에서 정확히 합성되어 PNG로 저장됩니다.</p></>}</section>
    </main>{message && <div className="toast">{message}</div>}
  </>;
}
