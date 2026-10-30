# ZeroWaste Listening Studio 0.12.3 · 커뮤니티 연결 확인 수정

Mumsnet·MoneySavingExpert 연결 확인이 검색어 하나에서 글을 못 찾으면 원문 칸에 ‘자료 없음’을 표시하던 문제를 수정했습니다. 검색과 원문 검사를 구분하고, 실제 시도한 검색어와 확인한 글 주소를 결과 표에 표시합니다.

- 확인 검색어 reusable → cleaning → saving money 순서로 결과가 있을 때까지 시도합니다. 사용자가 작업실에 입력한 쿼리번들은 바꾸지 않습니다.
- 확인 검색에서 후보를 최대 3개 확보합니다. 첫 글이 삭제되거나 접근할 수 없으면 다른 후보를 확인하며, 사용자 확인이 필요한 보안·로그인 단계는 그대로 표시합니다.
- Google 결과의 h3 안쪽 링크·role=heading·main 영역과 리디렉션 링크를 읽습니다. 빈 결과는 잠시 안정화될 때까지 기다려 로딩 도중 결과가 없다고 끝내지 않습니다.
- 검색 후보가 없으면 검색은 ‘검색 결과 없음’, 원문은 ‘미실행’으로 표시합니다. 원문 추출 실패로 표시하지 않습니다.
- 기존 0.12.2의 가벼운 배경과 전환할 때만 나타나는 유리 토글을 유지합니다.

[설치 파일](https://github.com/sksmzldnl/research-crawler/releases/tag/studio-api-v0.12.3)

- Windows: ZeroWaste-Listening-Studio-0.12.3-win-x64.exe
- Apple Silicon: ZeroWaste-Listening-Studio-0.12.3-mac-arm64.dmg
- Intel Mac: ZeroWaste-Listening-Studio-0.12.3-mac-x64.dmg
- 안내서: Original-Guide-0.12.3-KO.pdf

## 검증 범위

단위·UI·설치 앱 테스트는 로컬 모의 페이지로 수행합니다. 첫 확인 검색이 비어 있는 경우의 대체 검색, 지연 표시되는 Google 결과, 레이아웃 변형, 삭제된 첫 후보, 확인 절차 중단, 원문·댓글·게시일·개별 MD/JSON 저장을 검증합니다. 개발 클라우드의 네트워크 정책으로 Google 및 두 커뮤니티의 실사이트는 직접 확인하지 못했습니다. 이번 변경이 모든 실사이트 원문 수집 문제를 해결했다고 보장하지 않습니다.

Mac은 ad-hoc 서명이며 Developer ID 공증이 없습니다. Apple Silicon 패키지·소스·서명은 확인하지만 ARM64 실기기 실행은 미검증입니다.
