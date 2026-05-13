# run-nerds

문서 기반으로 만든 로컬 프로토타입입니다. 가족 테스트용 배포는 PWA 정적 웹앱으로 진행합니다.

## 실행 전 설정

1. `env.example.js`를 복사해서 `env.js`를 만듭니다.
2. `env.js` 안에 로컬 개발용 Supabase 값을 넣습니다.

예시:

```bash
cp env.example.js env.js
```

배포용 공개 설정은 `env.public.js`에 둡니다. Supabase publishable key는 브라우저에 포함될 수 있지만, OpenAI API key, Supabase service role key, DB URL은 절대 프론트엔드 파일에 넣지 않습니다.

## 로컬 실행

```bash
cd /Users/taewoo/Desktop/app/run-nerds
python3 -m http.server 4173
```

브라우저에서 `http://localhost:4173`로 열면 됩니다.

## 가족 테스트 배포

이 앱은 PWA로 설정되어 있어 Netlify나 Vercel 같은 정적 호스팅에 그대로 배포할 수 있습니다.

포함된 PWA 파일:

- `manifest.webmanifest`: 홈 화면 앱 이름, 아이콘, standalone 실행 설정
- `service-worker.js`: 기본 정적 파일 캐싱과 최소 오프라인 로딩
- `assets/icon-192.png`, `assets/icon-512.png`, `assets/apple-touch-icon.png`: 홈 화면 아이콘
- `netlify.toml`: Netlify 정적 배포와 PWA 헤더 설정

Netlify에 배포할 때는 이 폴더(`/Users/taewoo/Desktop/app/run-nerds`)를 사이트로 연결하거나 드래그 앤 드롭 배포하면 됩니다. 배포 후 가족에게 배포 URL만 공유하고, 설치 방법은 `FAMILY_TESTING.md`를 안내하면 됩니다.

## LLM 코치 연결 준비

- 브라우저에는 LLM API 키를 넣지 않습니다.
- 프론트엔드는 Supabase Edge Function `coach`만 호출합니다.
- Edge Function 환경변수에 `OPENAI_API_KEY`를 설정하면 LLM 코치가 응답합니다.
- `OPENAI_API_KEY`가 없거나 응답이 실패하면 기존 로컬 코치 엔진으로 자동 fallback됩니다.
- 선택적으로 `OPENAI_MODEL`을 설정할 수 있으며, 기본값은 `gpt-5.2`입니다.

## 보안 주의

- `env.js`는 커밋하지 않습니다.
- LLM API 키는 `env.js`에 넣지 않습니다.
- 이미 공개 저장소에 publishable key를 올렸다면 새 키로 교체하는 것을 권장합니다.
- Supabase SQL은 `supabase-setup.sql`을 SQL Editor에서 실행해 주세요.
