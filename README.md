# Card Atelier

브랜드 페르소나와 주제만으로 한글 카드뉴스를 만드는 Next.js 앱입니다. 이미지 배경은 **OpenAI `gpt-image-2`**로 만들고, 한글 텍스트는 브라우저 Canvas에서 합성하므로 깨지지 않습니다.

## 주요 기능
- 브랜드 페르소나, 주제, 카드 수, 비율 설정
- 사진 또는 캐릭터 업로드 후 캐릭터 시트 생성
- 캐릭터 시트를 참조해 같은 얼굴·의상·그림체로 카드별 이미지 생성
- 카드별 제목, 본문, 이미지 프롬프트, 순서, 강조색 편집
- 카드별 PNG 다운로드 및 전체 일괄 다운로드
- Supabase에 생성 프로젝트 기록 저장

## 로컬 실행
```bash
cp .env.example .env.local
npm install
npm run dev
```

`.env.local`에 OpenAI API 키를 입력하세요. API 키는 서버 Route Handler에서만 사용됩니다.

## Supabase 설정
1. Supabase에서 새 프로젝트를 만들고 SQL Editor를 엽니다.
2. `supabase/migrations/001_card_projects.sql` 전체를 실행합니다.
3. Project Settings > API에서 Project URL과 `service_role` key를 복사합니다.
4. Vercel 환경 변수에 다음을 추가합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - 선택: `OPENAI_TEXT_MODEL` (기본 `gpt-4.1-mini`)

`SUPABASE_SERVICE_ROLE_KEY`는 절대 브라우저에 노출되지 않도록 서버 전용 변수로만 사용합니다.

## Vercel 배포
GitHub에 저장소를 올린 뒤 Vercel에서 **Add New Project** > 저장소 Import > 위 환경 변수 입력 > Deploy 순서로 배포하세요.
