# run-nerds family testing

## 테스트 URL

정적 호스팅에 배포한 URL을 가족에게 공유합니다.

예시:

```text
https://run-nerds-family-test.netlify.app
```

## iPhone에서 앱처럼 설치

1. Safari에서 테스트 URL을 엽니다.
2. 하단 공유 버튼을 누릅니다.
3. `홈 화면에 추가`를 누릅니다.
4. 이름이 `run-nerds`인지 확인하고 추가합니다.
5. 홈 화면의 아이콘으로 실행합니다.

## Android에서 앱처럼 설치

1. Chrome에서 테스트 URL을 엽니다.
2. 메뉴 버튼을 누릅니다.
3. `홈 화면에 추가` 또는 `앱 설치`를 누릅니다.
4. 홈 화면의 아이콘으로 실행합니다.

## 가족 테스트 순서

1. 회원가입합니다.
2. 첫 상담을 완료합니다.
3. 홈에서 오늘 훈련과 주간 체크를 확인합니다.
4. 상담 탭에서 AI Coach에게 계획 변경을 요청합니다.
5. 홈과 상담 캘린더에 변경이 보이는지 확인합니다.

## 운영 체크

- Supabase Auth에서 이메일 회원가입이 허용되어 있어야 합니다.
- Supabase Edge Function `coach`가 배포되어 있어야 합니다.
- Supabase secrets에 `OPENAI_API_KEY`와 `OPENAI_MODEL`이 있어야 합니다.
- OpenAI API key는 절대 프론트엔드 파일에 넣지 않습니다.
- 가족별 데이터는 Supabase 로그인 사용자 기준으로 분리됩니다.
