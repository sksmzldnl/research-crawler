# ZeroWaste Listening Studio 0.5.0 · 공식 검색 API 버전

기존 통합 작업실과 Liquid Glass 디자인을 유지하고, 브라우저 검색 화면 수집을 공식 API 요청으로 교체했습니다. 메뉴는 수집 작업실 / 설정 두 개입니다.

- 선택한 엔진과 쿼리 번들로 자동 검색, 제공자 페이지·커서 순회, 논리식·광고·날짜·중복 필터, 일시정지·현재 위치 재개.
- 네이버: 콘솔에서 확인한 검색 요청 URL과 두 가지 인증 형식(X-Naver Client 또는 Ncloud API Gateway)을 설정합니다. Hub의 URL이나 계약을 임의로 추정하지 않습니다. 해당 상품이 다른 서명을 요구하면 추가 연동이 필요합니다. 기존 NAVER Search API 키를 보유한 계정용 주소는 별도 도움말에 있습니다.
- 다음(Kakao): 웹·블로그·카페 REST 검색. Brave: 웹 검색과 Reddit 등 도메인 제한 검색.
- Google: 기존 Custom Search JSON API 사용 권한이 있는 계정만 연결합니다. 공식 문서상 신규 고객에게 제공되지 않으며 전환 기한은 2027-01-01입니다. 키·cx와 기존 사용 권한 확인이 필요합니다.
- Reddit: API 사용 승인을 받은 installed app만 OAuth로 연결합니다. 게시글 및 선택 시 게시글당 최대 25개 반환 댓글을 수집합니다. 삭제·비공개·더 보기 댓글을 우회하지 않습니다. 삭제 상태 동기화와 연결 해제를 제공합니다.
- Google 사용 권한/Reddit 승인이 없는 새 사용자는 다음·Brave 등 연결 가능한 API를 이용하세요. Brave의 site:reddit.com은 색인된 공개 링크·검색 요약이며 Reddit API의 원문·댓글 수집과 다릅니다.
- GPT·Gemini는 선택 행 번역·CSV 정리에만 사용합니다. 수집 중 AI를 호출하지 않습니다.

설정에서 키 등록 → 연결 정보 저장·연결 테스트 → 작업실에서 엔진·번들 선택 → 자동 검색·수집 시작. API 키는 OS 암호화 저장소에 보관하고 CSV/백업에 넣지 않습니다. API 한도·요금은 제공자 계정에 따릅니다. 연결 테스트도 실제 API 요청을 사용합니다.

검증은 응답 fixture로 API 인증 헤더·요청 URL·페이지/after 커서·스키마·오류·OAuth state·토큰 갱신을 검사합니다. 실제 Electron 앱에서 키 등록, 연결 테스트, 2페이지 자동 수집, 401 일시정지와 저장된 위치 재개, CSV 보존을 확인합니다. fixture 전송은 독립 테스트 데이터 디렉터리와 명시적 테스트 플래그가 모두 있는 실행에서만 활성화되며, 일반 실행은 실제 네트워크를 사용합니다. 실제 사용자 키·API Hub 계약·OAuth 승인으로 하는 실서비스 호출은 미검증입니다.

Apple Silicon Mac: ZeroWaste-Listening-Studio-0.5.0-mac-arm64.dmg
Intel Mac: ZeroWaste-Listening-Studio-0.5.0-mac-x64.dmg
Windows: ZeroWaste-Listening-Studio-0.5.0-win-x64.exe

macOS 13 이상. Mac은 ad-hoc 서명이며 Developer ID 공증이 없습니다. ARM64 파일은 Intel Mac에서 교차 빌드하고 코드·아키텍처·서명 무결성을 확인합니다. Apple Silicon 실기기 실행은 미검증입니다. 기존 조사·CSV 자료는 유지되지만 이전 브라우저 수집은 API 커서로 재개하지 않으며 새 수집으로 시작합니다.
