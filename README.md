# run-nerds MVP prototype

문서 기반으로 만든 로컬 프로토타입입니다.

## 포함된 흐름

- 러너 프로필 저장
- 사용자 이메일 기준 로컬 workspace 분리
- 주간 훈련 플랜 생성
- plan source / fallback 표시
- 캘린더형 세션 체크
- 날짜별 메모 저장
- 주간 체크인 반영
- 세션 브리핑 / 디브리핑
- 대화형 리플래닝 옵션 제안
- 안전 규칙 기반 강도 조정

## 실행

브라우저에서 `index.html`을 바로 열어도 되고, 간단한 정적 서버로 실행해도 됩니다.

예시:

```bash
cd /Users/taewoo/Documents/Codex/2026-04-20-files-mentioned-by-the-user-coach/run-nerds
python3 -m http.server 4173
```

그 뒤 브라우저에서 `http://localhost:4173`로 열면 됩니다.

## 다음 연결 포인트

- `app.js`의 `buildPlan()`을 Gemini/Supabase 연동 진입점으로 교체
- `localStorage` 기반 workspace를 Supabase auth + RLS 구조로 확장
- 세션/메모/체크인을 테이블 단위로 분리
- structured output schema를 plan meta와 session detail에 연결
