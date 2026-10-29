# ZeroWaste Listening Studio 0.9.3 · 해시태그 단어 제거

작업실의 광고 제거 옆에 **해시태그 단어 제거** 체크박스를 추가했습니다. 켜면 `#제로웨이스트`처럼 해시태그로 쓰인 단어 전체를 본문에서 제거하고, 검색 조건을 검사한 뒤 MD·JSON에 저장합니다. 같은 단어가 일반 문장에 있으면 유지합니다.

기본은 꺼짐입니다. 선택은 앱을 다시 열어도 유지되며 **새 수집에 적용**됩니다. 수집 재개와 ‘원문 다시 읽기’는 해당 수집을 시작할 때의 선택을 따릅니다. 이미 저장한 파일은 바꾸지 않습니다. 블로그·카페·지식인과 동적 페이지·카페 게시글 JSON 응답에 동일하게 적용합니다. Markdown 제목, 일반 링크의 URL 조각, C#와 코드 블록은 유지합니다.

[설치 파일](https://github.com/sksmzldnl/research-crawler/releases/tag/studio-api-v0.9.3)

- Apple Silicon: `ZeroWaste-Listening-Studio-0.9.3-mac-arm64.dmg`
- Intel Mac: `ZeroWaste-Listening-Studio-0.9.3-mac-x64.dmg`
- Windows x64: `ZeroWaste-Listening-Studio-0.9.3-win-x64.exe`
- 사용 안내: `Original-Guide-0.9.3-KO.pdf`

앱을 종료하고 새 버전으로 교체합니다. 저장한 네이버 키와 기록은 유지됩니다. 작업실에서 같은 저장 폴더를 다시 선택하고 원하는 옵션으로 새 수집을 시작하세요.

## 검증

단위 검사에서 한글·영문·밑줄·연속 태그, 링크 내부 태그, 같은 단어의 일반 문장 유지, Markdown 제목·일반 URL·코드 보존, 카페 JSON·블로그 프레임·지식인 질문과 답변, 필터 적용 순서, MD·JSON 파일 저장 및 원문 다시 읽기를 확인합니다. UI 검사에서 체크박스와 새로고침 후 선택 유지 및 작은 화면 레이아웃을 확인합니다.

Electron의 실제 폴더 선택과 IPC를 사용해 기본 상태의 MD·JSON에는 태그가 보존되고, 체크 후에는 본문과 파일에서 제거되는 것을 검증합니다. 동적 페이지, 카페 JSON, 지식인 질문·답변 및 원문 다시 읽기도 확인합니다. 기존 카페 MS949/CP949 원문·확장 한글·게시일, 지식인 질문 작성일과 연결 확인 회귀 검사도 유지합니다. 모든 네트워크 응답은 격리 fixture이며 실제 계정 키를 사용하지 않습니다.

실제 네이버 페이지·계정/API를 이용한 이번 변경의 실수집 및 Apple Silicon 실기기 실행 검증은 수행하지 않았습니다. Apple Silicon 설치 파일은 ARM64 실행 파일·소스 일치·서명 무결성을 검사하고, Intel Mac과 Windows는 설치 패키지의 실행 경로까지 검사합니다. Mac은 ad-hoc 서명이며 Apple Developer ID 서명·공증은 포함하지 않습니다.
