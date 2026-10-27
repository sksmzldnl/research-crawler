# Gemini 연동 조사 — 2026-10-28 (한국 시간)

대상: ZeroWaste Listening Studio 0.6.2. 이 문서는 조사 결과와 적용 설계이며, 새 설치 버전을 배포했다는 의미가 아니다. 실제 사용자 API 키를 받거나 사용자 프로젝트에서 호출하지 않았다.

## 결론과 확인 수준

현재 앱의 Gemini Developer API 요청 주소, x-goog-api-key 헤더, systemInstruction/contents/generationConfig JSON은 최신 공개 공식 SDK @google/genai 2.31.0으로 동일 입력을 직렬화했을 때와 일치했다. 응답 생성 성공·계정 권한·과금 조건은 이 비교로 입증되지 않는다. 모델명과 클라이언트 시간 제한 변경만으로 계정 문제나 DNS/TLS/프록시 문제를 해결했다고 판단하면 안 된다.

원인을 좁히려면 **네트워크 → 키 인식·모델 조회 → 실제 최소 생성 → JSON 생성 → CSV 1행 → 여러 행**을 각각 확인해야 한다. Google은 models.list의 200 응답이 생성 호출의 프로젝트 자격·결제 상태를 검사하지 않는다고 명시한다.

## 현재 공식 자료로 확인한 사항

| 항목 | 확인 내용 | 앱에 적용할 판단 |
| --- | --- | --- |
| API 종류 | AI Studio 키를 쓰는 Gemini Developer API와 Cloud 프로젝트·지역·별도 인증을 사용하는 Enterprise/Vertex 경로는 다름 | AI Studio 키는 Developer API에 명시적으로 전달. 두 경로의 인증 설정을 섞지 않음 |
| 키 유형 | 2026-05-28 이후 AI Studio 신규 키는 서비스 계정에 연결되는 Authorization key. 제한 없는 Standard key는 Gemini 요청이 거부됨. 명시적으로 제한된 Standard key는 계속 사용 가능 | 신규 사용자는 AI Studio에서 Auth key 생성. 입력값은 여전히 API 키 하나이며 로그인 ID/비밀번호·Client ID/Secret은 필요 없음 |
| 인증 | 공식 SDK NodeAuth는 API 키를 x-goog-api-key 헤더에 넣음 | 현재 헤더 방식 유지. Auth key라는 이름을 OAuth Bearer 토큰으로 오해하지 않음 |
| 모델 2.5 | 공식 모델 페이지는 기존 적극적 사용 계정으로 접근을 제한하며, 종료·폐기된 것은 아니라고 명시 | 2.5의 404를 모든 계정에서 모델이 종료됐다는 뜻으로 단정하지 않음 |
| latest 별칭 | stable·preview·experimental 중 하나로 바뀔 수 있음 | CSV 기능에는 명시적인 안정 모델 gemini-3.5-flash-lite를 우선 검증. 깊은 분석은 gemini-3.8-flash를 별도로 검증. 자동으로 유료 전용 모델로 바꾸지 않음 |
| 무료 등급 | 두 모델의 Standard 텍스트 입력·출력에 무료 등급이 표시됨. 모든 프로젝트가 무료 등급 대상은 아님 | AI Studio에서 **키가 속한 동일 프로젝트**의 Free/Restricted/Free tier unavailable/Payment needed 상태와 실제 한도 확인. 결제 연결을 무료 사용 조건처럼 안내하지 않음 |
| 프로젝트 제한 | 무료 등급이 차단된 프로젝트는 같은 프로젝트에서 키만 새로 만들어도 해결되지 않음 | 키 문제와 프로젝트 자격 문제를 별도로 안내. 유료 전환하면 무료 한도가 열리는 것이 아니라 유료 과금 적용 |
| API 버전 | generateContent는 공식적으로 계속 지원됨. Interactions는 새 권장 인터페이스이지만 beta이며, 같은 문서에서 안정 배포에는 generateContent 유지도 권고 | CSV 정리를 위해 무조건 API를 교체할 근거는 없음. 두 API의 요청·응답 구조를 혼용하지 않음 |
| 구조화 출력 | JSON Schema 일부만 지원. 문자열 minLength/maxLength는 서버 제약 생성에서 무시됨 | 앱의 Zod·원문 근거 검사 유지. 최소 텍스트 생성 성공을 먼저 확인한 다음 JSON 기능 검사 |
| 지연 | 3.8 Flash는 기본 medium thinking, 3.5 Flash-Lite는 기본 minimal. 사고 토큰이 지연·출력 한도에 포함될 수 있음 | 간단한 CSV 정리는 Flash-Lite 우선. 3.8에서는 지원되는 LOW만 사용. 3.8에 MINIMAL을 보내면 오류가 됨 |
| 한도 | RPM/TPM/RPD는 API 키가 아닌 프로젝트 단위. 실제 모델·프로젝트 한도는 AI Studio에서 확인 | 30행=최소 30회 요청이며 긴 행 분할 시 더 증가. 키 교체를 한도 회피 방법으로 제안하지 않음. 429의 일시 제한과 일일 한도를 구분 |
| 오류 | 400/401/402/403/404/429는 해결 방법이 다름. HTTP 응답이 없는 DNS·TLS·프록시·연결 끊김과도 구분 필요 | HTTP 상태만 남기고 Google 오류 본문을 버리는 현재 방식 개선. 키를 가린 error.status/code, reason, message와 실패 단계를 표시 |

