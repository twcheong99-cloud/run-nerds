# run-nerds

목표 대회, 회복 상태, 주간 훈련 계획, 훈련 기록을 한 흐름으로 관리하는 모바일 러닝 코치 앱입니다. 소스는 정적 웹앱/PWA 구조이고, 스토어 제출용 앱 빌드는 Capacitor Android/iOS 네이티브 셸로 감쌉니다.

## 현재 릴리즈 상태

- Web/PWA: 정적 배포 가능
- Native shell: Android/iOS Capacitor 프로젝트 체크인 완료
- App ID / package: `com.runnerds.app`
- Store readiness gate: `npm run release:check`
- CI gate: `.github/workflows/release-check.yml`
- Legal/support pages: `privacy.html`, `safety.html`, `support.html`
- Store docs: `STORE_READY_AUDIT.md`, `STORE_CONSOLE.md`, `STORE_SUBMISSION.md`, `STORE_LISTING.md`, `STORE_SCREENSHOTS.md`, `STORE_ASSETS.md`, `STORE_RATING.md`, `PRODUCTION_URLS.md`, `CI_RELEASE.md`, `RELEASE_RUNBOOK.md`, `RELEASE_BLOCKERS.md`, `RELEASE_EVIDENCE.md`, `BACKEND_RELEASE.md`, `VERSIONING.md`, `ANDROID_PERMISSIONS.md`

남은 실제 제출 blocker:

- 상세 현황은 `RELEASE_BLOCKERS.md`에서 추적합니다.
- 현재 제출 가능 여부의 최상위 요약은 `STORE_READY_AUDIT.md`를 봅니다.
- Android Studio, Android SDK, Java Runtime/JDK가 있는 머신에서 Android 빌드 검증
- Full Xcode와 Apple Developer signing으로 iOS archive/TestFlight 검증
- Production privacy/support URL 확정
- Reviewer demo account credentials 준비
- Signed/internal-test device build에서 스토어 스크린샷 촬영
- Store age rating / health declarations 입력 및 증거 보관
- `STORE_CONSOLE.md` 기준으로 최종 콘솔 입력값 정리
- `RELEASE_EVIDENCE.md` 기준으로 외부 증거 정리
- Production Supabase Auth/RLS/Edge Function 최종 검증

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

이 앱은 PWA로 설정되어 있어 Vercel 같은 정적 호스팅에 배포할 수 있습니다.

포함된 PWA 파일:

- `manifest.webmanifest`: 홈 화면 앱 이름, 아이콘, standalone 실행 설정
- `service-worker.js`: 기본 정적 파일 캐싱과 최소 오프라인 로딩
- `assets/icon-192.png`, `assets/icon-512.png`, `assets/apple-touch-icon.png`: 홈 화면 아이콘
- `STORE_ASSETS.md`: 스토어 아이콘과 런치 자산 체크리스트
- `vercel.json`: Vercel 정적 배포와 PWA 헤더 설정

Vercel에 배포할 때는 이 폴더(`/Users/taewoo/Desktop/app/run-nerds`)를 프로젝트로 연결하면 `vercel.json`이 `npm run mobile:prepare`로 `www` 번들을 만들고 그 폴더만 공개합니다. 최종 테스트 URL이나 운영 URL을 공유하기 전에는 `PRODUCTION_URLS.md`를 따라 공개 페이지를 확인합니다.

## 모바일 앱 빌드

웹 변경 후 네이티브 프로젝트에 반영하려면:

```bash
npm run mobile:sync
```

네이티브 프로젝트 열기:

```bash
npm run mobile:open:android
npm run mobile:open:ios
```

릴리즈 후보를 만들기 전에는:

```bash
npm run release:check
```

이 체크는 웹 테스트, Capacitor sync, Capacitor doctor, iOS plist lint, 스토어 제출 문서, age rating/health declaration 기준, safe-area/native bar 설정, 비밀키 번들 누락 여부를 함께 확인합니다. 실제 signed build 순서는 `RELEASE_RUNBOOK.md`를 따르고, 스크린샷 준비는 `STORE_SCREENSHOTS.md`를 따릅니다.

실제 Android/iOS 릴리즈 머신에서는 추가로:

```bash
npm run native:doctor
```

이 점검은 Java/JDK, Android Gradle wrapper, Android Studio, full Xcode, Supabase CLI가 스토어 빌드 작업을 진행할 수 있는 상태인지 확인합니다.

## LLM 코치 연결 준비

- 브라우저에는 LLM API 키를 넣지 않습니다.
- 프론트엔드는 Supabase Edge Function `coach`만 호출합니다.
- Edge Function 환경변수에 `OPENAI_API_KEY`를 설정하면 LLM 코치가 응답합니다.
- `OPENAI_API_KEY`가 없거나 응답이 실패하면 기존 로컬 코치 엔진으로 자동 fallback됩니다.
- 선택적으로 `OPENAI_MODEL`을 설정할 수 있으며, 기본값은 `gpt-5.2`입니다.
- 코칭 판단 근거는 `COACHING_KNOWLEDGE.md`에 정리했고, Edge Function 프롬프트는 이 원칙을 매 요청에 포함합니다.
- 정적 앱 배포와 Supabase Edge Function 배포는 별개입니다. `supabase/functions/coach/index.ts`를 바꾸면 정적 사이트를 다시 배포하는 것만으로는 LLM 프롬프트가 바뀌지 않으므로 `coach` Edge Function도 별도로 배포해야 합니다.
- 스토어 제출 전 백엔드 점검은 `BACKEND_RELEASE.md`를 따릅니다.

```bash
supabase login
supabase functions deploy coach --project-ref jnlexemtrjgwskzwybim
```

## 테스트

```bash
npm test
npm run security:scan
npm run release:check
```

`npm test`는 LLM 코치 응답 정규화, 요일/횟수 요구사항 병합, 임시 조정 해제 동작을 확인합니다. `npm run security:scan`은 커밋된 파일 안에 실제 secret/token/password 형태가 들어왔는지 확인합니다. `npm run release:check`는 스토어 제출 전 기본 게이트입니다.

GitHub Actions의 `Release readiness` 워크플로도 `main` push와 pull request에서 같은 릴리즈 체크를 실행합니다. 최종 제출 전 CI 증거 정리는 `CI_RELEASE.md`와 `RELEASE_EVIDENCE.md`를 따릅니다.

## 보안 주의

- `env.js`는 커밋하지 않습니다.
- LLM API 키는 `env.js`에 넣지 않습니다.
- `www/env.js`는 네이티브 앱 번들에 포함되면 안 됩니다.
- 이미 공개 저장소에 publishable key를 올렸다면 새 키로 교체하는 것을 권장합니다.
- Supabase SQL은 `supabase-setup.sql`을 SQL Editor에서 실행해 주세요.
