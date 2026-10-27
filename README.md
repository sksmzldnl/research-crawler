# ZeroWaste Listening Studio 0.5.0 · 공식 검색 API

기존 통합 작업실 디자인을 유지하고 검색 수집을 공식 API로 전환한 macOS/Windows 앱입니다. 메뉴는 **수집 작업실 / 설정** 두 개입니다. GPT·Gemini는 선택 행의 번역·CSV 정리에만 사용합니다.

설치 파일: https://github.com/sksmzldnl/research-crawler/releases/tag/studio-api-v0.5.0

- Apple Silicon: ZeroWaste-Listening-Studio-0.5.0-mac-arm64.dmg
- Intel Mac: ZeroWaste-Listening-Studio-0.5.0-mac-x64.dmg
- Windows: ZeroWaste-Listening-Studio-0.5.0-win-x64.exe

## 사용 흐름

설정에서 검색 API 키와 연결 정보 등록 → 연결 테스트 → 작업실에서 엔진·쿼리 번들 선택 → 자동 검색·수집 시작 → 결과 검토 → 필요한 행 번역·CSV 정리 → CSV/Excel 저장.

엔진별 페이지·after 커서를 저장하며 오류 시 일시정지하고 같은 위치에서 재개합니다. 전체 논리식·제외어·광고·날짜·중복 필터는 로컬에서 적용합니다. URL·검색 경로·제외 근거를 보존합니다. 목표 수량은 제공자 한도와 실제 결과에 따라 부족할 수 있습니다. 검색 범위/주소는 수집 시작 시 저장하므로 변경할 때는 새 수집으로 시작하세요.

- **다음(Kakao)**: REST API 키. 웹·블로그·카페.
- **Brave**: 웹 검색 API 키. Reddit 등 도메인 제한 검색에도 사용.
- **네이버 API Hub**: 콘솔에서 확인한 실제 검색 요청 URL과 인증 형식을 설정합니다. 기존 NAVER Search API 키용 요청 계약도 지원하지만 신규 Hub의 주소를 추정하지 않습니다.
- **Google**: 기존 Custom Search JSON API 사용 권한이 있는 계정만. 신규 고객 제공 종료, 기존 고객 전환 기한 2027-01-01.
- **Reddit**: Data API 사용 승인이 있는 installed app만 OAuth 연결. 선택 시 게시글당 최대 25개 반환 댓글, 삭제 상태 동기화. 승인 전에는 Brave에서 색인된 공개 링크·검색 요약을 찾을 수 있으며 원문·댓글 직접 접근과 구분합니다.

새 사용자는 Google/Reddit 사용 권한이 있다고 가정하지 않습니다. 앱의 Google·Reddit 선택은 해당 조건을 설정에서 확인한 뒤 활성화됩니다. [API 키 입력·연결 절차](docs/API.md), [배포·검증 범위](docs/API_RELEASE.md)를 확인하세요.

## 자료와 보안

CSV·텍스트·RSS·URL 직접 가져오기는 접힌 보조 영역에 있습니다. 원래 CSV 열과 값은 original_column: 접두어로 내보내기에 보존합니다. 모든 행을 내보내려면 전체 결과를 선택하세요. 위험한 수식 값에는 작은따옴표가 붙습니다.

원문 확보는 설정의 허용 도메인과 robots.txt/공개 HTML 저장 조건을 확인하며, 실패 시 검색 스니펫을 유지합니다. 로그인·CAPTCHA·비공개 자료를 우회하지 않습니다. Reddit 원문은 승인된 API 응답만 사용합니다.

키는 지원되는 OS 암호화 기능으로 저장하며 불가능하면 세션 메모리에만 보관합니다. CSV/백업에 키를 넣지 않습니다. API 연결 테스트도 실제 요청과 할당량을 사용합니다. 제공자별 최신 한도·요금·승인 조건을 확인하세요. ChatGPT/Gemini 앱 구독은 API 이용권과 별개입니다.

기존 조사·가져온 자료는 유지합니다. 이전 브라우저 수집 기록은 결과만 읽고, API 방식 수집은 새로 시작합니다.

## 개발 및 검증

Node.js 24+, Electron 45, React 19, TypeScript, SQLite.

```sh
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:ui
npm run desktop
```

설치형 통합 검증: npm run test:desktop. Linux에서는 STUDIO_DESKTOP_HEADLESS=1을 추가할 수 있습니다. 독립 테스트 데이터 폴더와 명시적 테스트 플래그가 있는 실행만 정해진 HTTP 응답 fixture를 사용하며 일반 앱은 실제 API를 호출합니다. 사용자 키가 없는 개발·CI 검증은 실제 서비스 승인·요금·계약 검증과 구분합니다.

실제 API 점검은 설정한 계정의 키를 환경 변수로 제공하고 STUDIO_LIVE_ENGINE을 지정해 npm run test:live를 실행할 수 있습니다. [스크립트](scripts/live-test.ts)의 변수 이름을 참고하세요. 키를 소스에 쓰지 마세요.

Mac은 macOS 13 이상. ad-hoc 서명이며 Developer ID 공증 없음. Apple Silicon 기기 직접 실행과 실제 사용자 API 키 호출은 미검증입니다. 플랫폼별 build.json과 릴리스 검증 설명을 확인하세요.
