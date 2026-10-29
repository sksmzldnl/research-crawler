# ZeroWaste Listening Studio 0.9.1 · 카페 MS949 오류 수정

카페 원문 수집의 `The "MS949" encoding is not supported` 오류를 수정합니다. 사용자가 로그인하지 않은 시크릿 창에서도 본문이 보인다고 확인한 사례입니다. API 키나 회원 권한 변경이 필요한 수정은 아닙니다.

- Node TextDecoder에 그대로 전달하던 MS949·CP949·한국어 웹 인코딩을 CP949 전용 디코더로 처리.
- EUC-KR 별칭 변경만으로 누락될 수 있는 확장 한글도 보존.
- 따옴표·공백이 있는 HTTP charset과 HTML meta 선언 처리. Unicode BOM 우선, 유효한 HTTP charset → meta → UTF-8 순서.
- 기존 블로그·카페·지식인 검색, 원문/게시일 연결 확인, 개별 MD/JSON 저장과 UI 유지.

## 다운로드 및 적용

[설치 파일](https://github.com/sksmzldnl/research-crawler/releases/tag/studio-api-v0.9.1)

- Apple Silicon Mac: `ZeroWaste-Listening-Studio-0.9.1-mac-arm64.dmg`
- Intel Mac: `ZeroWaste-Listening-Studio-0.9.1-mac-x64.dmg`
- Windows x64: `ZeroWaste-Listening-Studio-0.9.1-win-x64.exe`
- 설치·사용 안내: `Original-Guide-0.9.1-KO.pdf`

기존 앱을 종료한 뒤 교체합니다. 저장한 네이버 키와 기록은 유지됩니다. 같은 저장 폴더를 다시 선택하고 실패한 자료 상세에서 ‘원문 다시 읽기’를 누르거나 새 수집을 시작하세요. 설정 → 원문 주소 확인에서 해당 카페 글을 재검사할 수도 있습니다.

macOS 13 이상. Mac은 ad-hoc 서명·Developer ID 공증 없음, Windows는 서명되지 않은 설치 파일입니다.

## 검증 범위

기존 코드로 사용자 오류를 재현하고, Python 표준 cp949 코덱으로 독립 생성한 실제 MS949 바이트 fixture로 회귀 검사합니다. 확장 한글·본문 마지막 문단·게시일 추출, UTF-8 MD/JSON 저장을 확인합니다.

Electron 소스와 설치 패키지 검사에서 HTTP `charset=MS949` + 실제 CP949 바이트를 받아 연결 확인 → 원문/날짜 추출 → 개별 파일 저장까지 실행합니다. 브라우저 재시도로 성공을 대신하지 않았는지도 검사합니다. 이 검사는 패키지에 필요한 인코딩 테이블이 실제로 포함됐는지도 검증합니다.

제보한 실제 사이트 응답 자체는 개발 클라우드의 네이버 접속 제한으로 직접 확인하지 못했습니다. 테스트는 실제 글 내용이 아닌 동일 오류 조건을 재현한 데이터입니다. Windows·Intel Mac에서 패키지를 실행하며, Mac ARM64는 빌드·바이너리·서명·코드 일치 검사입니다. M 시리즈 실기기 실행은 미검증입니다.
