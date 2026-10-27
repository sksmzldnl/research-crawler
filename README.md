# ZeroWaste Listening Studio 0.4.1

검색 엔진을 고르고 쿼리 번들로 자료를 자동 검색·수집하는 macOS/Windows 앱입니다. 검색 API는 사용하지 않습니다. GPT·Gemini는 사용자가 선택한 행의 번역·CSV 정리에만 사용합니다.

설치 파일: https://github.com/sksmzldnl/research-crawler/releases/tag/studio-search-v0.4.1

- Apple Silicon: `ZeroWaste-Listening-Studio-0.4.1-mac-arm64.dmg`
- Intel Mac: `ZeroWaste-Listening-Studio-0.4.1-mac-x64.dmg`
- Windows: `ZeroWaste-Listening-Studio-0.4.1-win-x64.exe`

Mac은 macOS 13 이상이며 ad-hoc 서명, Developer ID 공증 없음. Apple Silicon 직접 실행 여부는 플랫폼별 build.json을 확인하세요. [배포·검증 설명](docs/SEARCH_RELEASE.md).

## 한 화면에서 수집하기

1. **수집 작업실**에서 네이버·다음·Bing·Google 중 검색 엔진을 선택합니다.
2. 쿼리 번들을 체크합니다. 같은 영역에서 번들 이름·AND/OR/NOT 논리식·제외어를 추가하고 편집할 수 있습니다. 실행 검색어 확인으로 실제 엔진에 보낼 조합을 확인합니다.
3. 목표 유효 자료 수와 검색어당 최대 페이지를 정합니다. 필요하면 범위 설정에서 사이트 도메인, 게시 기간, 광고 제외, 원문 수집을 설정합니다. 도메인을 지정하면 site: 검색과 결과 도메인 검증을 함께 사용합니다.
4. **자동 검색·수집 시작**을 누르면 앱의 검색 창에서 검색어와 페이지를 순회합니다. 제목·URL·검색 스니펫·검색 경로를 저장하고 전체 논리식과 품질 조건을 적용합니다. 검색 결과 한도·차단·제외 조건 때문에 목표 수량은 보장하지 않습니다.
5. 작업실 아래에서 진행 상태, 일시정지·현재 위치 재개·중지, 이전 자료 모음 선택과 원문 검토를 처리합니다. 검색 창을 닫거나 접근 확인/차단 화면 또는 모르는 결과 구조가 나타나면 현재 위치에서 일시정지합니다. 자동으로 로그인하거나 CAPTCHA를 우회하지 않습니다.
6. 필요한 행을 체크하고 접힌 **번역·CSV 정리**를 펼쳐 GPT 또는 Gemini를 선택합니다. 설정에서 AI 키 등록과 외부 전송 동의를 먼저 저장해야 합니다. 자동 검색 중에는 AI를 호출하지 않습니다.
7. CSV 또는 Excel로 저장합니다. 원본 행 전체가 필요하면 전체 결과를 선택하세요. 제외 행도 로컬에 보존합니다.

원문 수집을 켜면 **설정**의 허용 도메인과 robots.txt/저장 제한을 확인합니다. 실패하면 검색 스니펫과 사유를 보존합니다. JavaScript 렌더링 원문·로그인·비공개 문서는 지원하지 않습니다. 게시일은 확인된 값만 저장하며 미확인 포함 여부를 선택할 수 있습니다.

검색 엔진의 DOM과 접근 정책은 바뀔 수 있습니다. 이 앱은 브라우저 공개 검색 화면을 읽으며, 탐지를 피하기 위한 프록시 순환·지문 변경·CAPTCHA 자동 풀이 기능을 사용하지 않습니다. 브라우저 개발용 웹 UI에서는 자동 검색 창을 사용할 수 없으므로 설치형 Electron 앱을 실행하세요.

## 보조 가져오기

작업실의 접힌 CSV·텍스트·RSS·URL 영역을 사용합니다. CSV는 최대 5MB·1,000행·150열, UTF-8/EUC-KR/UTF-16 LE, 쉼표/탭/세미콜론을 지원합니다. 열 미리보기 후 본문 열을 지정하세요. 원래 열은 `original_column:` 접두어로 내보내기에 보존하고 위험한 수식 값에는 작은따옴표를 추가합니다. RSS는 피드에 제공된 내용을 스니펫으로 보존합니다. URL은 공개 HTTPS 주소만 직접 요청합니다.

## AI 키와 비용

[API 안내](docs/API.md)를 참고하세요. 검색 API 키나 Ncloud 결제수단은 필요하지 않습니다. 외부 AI 사용료는 제공자 정책에 따르며 ChatGPT/Gemini 앱 구독과 API는 별개입니다. API 없이도 가져오기·검토·내보내기를 사용할 수 있습니다. AI 모델 목록 조회는 인증 확인이며 생성 성공 보장은 아닙니다. 실제 요금은 제공자 콘솔에서 확인하세요. 이 버전은 토큰 수를 기록하지만 단가 미설정 시 비용을 계산하지 않습니다.

## 개발 및 검증

Electron 45 + React 19 + TypeScript + Node 24 SQLite. Node.js 24 이상이 필요합니다.

```sh
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:ui
npm run desktop
```

Linux CI에서는 로컬 HTTPS fixture를 이용한 Electron 검색 창 검증에 `STUDIO_DESKTOP_HEADLESS=1 npm run test:desktop`을 사용할 수 있습니다. 패키징은 `npm run package:mac` / `npm run package:win`입니다. 소스 ZIP은 설치 파일과 다릅니다.

자료는 로컬 SQLite에, 키는 지원되는 OS 암호화 저장소에 저장합니다. OS 암호화를 사용할 수 없으면 키는 세션 메모리에만 보관합니다. CSV/백업에는 키가 포함되지 않습니다. 파일 내용은 브라우저 localStorage에 저장하지 않습니다. 창을 닫으면 저장하지 않은 가져오기 입력은 사라집니다.
