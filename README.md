# run-nerds

문서 기반으로 만든 로컬 프로토타입입니다.

## 실행 전 설정

1. `env.example.js`를 복사해서 `env.js`를 만듭니다.
2. `env.js` 안에 본인 Supabase 값을 넣습니다.

예시:

```bash
cp env.example.js env.js
```

## 실행

```bash
cd /Users/taewoo/Documents/Codex/2026-04-20-files-mentioned-by-the-user-coach/run-nerds
python3 -m http.server 4173
```

브라우저에서 `http://localhost:4173`로 열면 됩니다.

## 보안 주의

- `env.js`는 커밋하지 않습니다.
- 이미 공개 저장소에 publishable key를 올렸다면 새 키로 교체하는 것을 권장합니다.
- Supabase SQL은 `supabase-setup.sql`을 SQL Editor에서 실행해 주세요.