공식 GitHub 개발 스킬의 2.5 폐기 표현과 공식 호스팅 모델·폐기 문서의 ‘종료되지 않음/기존 계정 제한’ 표현이 서로 달랐다. 이 조사에서는 구체적인 호스팅 모델·폐기 문서를 우선했다. 일부 REST 예제에 오래된 모델명이 남아 있어 예제 모델명을 현재 이용 가능 모델의 근거로 쓰지 않았다.

## 최소 연결 확인의 구체적인 설계

새 메뉴를 추가하지 않고 설정의 Gemini 카드 안에서 한 번의 ‘연결 확인’으로 아래 단계를 표시한다. **아직 이 UI는 구현·배포하지 않았다.** 실제 생성 검사에는 API 요청량이 사용됨을 버튼 옆에 표시한다.

1. 키가 존재하고 허용된 Developer API 호스트를 사용하는지 확인한다.
2. 동일 키로 GET /v1beta/models를 실행해 키 인식과 모델 목록을 확인한다. 성공 문구는 ‘키 인식·모델 조회 성공’으로 한정한다.
3. gemini-3.5-flash-lite로 합성 입력 ‘OK만 답하세요’를 실제 생성한다. 이 단계의 성공이 있어야 ‘생성 연결 성공’이라고 표시한다. 사용자 CSV는 보내지 않는다.
4. 합성 입력으로 요약 한 필드의 작은 JSON 스키마를 검증한 후 기존 전체 인사이트 스키마를 검증한다. 이때 사용 가능한 모델 이름과 처리 시간을 기록한다.
5. CSV 1행을 처리한 뒤 여러 행을 실행한다. 요청 속도는 프로젝트 한도에 맞추고, 오류가 난 행부터 재실행하도록 완료한 행을 보존한다.

단계 2 성공·3 실패는 프로젝트 자격, 모델 접근, 추론 한도, 결제 등을 우선 분류한다. 단계 3 성공·4 실패는 JSON 구성·모델 기능·출력 검증을 조사한다. HTTP 응답 자체가 없으면 계정 자격 문제라고 단정하지 않고 기기의 DNS/TLS/프록시·응답 대기를 조사한다.

## 공식 SDK를 이용한 최소 기준 코드

최신 공개 npm 버전 2.31.0은 2026-10-23 수정 메타데이터로 확인했다. 프로젝트에 도입한다면 버전을 고정하고, Electron 메인 프로세스에서 키를 명시적으로 전달해야 한다. SDK로 바꾸기만 하면 네트워크·프로젝트 제한이 해결되는 것은 아니다.

```ts
import {GoogleGenAI} from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: keyFromSecureStorage,
  apiVersion: 'v1beta',
  httpOptions: {
    timeout: 120_000,
    retryOptions: {attempts: 1},
    // Electron 전송을 사용할 때는 net.fetch를 감싼 함수를 주입.
    // 명시적인 환경 변수 프록시가 있으면 기존 프록시 경로 유지.
    fetch: desktopFetch,
  },
});

const result = await ai.models.generateContent({
  model: 'gemini-3.5-flash-lite',
  contents: 'OK만 답하세요.',
});
console.log(result.text); // 실제 API 키나 CSV는 진단 로그에 기록하지 않음
```

