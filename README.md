# ZeroWaste Listening Studio 0.7.0

네이버 블로그·카페의 검색 결과를 쿼리 번들로 모으고, CSV 자료를 AI로 요약·정리하는 macOS/Windows 앱입니다. 기존 Liquid Glass 디자인을 유지하며 메뉴는 **작업실 / 설정** 두 개로 정리했습니다.

[처음 사용하는 분을 위한 Windows·API 연결 안내](docs/WINDOWS_BEGINNER_GUIDE_KO.md) · [8쪽 PDF 안내서](docs/Windows-Guide-0.7.0-KO.pdf)

[설치 파일 다운로드](https://github.com/sksmzldnl/research-crawler/releases/tag/studio-api-v0.7.0)

- Apple Silicon Mac: `ZeroWaste-Listening-Studio-0.7.0-mac-arm64.dmg`
- Intel Mac: `ZeroWaste-Listening-Studio-0.7.0-mac-x64.dmg`
- Windows: `ZeroWaste-Listening-Studio-0.7.0-win-x64.exe`

## 사용 방법

1. 설정에서 네이버 API Hub의 Client ID·Client Secret을 각각 등록합니다. 요청 URL은 입력하지 않습니다.
2. 작업실에서 **블로그 또는 카페**를 고르고 쿼리 번들·목표 수량을 설정한 뒤 **검색·수집 시작**을 누릅니다. 예: `재사용 AND (불편 OR 후기) NOT 광고`.
3. 기존 파일은 **CSV 파일 가져오기**에서 가져옵니다. AI가 읽을 본문 열만 고르면 나머지 열은 그대로 보존됩니다. CSV 가져오기에는 네이버 키가 필요하지 않습니다.
4. 설정에서 **OpenAI GPT 또는 Google Gemini** 중 하나를 선택하고 해당 API 키를 등록합니다. OpenAI는 **Secret Key 전체값 하나**를 사용합니다. Tracking ID·로그인 아이디·비밀번호는 입력하지 않습니다.
5. Gemini는 **설정 → 연결 확인**을 눌러 키·모델 조회, 실제 문장 생성, JSON·인사이트 생성의 3단계를 통과해야 합니다. 합성 자료로 모델 조회와 최대 2회의 생성 요청을 보내며 CSV는 전송하지 않습니다. 프로젝트의 요금·한도가 적용됩니다.
6. 자료의 행을 선택하고 **선택 N행 AI 정리**를 누릅니다. 선택한 본문을 AI에 보내 요약·인사이트·개선 제안·근거를 추가합니다. 필요하면 분석 관점을 적을 수 있습니다.
7. **표시된 N행 CSV 저장**으로 현재 필터의 모든 행을 저장합니다. 체크한 행은 AI 처리 대상이며 CSV 저장 대상은 화면에 표시된 행입니다.

[키 입력과 오류 해결](docs/API.md) · [배포 및 검증 범위](docs/API_RELEASE.md) · [네이버 연결 규격 근거](docs/NAVER_API_HUB.md)

## 데이터 처리

검색은 네이버 API가 반환하는 제목·URL·검색 요약을 저장합니다. 게시글 전문과 댓글은 수집하지 않습니다. 검색 단계에서 AI를 호출하지 않습니다. 쿼리의 전체 논리식·추가 제외어·광고·날짜·중복 검사는 로컬에서 적용합니다. 날짜가 없으면 만들어 넣지 않으며 목표 수량은 결과와 페이지 한도에 따라 부족할 수 있습니다. 오류·중단 후 현재 버전의 수집 위치에서 재개할 수 있습니다.

CSV는 5MB·1,000행·150열까지 가져옵니다. 원래 열과 순서를 보존하고 뒤에 `AI_요약`, `AI_인사이트`, `AI_개선제안`, `AI_근거` 등 결과 열을 추가합니다. 기존 열 이름과 겹치면 새 열에 숫자 접미사를 붙입니다. 원문을 덮어쓰지 않습니다. 수식으로 실행될 수 있는 셀에는 작은따옴표를 붙입니다. 내보내기는 Excel에서 열 수 있는 UTF-8 BOM CSV입니다.

AI는 본문에서 정확히 일치하는 인용만 저장합니다. 잘못된 인용은 행별 오류로 남기며, 인증·권한·사용 한도 오류는 남은 행 처리를 멈춥니다. 완료한 결과는 보존됩니다. AI 해석과 제안은 원문과 함께 검토하세요.

다른 검색엔진, 웹문서 검색, RSS·URL 수집, 전문 추출, 번역 전용 기능, 모델 목록만 확인하는 연결 테스트는 제거했습니다. Gemini는 실제 문장·JSON 생성까지 검증하는 연결 확인을 제공합니다. 이전 버전의 자료·키 저장 파일은 보존하며, 이전 수집 작업은 새 네이버 검색으로 시작합니다.

키는 지원되는 OS 암호화 기능으로 저장하고, 보안 저장소를 사용할 수 없으면 세션 메모리에만 보관합니다. CSV에는 키를 넣지 않습니다. ChatGPT/Gemini 구독과 API 사용 요금은 별개입니다.

## 개발

Node.js 24+, Electron 45, React 19, TypeScript, SQLite.

```sh
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:ui
npm run desktop
```

`npm run test:desktop`은 격리된 데이터와 명시적인 테스트 플래그에서만 모의 API 응답으로 실제 Electron UI·IPC·저장 경로를 검사합니다. Linux headless 실행은 `STUDIO_DESKTOP_HEADLESS=1 npm run test:desktop`입니다. 설치 패키지 자체도 네이티브 빌드 호스트에서 같은 검사를 실행합니다.

선택적인 실제 네이버 검사는 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, 선택적인 `NAVER_SEARCH_TYPE=blog|cafearticle` 환경 변수로 `npm run test:live`를 실행합니다. 실제 키를 코드나 채팅에 넣지 마세요. 일반 앱 실행은 실제 API를 사용합니다.

Mac은 macOS 13 이상, ad-hoc 서명이며 Developer ID 공증은 없습니다. 실제 사용자 API 키와 Apple Silicon 하드웨어 실행은 개발 환경에서 검증하지 않았습니다.

Gemini 기본 모델은 `gemini-3.5-flash-lite`입니다. 키·모델을 변경하거나 앱을 다시 실행하면 연결을 다시 확인합니다. 성공 표시는 해당 시점의 생성 검증이며 무료 이용 자격이나 앞으로의 할당량을 보장하지 않습니다. Google 오류는 키를 가린 상태로 실패 단계에 표시하며 진단 내용만 복사할 수 있습니다.
