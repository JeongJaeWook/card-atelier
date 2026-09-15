const OPENAI_BASE = 'https://api.openai.com/v1';

function apiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다. .env.local에 키를 추가해 주세요.');
  return key;
}

async function readError(response: Response) {
  const body = await response.text();
  try { return JSON.parse(body).error?.message || body; } catch { return body; }
}

export async function createImage(prompt: string, size: string, referenceDataUrl?: string) {
  const headers = { Authorization: `Bearer ${apiKey()}` };
  let response: Response;
  if (referenceDataUrl) {
    const [meta, data] = referenceDataUrl.split(',');
    const mime = meta.match(/data:(.*?);/)?.[1] || 'image/png';
    const bytes = Buffer.from(data, 'base64');
    const form = new FormData();
    form.append('model', 'gpt-image-2');
    form.append('prompt', prompt);
    form.append('size', size);
    form.append('n', '1');
    form.append('image', new Blob([bytes], { type: mime }), 'character-reference.png');
    response = await fetch(`${OPENAI_BASE}/images/edits`, { method: 'POST', headers, body: form });
  } else {
    response = await fetch(`${OPENAI_BASE}/images/generations`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2', prompt, size, n: 1 })
    });
  }
  if (!response.ok) throw new Error(await readError(response));
  const payload = await response.json();
  const b64 = payload.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI에서 이미지 데이터를 받지 못했습니다.');
  return `data:image/png;base64,${b64}`;
}

export async function createJson<T>(prompt: string): Promise<T> {
  const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a precise Korean content strategist. Return valid JSON only, never markdown.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!response.ok) throw new Error(await readError(response));
  const payload = await response.json();
  try { return JSON.parse(payload.choices?.[0]?.message?.content || '{}') as T; }
  catch { throw new Error('카피 생성 결과를 해석하지 못했습니다. 다시 시도해 주세요.'); }
}
