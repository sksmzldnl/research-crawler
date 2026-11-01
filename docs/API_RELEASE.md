# ZeroWaste Listening Studio 0.12.6 · 카페 팝업 경고와 댓글 버튼 구분

카페 댓글 수집 중 작성·로그인 버튼을 읽기 버튼으로 누를 수 있던 조건을 수정했습니다. ‘답글’만 표시된 버튼과 작성 폼·로그인 링크는 건너뛰며, ‘답글 2’, ‘답글 2개’, 댓글 더보기와 페이지 이동은 읽습니다. 댓글 완전성 판정도 같은 구분을 따릅니다.

숨겨진 공개 원문 수집 창은 네이티브 JavaScript 경고·확인창을 표시하지 않습니다. 확인·로그인 요청을 수락하지 않으며 새 창은 계속 차단합니다. 댓글 기능이 새 창을 요구하면 본문을 저장하고 댓글을 일부 수집 또는 확인 실패로 표시하며 사유를 화면과 파일에 남깁니다. 본문도 확인할 수 없으면 실패로 표시합니다. 네이버 로그인·가입·접근 제한을 해제하는 변경은 아닙니다.

미니멀 인터페이스, 네이버 블로그·카페·지식인, Reddit, 개별 MD/JSON 저장을 유지합니다.

[설치 파일](https://github.com/sksmzldnl/research-crawler/releases/tag/studio-api-v0.12.6)

- Windows: ZeroWaste-Listening-Studio-0.12.6-win-x64.exe
- Apple Silicon: ZeroWaste-Listening-Studio-0.12.6-mac-arm64.dmg
- Intel Mac: ZeroWaste-Listening-Studio-0.12.6-mac-x64.dmg
- 안내서: Original-Guide-0.12.6-KO.pdf

## 검증 범위

로컬 모의 페이지에서 작성·로그인 버튼 제외, 숫자가 표시된 답글 펼치기, 팝업 차단 경고가 발생한 뒤 본문 저장 지속, 로그인 확인 취소, 새 창 미생성, 댓글 확인 실패 사유의 연결 검사·JSON 표시를 검사합니다. 제공받은 https://cafe.naver.com/kotaxi/77998 의 주소 형태는 검사하되, 내용은 명시적 모의 자료입니다. 개발 환경의 네트워크 정책에 네이버가 없어 해당 실사이트를 직접 재현하지 못했습니다.

Mac은 ad-hoc 서명이며 Developer ID 공증이 없습니다. Apple Silicon 패키지·소스·서명은 확인하지만 ARM64 실기기 실행은 미검증입니다.
