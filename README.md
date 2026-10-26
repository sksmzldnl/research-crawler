# 새로듣기 · Zero Waste Listener

제로웨이스트 생활을 지향하는 소비자의 공개 경험을 조사하는 한국어 데스크톱 프로그램입니다. Python / Qt로 같은 소스를 Mac과 Windows에서 실행하고 각 OS에서 독립 실행 패키지를 만듭니다. Python 설치가 필요한 **소스 실행**과, Python을 포함하는 **배포 패키지**를 구분하세요.

## Mac 앱 설치 (Python 설치 불필요)

Mac용 Python·Qt 바이너리를 포함한 `.app` 테스트 배포본을 제공합니다.

1. Apple Silicon(M 시리즈)은 `ZeroWasteListener-0.1.0-macOS-arm64-test.zip`, Intel Mac은 `ZeroWasteListener-0.1.0-macOS-x86_64-test.zip`을 받습니다.
2. Finder에서 압축을 풀고 `ZeroWasteListener.app`을 **응용 프로그램(Applications)** 폴더로 드래그합니다.
3. 복사한 앱을 더블클릭합니다. Python 설치나 터미널 명령은 필요하지 않습니다.
4. 먼저 시연 모드로 사용해 본 뒤, API 연결 설정에 선택한 검색 엔진과 AI의 키를 입력합니다.

