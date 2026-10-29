# ZeroWaste Listening Studio 0.10.0 · 원문 다음에 댓글·답글 저장

이전 버전은 게시글 본문만 저장했습니다. 이제 네이버 블로그·카페·지식인과 Reddit 글의 원문 아래에 댓글·답글을 이어 붙여 **글 하나당 MD 또는 JSON 파일 하나**로 저장합니다. 요약하지 않으며 작성자·작성시각과 답글 관계를 보존합니다.

- 네이버 공개 댓글 DOM과 페이지가 정상 요청한 JSON/JSONP 응답을 읽습니다. 답글 펼치기·더 보기·번호 페이지를 처리하고 중복을 제거합니다.
- Reddit은 기존 작업실에 통합했습니다. Google 검색은 SerpApi, 본문·댓글은 승인된 Reddit 공식 API 앱의 읽기 전용 OAuth와 추가 댓글 요청을 사용합니다. 네이버 인증정보는 기존대로 유지합니다.
- JSON의 body/body_markdown에도 원문 뒤 댓글을 이어 붙입니다. post_body/post_markdown과 comments 목록·parentId도 보존합니다.
- 댓글 총수를 확인할 수 없거나 추가 로딩·한도·권한 문제로 끝까지 읽지 못하면 일부/확인 실패 상태와 사유를 표시합니다. 본문은 보존합니다. 댓글 확인 필요 필터와 원문 다시 읽기를 제공합니다.
- 기존 해시태그 선택·광고 제거·게시일·MS949/CP949 처리·MD/JSON 개별 저장과 두 개 메뉴를 유지합니다. AI 기능은 추가하지 않습니다.

[설치 파일](https://github.com/sksmzldnl/research-crawler/releases/tag/studio-api-v0.10.0)

- Apple Silicon: ZeroWaste-Listening-Studio-0.10.0-mac-arm64.dmg
- Intel Mac: ZeroWaste-Listening-Studio-0.10.0-mac-x64.dmg
- Windows: ZeroWaste-Listening-Studio-0.10.0-win-x64.exe
- 설치·네이버·SerpApi·Reddit 인증 안내: Original-Guide-0.10.0-KO.pdf

앱을 종료하고 교체한 뒤 같은 저장 폴더를 다시 지정합니다. 새 수집 또는 기존 자료의 원문 다시 읽기로 댓글을 추가합니다. 기존 파일은 덮어쓰지 않습니다. Reddit은 SerpApi 키와 승인된 Reddit script/web 앱의 Client ID·Client Secret이 필요하며, 사용자 계정의 실제 승인·요금·한도는 별도로 확인해야 합니다. 키가 없는 상태를 연결 성공으로 표시하지 않습니다.

## 검증 범위

단위 검사에서 원문/댓글 순서, 답글 관계, 댓글 날짜의 게시일 오인 방지, 번호 페이지·JSON/JSONP 병합, 댓글 0개/일부/미확인 구분, 한도, 해시태그·URL·코드 보존, 검색 필터에 생성된 제목/오류문을 사용하지 않는 동작, Google 결과 도메인·중복 필터, Reddit 읽기 전용 OAuth·추가 댓글·실패·링크 글을 확인합니다.

Electron에서 실제 IPC·SQLite·폴더 선택 경로로 네이버 본문+댓글+답글의 10개 MD/JSON 저장, 동적 댓글 더 보기·답글 펼치기·번호 페이지 전환, 카페 공개 JSON, 지식인 댓글, Reddit Google 검색→OAuth→추가 댓글→MD/JSON 한 파일 저장과 연결 확인을 검증합니다. Mac/Windows는 설치 패키지 실행 경로에서도 검사합니다. 네트워크 응답은 모두 격리 fixture입니다.

현재 개발 클라우드의 목적지 제한으로 실제 네이버/Reddit 사이트와 실제 계정·API 키 실수집은 검증하지 못했습니다. Apple Silicon은 ARM64 파일·패키지 소스·서명 무결성을 검사하며 실기기 실행은 미검증입니다. Mac은 ad-hoc 서명이고 Developer ID 공증은 없습니다. 공개되지 않거나 삭제된 본문·댓글은 복구하지 않습니다. 댓글 수집은 글당 최대 5,000개, 네이버 최대 120초/읽기 동작 100회, Reddit 추가 요청 100회이며 한도에 도달하면 미완료로 표시합니다.
