# ZeroWaste Listening Studio 0.3.0

검색 API 키 없이 CSV·텍스트와 공개 RSS·URL을 가져오는 macOS/Windows 데스크톱 도구입니다. 기존 Liquid Glass 인터페이스를 유지합니다. GPT와 Gemini는 사용자가 선택한 행의 **한국어 번역·CSV 정리**에만 사용합니다.

## 설치

설치 파일 배포: https://github.com/sksmzldnl/research-crawler/releases/tag/studio-local-v0.3.0

- Apple Silicon Mac: `ZeroWaste-Listening-Studio-0.3.0-mac-arm64.dmg`
- Intel Mac: `ZeroWaste-Listening-Studio-0.3.0-mac-x64.dmg`
- Windows: `ZeroWaste-Listening-Studio-0.3.0-win-x64.exe`

Mac은 macOS 13 이상이 필요합니다. Mac 빌드는 ad-hoc 서명을 사용하며 Developer ID 공증은 없습니다. Apple Silicon 파일은 Intel Mac에서 교차 빌드하므로 Apple Silicon에서의 직접 실행 검증과 구분합니다. 빌드와 검증의 실제 완료 여부는 릴리스와 플랫폼별 `build.json`을 확인하세요.

## 사용 방법

1. **새 조사 → CSV 파일**: 파일을 선택하거나 CSV 내용을 붙여 넣고 `열 확인·미리보기`를 누릅니다. 본문 열을 지정하고 자료를 가져옵니다. UTF-8·EUC-KR/CP949·UTF-16 LE, 쉼표·세미콜론·탭을 지원합니다. 최대 5MB·1,000행·150열입니다. 헤더가 필요하며 잘못된 따옴표·중복 머리글·행별 열 개수 불일치는 오류로 알립니다.
2. **텍스트**: 붙여 넣은 텍스트 또는 TXT/MD 파일을 하나의 자료로 저장합니다.
3. **공개 RSS**: RSS/Atom HTTPS 주소를 한 줄에 하나씩 입력합니다. 최대 20개 주소, 1,000건입니다. 피드에 포함된 내용만 저장하며 전문으로 표시하지 않습니다.
4. **웹페이지 URL**: AI·수집 설정에서 원문 수집 허용 도메인을 먼저 등록합니다. robots.txt와 공개 HTML 본문을 확인합니다. 로그인·CAPTCHA·리디렉션·비공개 페이지를 우회하지 않으며 JavaScript 본문 수집은 지원하지 않습니다. 검색 결과 전체를 자동 탐색하지 않습니다.
5. **데이터 검토**: 검색·정렬·중복 표시와 수동 포함/제외는 로컬에서 처리합니다. 날짜가 없는 가져온 자료도 보존합니다.
6. **AI 선택 사용**: AI·수집 설정에서 GPT 또는 Gemini 키 등록 → 연결 테스트·모델 조회 → 외부 전송 동의 → 설정 저장. 검토 화면에서 행을 선택하고 `한국어 번역` 또는 `CSV 정리·요약·분류`를 실행합니다. 자동 수집 중에는 AI를 호출하지 않습니다. 완료한 행은 저장되며 실패한 행만 재선택해 재시도할 수 있습니다. 중지 버튼을 제공합니다.
7. **내보내기**: CSV/Excel, 전체·유효·제외 자료를 저장합니다. 원래 CSV의 모든 열과 값은 `original_column:` 접두어로 보존합니다. 중복 행도 삭제하지 않고 제외로 표시합니다. 모든 원본 행을 내보내려면 `전체 결과`를 선택하세요. 위험한 수식 앞에는 작은따옴표가 추가됩니다. 원본 CSV는 별도로 보관하세요.

검색 API와 Reddit OAuth는 이 버전에서 사용하지 않습니다. 이전 조사 자료는 보존하지만 이전 검색 API 조사를 재개하지 않습니다. 합성 데모 12건은 실제 사용자 경험의 증거가 아닙니다.

## AI 키와 비용

[API 안내](docs/API.md)를 참고하세요. 네이버·Kakao·Reddit 키나 Ncloud 결제수단은 필요하지 않습니다. 외부 AI 사용료는 제공자 정책에 따르며 ChatGPT/Gemini 앱 구독과 API는 별개입니다. API 없이도 가져오기·검토·내보내기를 사용할 수 있습니다. AI 모델 목록 조회는 인증 확인이며 생성 성공 보장은 아닙니다. 실제 요금은 제공자 콘솔에서 확인하세요. 이 버전은 토큰 수를 기록하지만 단가 미설정 시 비용을 계산하지 않습니다.

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

Linux CI에서는 Electron 확인에 `STUDIO_DESKTOP_HEADLESS=1 npm run test:desktop`을 사용할 수 있습니다. 패키징은 `npm run package:mac` / `npm run package:win`입니다. 소스 ZIP은 설치 파일과 다릅니다.

자료는 로컬 SQLite에, 키는 지원되는 OS 암호화 저장소에 저장합니다. OS 암호화를 사용할 수 없으면 키는 세션 메모리에만 보관합니다. CSV/백업에는 키가 포함되지 않습니다. 파일 내용은 브라우저 localStorage에 저장하지 않습니다. 창을 닫으면 저장하지 않은 가져오기 입력은 사라집니다.