최소 macOS 12 이상 대상입니다. 이 파일은 **실제 Mac에서의 실행·설치 검증과 Developer ID 서명·공증이 아직 완료되지 않은 테스트 배포본**입니다. Linux에서 Mac 바이너리 종류·아키텍처, 배포 구조, 체크섬, 압축 무결성을 검사했습니다. 이는 실제 Mac 실행 성공을 의미하지 않습니다. macOS 보안 경고가 나타나면 출처를 확인하고 [Apple 공식 안내](https://support.apple.com/ko-kr/102445)에 따라 판단하세요. 보안 기능을 끄지 마세요.

실행 로그는 `~/Library/Logs/ZeroWasteListener/app.log`에 남습니다. API 키 저장은 선택 사항이며 앱 삭제만으로 macOS 키체인에 저장한 키가 삭제되지는 않습니다. 상세 설치·제거 안내는 ZIP의 `설치 안내.txt`에 있습니다.

Mac `.app` ZIP은 Mac용 바이너리를 조합하므로 Linux에서도 다음 명령으로 재현할 수 있습니다:

```sh
uv run --frozen --extra dev python scripts/build_mac_bundle.py --arch all
```

`uv.lock`의 의존성과 해시를 사용해 Mac wheel만 설치하고, `packaging/mac_runtime.json`에 고정한 공식 python-build-standalone 배포본을 체크섬 검증 후 포함합니다. 실행 파일·심볼릭 링크 권한을 보존하며, Linux 실행 바이너리가 섞여 있거나 필수 Mac 파일이 없으면 실패합니다. 외부 Python이나 추가 다운로드에 의존하지 않습니다. 생성 폴더의 `Contents/Resources/build-info.json`에 정적 검증 결과와 실제 Mac 실행이 미실시라는 상태를 남깁니다.

## 제공하는 기능

- 한 줄에 하나씩 입력하는 쿼리 번들: `AND`, `OR`, 괄호, `"zero waste"` 같은 구문. AND 우선, 대소문자 무관 연산자. 검색 결과를 정규화된 문자열 포함 여부로 다시 검증합니다.
- 네이버 블로그 / 다음 블로그 / Reddit 공개 게시물 선택. 엔진별 공식 API·페이지네이션을 사용하고 엔진·쿼리를 교대로 처리합니다.
- 제외어, 광고 단서 제외, URL·동일 본문 중복 제거, 달력형 게시 기간, 1~1000개 목표 슬라이더와 숫자 입력.
- Gemini / GPT 중 하나로 확보한 원문 전체를 분할 번역하고 한국어 요약. API 키 입력·연결 확인. 오류와 불완전한 AI 출력은 성공으로 표시하지 않습니다.
- 실시간 검토 수·확보 수·진행 기록, 중단, 결과 상세 열람, UTF-8 BOM CSV 저장. 중단·번역 실패 시에도 이미 확보한 원문은 유지합니다.
- 모든 주요 기능의 `?` 도움말, 키보드 입력, 스크롤 가능한 설정, 읽기 전용 결과 표.
- API 없이 실행하는 **가상 자료 시연 모드**. 과제의 실제 조사 근거로 사용할 수 없으며 CSV에도 시연 표시를 남깁니다.

### CSV 열

검색 쿼리 번들, 원문에 포함된 쿼리, 한국어 요약, 원문 한국어 번역, 요약 전 원문, 검색 엔진, 원문 URL, 게시일, 제목, 원문 확보 범위, 번역 상태, 수집 시각(UTC), 광고 판정, 자료 구분의 14개 열입니다. 원문 열에는 제목과 확보한 본문을 함께 보존합니다. Excel 수식으로 해석할 수 있는 값에는 안전을 위해 작은따옴표를 붙입니다.

## 개발 환경에서 실행

Python 3.12와 [uv](https://docs.astral.sh/uv/getting-started/installation/)를 사용하세요. `uv.lock`에 모든 의존성과 해시가 고정되어 있습니다. Mac은 macOS 12 이상, Windows는 64비트 Windows 10/11을 대상으로 합니다. 지원 OS 범위의 실제 설치 검증은 별도로 필요합니다.

```sh
cd research-crawler
uv sync --frozen --extra dev
uv run --frozen --extra dev python -m zerowaste_listener
```

클라우드 환경에서는 uv 캐시를 쓰기 가능한 곳으로 지정합니다:

```sh
export UV_CACHE_DIR=/workspace/.cache/uv
cd /workspace/research-crawler
uv sync --frozen --extra dev
QT_QPA_PLATFORM=offscreen uv run --frozen --extra dev pytest -q
QT_QPA_PLATFORM=offscreen uv run --frozen --extra dev python -m zerowaste_listener --smoke-test /tmp/zerowaste-smoke
```

마지막 명령은 실제 Qt 창과 백그라운드 작업을 실행해 가상 자료 CSV, 화면 이미지, `report.json`을 생성하고 종료합니다. 실제 검색·AI 연결 성공을 의미하지 않습니다. 일반 데스크톱에서는 `QT_QPA_PLATFORM=offscreen`을 설정하지 마세요. 상시 서버나 데이터베이스는 필요하지 않습니다. 클라우드 작업은 이미 격리되어 있으므로 기존 체크아웃을 사용하고 별도 Git worktree를 만들지 않습니다.

## API 연결

앱의 **API 연결 설정**에서 선택할 검색 엔진과 번역 AI의 키를 입력하고 각각 연결을 확인하세요. 비밀번호를 채팅에 제공할 필요가 없습니다. 로그인 자동화·CAPTCHA 우회·프록시 회전 기능은 없습니다.

| 서비스 | 필요한 값 / 환경변수 | 발급 안내 |
| --- | --- | --- |
| 네이버 블로그 | `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | [네이버 개발자센터](https://developers.naver.com/docs/serviceapi/search/blog/blog.md), 검색 API 사용 신청 |
| 다음 블로그 | `KAKAO_REST_API_KEY` | [Kakao Developers](https://developers.kakao.com/docs/latest/ko/daum-search/dev-guide), 앱 REST API 키 |
| Reddit | `REDDIT_ACCESS_TOKEN`, `REDDIT_USER_AGENT` | [Reddit API](https://www.reddit.com/wiki/api/), 승인된 앱의 OAuth 액세스 토큰과 앱명/버전·계정 식별 User-Agent |
| Gemini | `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey), 모델 `gemini-2.5-flash` |
| GPT | `GPT_API_KEY` (또는 기존 `OPENAI_API_KEY`) | [OpenAI API](https://platform.openai.com/api-keys), 모델 `gpt-4o-mini` |

Reddit API 사용은 별도 승인이 필요할 수 있습니다. 이 앱은 발급된 Bearer 토큰을 사용하며 로그인 비밀번호나 refresh token을 보관하지 않습니다. 액세스 토큰이 만료되면 다시 발급해 교체하세요. API 요금·승인·한도·모델 접근은 각 제공자의 계정에 따릅니다. ChatGPT / Gemini 웹 구독과 API 과금은 별개입니다.

키는 기본적으로 프로세스 메모리에만 보관합니다. 선택하면 macOS Keychain / Windows Credential Manager 등 `keyring`의 OS 저장소를 사용합니다. 평문 파일 저장으로 대체하지 않습니다. 저장소가 없으면 경고 후 이번 실행에만 적용합니다. 공용 컴퓨터에서는 저장하지 말고, 저장했다면 설정창의 키 삭제를 사용하세요. 환경변수 값은 삭제 버튼으로 제거되지 않습니다. 배포 파일에 개인 키를 포함시키지 않습니다.

클라우드 환경의 비밀 값은 환경 설정에서 안전하게 입력하세요. OpenAI 접두어는 플랫폼에서 예약되어 있으므로 클라우드용 이름은 `GPT_API_KEY`를 사용합니다. 클라우드 프록시 설정을 유지하며 인증서·TLS 검증을 끄지 않습니다.

### 네트워크

필수 API 대상은 `openapi.naver.com`, `dapi.kakao.com`, `oauth.reddit.com`, `api.openai.com`, `generativelanguage.googleapis.com`입니다. 라이브 원문 확보에는 검색 결과의 해당 사이트도 허용되어야 합니다. 예: `blog.naver.com`, `m.blog.naver.com`, `*.tistory.com`, `www.reddit.com`. 클라우드에서 추가 원문 사이트가 정책에 막히면 해당 도메인만 환경 설정에 추가하세요. API-only 시연과 테스트는 이 접근 없이도 작동합니다.

## 조사 범위와 한계

- 공식 API를 사용하고 호스트별 최소 1초 간격, 429/502/503/504에 최대 3회 재시도, `Retry-After` 대기, 요청 취소를 지원합니다. 차단을 피하거나 전체 검색 결과를 보장하는 수단은 아닙니다. 401/403은 우회하지 않습니다.
- 네이버·다음 검색 API는 주로 제목·발췌문을 반환합니다. 공개 HTML은 robots.txt가 허용할 때만 읽어 본문을 추출합니다. 추출 본문은 메뉴·댓글·첨부파일을 제외할 수 있습니다. Reddit 텍스트 게시물은 API 본문을 보존합니다. 링크 게시물은 Reddit 제목과 접근 가능한 게시물 페이지 범위이며 외부 링크 전문까지 보장하지 않습니다.
- 로그인·유료·동적 페이지, robots 제한, 접근 실패는 **전문 미확보**로 남기고 발췌문을 보존합니다. CSV의 **원문 확보 범위**를 반드시 확인하세요. 전문만 필요한 연구는 발췌문 행을 제외해야 합니다. 확보한 범위를 넘어 전문을 복원하거나 만들어 내지 않습니다.
- 기간은 API 게시일 기준이며 게시일이 없으면 기간 필터 적용 시 제외합니다. Reddit 날짜는 UTC 기준입니다. 시작·종료일은 모두 포함합니다. 기간 필터를 끄면 게시일 미상 자료도 수집합니다.
- 수량은 필터 통과 후 전체 목표이며 보장 수량이 아닙니다. API의 조회 가능한 페이지 범위만 순회합니다(네이버 최대 10페이지, 다음 최대 50페이지, Reddit 최대 10페이지/각 조합). 오래된 글·비공개 글·전체 인터넷을 전수조사하지 않습니다.
- 광고는 공개 표기와 키워드로 판정하므로 누락·오탐이 있습니다. 중복은 추적 매개변수를 제외한 URL 또는 공백·대소문자를 정규화한 동일 본문 기준이며 의미 유사도 판정은 아닙니다. 여러 번들에 매칭되는 중복 자료는 먼저 매칭된 번들에 기록됩니다.
- 원문은 선택한 AI 제공자에게 전송됩니다. 연구자가 자료 이용 권한과 개인정보를 검토하고 AI 요약·번역을 원문과 대조해야 합니다. 대량 번역 전 1~5건으로 연결·비용을 확인하는 것을 권장합니다.

## Mac 우선 / Windows 설치 파일 빌드

PyInstaller와 DMG 생성은 대상 OS에서 실행해야 합니다. 위의 바이너리 조합 방식 `.app` ZIP 생성과 실제 Mac 실행 검증은 별개의 작업입니다. 다음 명령은 **빌드할 OS에서** 실행합니다:

```sh
uv sync --frozen --extra dev
uv run --frozen --extra dev pytest -q
uv run --frozen --extra dev python scripts/build.py
```

- **Mac:** `dist/ZeroWasteListener-0.1.0-Darwin-<아키텍처>.dmg`. 열어서 앱을 Applications로 복사합니다. 빌드한 Python의 아키텍처를 따릅니다. Apple Silicon / Intel은 각각 해당 Mac에서 별도 빌드해야 하며 universal 바이너리는 아닙니다.
- **Windows:** `dist/ZeroWasteListener-0.1.0-Windows-AMD64.zip`은 압축을 전부 풀고 `ZeroWasteListener.exe`를 실행합니다. 설치 마법사는 [Inno Setup 6](https://jrsoftware.org/isinfo.php)을 설치한 뒤 `ISCC.exe packaging/windows.iss`로 생성합니다. 결과는 `dist/ZeroWasteListener-0.1.0-Windows-Setup.exe`이며 관리자 권한 없이 사용자 계정에 설치합니다.
- 패키지에는 Python·Qt·의존성이 포함되어, 이용자 컴퓨터에 Python을 따로 설치할 필요가 없습니다. 네트워크와 각자의 API 키는 필요합니다.
- `.github/workflows/desktop.yml`은 기본적으로 Mac 테스트·DMG/앱 ZIP 빌드·패키지 시연 검증을 실행합니다. Mac의 LaunchServices를 통해 복사한 앱을 실제로 열고 UI·CSV를 확인하는 단계도 포함합니다. Windows는 수동 실행에서 `build_windows`를 선택한 경우에만 Mac 성공 후 빌드합니다. GitHub Actions에 반영해 실행하면 **Artifacts**에서 파일을 내려받아 공유할 수 있습니다. 이 작업이 자동으로 원격 저장소에 업로드되거나 실행되지는 않습니다.
- 배포 전 실제 Mac/Windows에서 설치·실행·라이브 API·CSV 저장을 확인해야 합니다. 현재 빌드는 배포자 서명/Apple 공증이 없으므로 운영체제에 미확인 개발자 경고가 나타날 수 있습니다. 널리 배포할 때는 Apple Developer ID 공증과 Windows 코드 서명을 별도 구성하세요. 보안 기능을 끄도록 안내하지 마세요.
- Qt/PySide6 등 포함 라이브러리의 라이선스 고지를 유지하세요. PyInstaller의 폴더형 배포는 라이브러리 파일을 함께 제공합니다. 배포물에는 `THIRD_PARTY_NOTICES.md`도 함께 전달하세요.

## 검증

`uv run --frozen --extra dev pytest -q`는 쿼리 문법, API 요청/페이지네이션, 전체 원문 분할 전송, 번역 실패 보존, 필터·중복, CSV 안전 처리, robots 제한, Qt 창에서의 시연·CSV 흐름을 검증합니다. 서비스 응답은 모의 응답이며 실계정의 라이브 인증 성공을 대신하지 않습니다.

빌드한 실행 파일은 다음으로 검증합니다:

```sh
# Linux (이 클라우드 환경)
python scripts/smoke_frozen.py dist/ZeroWasteListener/ZeroWasteListener
# Mac
python scripts/smoke_frozen.py dist/ZeroWasteListener.app/Contents/MacOS/ZeroWasteListener
# Windows
python scripts/smoke_frozen.py dist/ZeroWasteListener/ZeroWasteListener.exe
```

이 검증도 외부 API를 호출하지 않으며, 패키지에서 UI·작업 스레드·CSV·데이터 파일이 작동하는지를 확인합니다.
