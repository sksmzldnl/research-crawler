# ZeroWaste Listening Studio

제로웨이스트 소비자 경험을 조사하는 한국어 데스크톱 연구 도구입니다. **Electron 45 + React 19 + TypeScript + Node.js 내장 SQLite**로 구현했습니다. Python 워커나 별도 DB 서버가 필요하지 않습니다. macOS·Windows는 동일한 소스로 빌드합니다.

## 먼저 알아두세요

- API 키 없이 **합성 데모 12건**으로 모든 주요 화면과 조사·필터·저장·검토·내보내기를 체험할 수 있습니다. 실제 경험의 연구 근거로 쓰면 안 됩니다.
- 실제 수집은 네이버/다음 공식 검색 API, 승인된 Reddit Data API, 사용 권한이 있는 RSS를 사용합니다. Google/Bing 검색은 구현하지 않았으며 연결 성공으로 표시하지 않습니다.
- 실제 API 인증·과금·최신 제공 정책과 macOS/Windows 설치는 이 Linux 개발 환경에서 **미검증**입니다. [검증 보고서](docs/VALIDATION.md)를 확인하세요.
- 목표 1~1,000건은 필터 통과 수량이며 확보를 보장하지 않습니다. 부족 원인은 조사 기록에 남습니다.

## 비개발자용 설치와 첫 실행

GitHub Actions의 **ZeroWaste Listening Studio downloads**는 Apple Silicon Mac·Intel Mac·Windows x64에서 각각 설치 파일을 빌드하고, 패키징한 앱의 데모를 검사한 뒤 GitHub Releases에 게시하도록 준비했습니다. **현재 이 Electron 프로젝트의 원격 업로드·OS별 빌드·배포는 아직 실행하지 않았습니다.**

파일 이름은 `ZeroWaste-Listening-Studio-0.1.0-mac-arm64.dmg`, `…-mac-x64.dmg`, `…-win-x64.exe` 형태입니다. `ZeroWasteListener`라는 별도 Python/Qt 배포본과 혼동하지 마세요. 소스 ZIP과 설치 파일은 다릅니다. 자세한 구분은 [배포 안내](docs/RELEASE_NOTES.md)를 확인하세요.

### macOS

1. 자신의 Mac에 맞는 arm64(Apple Silicon) 또는 x64(Intel) `.dmg`를 내려받습니다.
2. DMG를 열고 `.app`을 응용 프로그램 폴더로 옮깁니다.
3. 앱 실행 → 새 조사 → 데모로 체험하기 → 데모 조사 시작.
4. API 설정에서 공식 발급 안내를 보고 키를 연결합니다.

서명·공증이 없는 테스트 빌드는 Gatekeeper 경고가 발생할 수 있습니다. 정식 배포 전 Apple Developer 인증서와 공증을 구성해야 합니다. 경고를 일괄 해제하거나 운영체제 보안을 끄는 스크립트는 제공하지 않습니다.

### Windows

1. `ZeroWaste-Listening-Studio-0.1.0-win-x64.exe`를 내려받아 실행합니다.
2. 설치 위치를 선택하고 앱을 실행합니다. 관리자 권한이 꼭 필요한 전역 설치를 강제하지 않습니다.
3. 데모로 확인한 뒤 API 설정에서 키를 입력합니다.

서명 없는 빌드에는 SmartScreen/백신 경고가 발생할 수 있습니다. 정식 배포는 신뢰할 수 있는 코드 서명이 필요합니다. 현재 Windows는 NSIS `.exe` 대상이며 **MSI 대상은 제공하지 않습니다**. Windows 설치 파일은 Windows CI에서 빌드합니다.

설치 파일을 아직 받지 못한 소스 이용자는 Node.js 24 이상 설치 후 Mac의 `시작-mac.command` 또는 Windows의 `시작-Windows.cmd`를 실행하면 의존성 설치·빌드·테스트·실행을 자동 진행할 수 있습니다. 이 경로는 인터넷이 필요합니다.

## 사용 흐름

1. **쿼리 번들**: 이름·우선순위·Boolean 논리식·제외어를 저장합니다. 수동 키워드/괄호 OR 그룹을 추가하고 문법 검사로 실제 요청 검색어를 확인합니다.
2. **API 설정**: 키를 등록하고 연결을 테스트합니다. 키는 채팅에 입력하지 않습니다. AI 제안은 승인하기 전 검색식에 들어가지 않습니다.
3. **새 조사**: 데모/실제 모드, 번들, 소스, 게시 기간, 목표 수량, 필터, AI 모델을 선택합니다. 설정은 자동 임시 저장되며 키는 임시 저장하지 않습니다.
4. **조사 기록**: 검색 → 원문 확보 → 날짜·품질 필터 → 중복 제거 → AI 처리 → 저장을 표시합니다. 일시정지/재개/중지를 지원합니다. 검색 작업 진행률과 목표 수량 확보율은 별개입니다.
5. **데이터 검토**: 원문/번역/근거를 비교하고 수동 포함·제외합니다. 제외 자료도 보존합니다.
6. **내보내기**: 전체/유효/제외/번들별 CSV 또는 XLSX를 원하는 위치에 저장합니다. CSV는 기본 UTF-8 BOM, 표준 인용, 수식 주입 방어를 적용합니다. 필수 32열과 모드·댓글 관계·발견 경로·제외 근거 등을 제공합니다.