이 예제는 적용 기준 코드다. 실제 사용자 프로젝트에서 실행한 결과는 아니다. Interactions를 선택하는 경우 /v1beta/interactions, Api-Revision, response_format, steps/output_text, store:false 등 별도 계약을 함께 적용해야 하며 현재 generateContent의 candidates 파서와 섞으면 안 된다.

## 재현한 검증과 한계

- 공식 SDK 2.31.0을 앱 외부 /tmp 격리 경로에 설치했고 저장소 의존성은 변경하지 않았다.
- 동일한 합성 CSV 본문과 앱의 JSON 스키마로 앱 0.6.2와 SDK의 발신 요청을 메모리에서 각각 캡처했다.
- 목적지 URL, API 키 헤더, 전체 JSON 본문이 일치함을 assert로 검사했고 SDK 응답의 text 추출도 확인했다.
- 네트워크 전송은 메모리에서 차단했으며 키는 가짜 fixture 값이었다. 실제 Gemini 호출·사용자 계정·무료 등급 검증이라고 주장하지 않는다.
- 실제 키를 사용하지 않았으므로 현재 사용자의 404·연결 오류 원인은 아직 확정할 수 없다. 최신 앱에서의 구체적인 오류 코드/문구 또는 동일 키를 사용한 최소 생성 응답이 필요하다. API 키 자체를 채팅으로 받을 필요는 없다.

## 공식 출처

모두 2026-10-28 한국 시간에 직접 열람했다.

1. [API 키 유형·이관·제한](https://ai.google.dev/gemini-api/docs/api-key)
2. [모델 목록·2.5 접근 제한·latest 별칭](https://ai.google.dev/gemini-api/docs/models)
3. [Gemini 3.5 Flash-Lite 모델](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
4. [Gemini 3.8 Flash 모델](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)
5. [모델 폐기 일정](https://ai.google.dev/gemini-api/docs/deprecations)
6. [가격·무료 등급](https://ai.google.dev/gemini-api/docs/pricing)
7. [프로젝트 제한·무료 등급 비대상·메타데이터 조회의 한계](https://ai.google.dev/gemini-api/docs/troubleshooting#project-unavailable)
8. [프로젝트별 요청 한도](https://ai.google.dev/gemini-api/docs/rate-limits)
9. [Interactions 지원·제한과 기존 API 유지](https://ai.google.dev/gemini-api/docs/interactions)
10. [REST generateContent 요청·구조화 출력·사고 설정](https://ai.google.dev/api/generate-content)
11. [JSON Schema 지원 범위](https://ai.google.dev/gemini-api/docs/structured-output)
12. [Thinking 기본값·모델별 지원](https://ai.google.dev/gemini-api/docs/thinking)
13. [공식 SDK 고정 커밋 README](https://github.com/googleapis/js-genai/blob/fc5ad300b774f345aad84b9f615324f47953dcb5/README.md)
14. [공식 SDK 인증 코드](https://github.com/googleapis/js-genai/blob/fc5ad300b774f345aad84b9f615324f47953dcb5/src/node/_node_auth.ts)
15. [공식 SDK 패키지](https://www.npmjs.com/package/@google/genai/v/2.31.0)

## 0.7.0 구현 반영

위 조사 당시 미구현으로 표시한 진단 UI를 설정의 Gemini 카드에 구현했습니다. 작은 JSON 전용 단계를 따로 추가하는 대신, 두 번째 생성에서 실제 CSV와 같은 전체 인사이트 JSON 스키마 및 원문 근거를 합성 입력으로 검증합니다. 따라서 모델 조회와 생성 두 번으로 확인합니다. 체크 성공은 현재 키·모델에만 유효하며 앱 세션에만 유지됩니다. 기본 모델 고정, 단계별 Google 오류 키 가림, 생성 자동 재전송 제거, 확인 전 Gemini CSV 처리 차단도 반영합니다. 조사 당시의 SDK 0.6.2 발신 비교 결과는 역사적 증거로 보존하며 0.7.0의 실제 계정 성공을 뜻하지 않습니다.