자세한 API 발급·제약·비용은 [API 안내](docs/API.md), 동작과 보안 범위는 [구조 및 제한사항](docs/ARCHITECTURE.md)에 있습니다. 앱 도움말에도 한국어 안내가 들어 있습니다.

## 개발 환경

필수: Node.js **24 이상**, npm, 의존성 다운로드용 인터넷. Linux 데스크톱 실행에는 GTK/NSS/X11 또는 지원되는 디스플레이 환경이 필요합니다. 웹 개발·테스트에는 OS 보안 저장소를 사용하지 않으며 키는 세션 메모리에만 저장합니다.

```sh
npm ci
npm run dev          # 로컬 전용 API + React 개발 서버
npm run desktop      # 프로덕션 빌드 후 Electron 실행
npm run build
npm test             # 실제 외부 호출 없는 단위/통합 테스트
npm run test:ui      # Playwright Chromium으로 GUI 흐름 검사
npm run test:desktop # Electron preload/IPC/SQLite 실제 데모 검사
```

Playwright 브라우저는 `npx playwright install chromium`으로 설치하거나 Linux에서 `CHROMIUM_PATH=/usr/bin/chromium npm run test:ui`로 이미 설치된 Chromium을 사용할 수 있습니다. 로컬 개발 서버는 127.0.0.1만 바인딩합니다. 공개 서버로 배포하지 마세요.

```sh
npm run package:mac -- --x64 --arm64   # macOS에서 .app/.dmg/.zip
npm run package:win -- --x64 --arm64   # Windows에서 NSIS .exe
npm run package:linux                # 개발 검증용 unpacked Linux 앱
```

실제 한국어 검색 엔진 + AI 통합 검사는 `npm run test:live`입니다. 개발자 전용이며 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `STUDIO_OPENAI_KEY`, `STUDIO_AI_MODEL`이 필요합니다. 값 없이 실행하면 `SKIPPED / 미검증`과 종료 코드 2를 출력합니다. 키 값을 로그에 출력하지 않습니다. 실제 호출·과금과 개인정보의 외부 전송이 발생합니다. 일반 사용자는 앱에서 키를 입력하고 실제 조사를 실행하면 됩니다.

## 프로젝트 구조

```text
src/                    한국어 UI, 접근성, 입력 임시 저장
core/query.ts           Boolean 파서, 분할 검색 계획, 로컬 필터
core/connectors.ts      네이버·다음·Reddit·RSS
core/engine.ts          수집/정제/분석, 체크포인트, 중단·재개
core/store.ts           SQLite 저장, 복원, 백업
core/ai.ts              GPT/Gemini 구조화 응답, 검증, 청크 처리
core/network.ts         프록시 지원, 타임아웃, Retry-After, 백오프
core/extract.ts         허용 도메인·robots 확인, Readability 원문 추출
core/export.ts          32필수열 CSV/XLSX, 수식 주입 방어
core/vault.ts           OS 암호화 키 저장 / 메모리 대체
desktop/                Electron 프로토콜·IPC·저장 대화상자
server/                 로컬 개발용 API (배포용 아님)
tests/                  단위, 통합, 실제 브라우저 테스트
scripts/                설치 자동화, 빌드, 실제 API 검사
.github/workflows/      OS별 패키징, 빌드·테스트 CI
```

## 데이터와 안전

앱 데이터는 Electron `userData` 아래 `studio.sqlite`, 키는 `credentials.enc`에 저장됩니다. Mac은 Keychain 기반 Electron safeStorage, Windows는 사용자 DPAPI를 사용합니다. Linux `basic_text`는 보안 저장으로 취급하지 않습니다. 키는 renderer로 되돌려 보내지 않으며 CSV·DB 백업에 포함하지 않습니다. OS 암호화 저장을 쓸 수 없으면 메모리만 사용하고 UI에서 알립니다.

연구 DB·백업은 암호화되지 않습니다. 디스크 암호화와 적절한 파일 관리를 권장합니다. 작성자 필드는 수집하지 않으며 이메일/한국 휴대전화 형식은 마스킹하지만 자유 문장의 모든 식별정보 제거는 보장하지 않습니다. API 설정에서 기간 지난 자료 삭제·Reddit 삭제 상태 동기화·전체 자료/키 삭제를 실행할 수 있습니다. CSV·백업의 사본은 별도로 삭제해야 합니다.

CAPTCHA·로그인 우회, IP 회전, 지문 위조는 구현하지 않습니다. 원문 권한을 확인하지 않은 도메인은 스니펫만 저장합니다. AI는 사용자 동의 후 텍스트만 처리하며, 번역과 요약은 별도 저장합니다. 출처와 근거를 사람이 검토해야 합니다.
