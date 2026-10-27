# ZeroWaste Listening Studio 0.5.2 · 네이버 API Hub 자동 연결

0.5.1에서 키 저장만 가능했던 신규 네이버 API Hub를 자동 검색·수집에 연결했습니다. Client ID·Client Secret을 등록하고 블로그·카페글·웹문서를 고르면 앱이 Hub 요청 주소와 인증 헤더를 자동으로 적용합니다. URL이나 인증 방식을 따로 입력하지 않습니다.

- 설정 저장·연결 테스트를 활성화하고 작업실에서 네이버를 선택할 수 있게 했습니다.
- 선택한 쿼리 번들의 검색어와 다음 페이지를 자동 요청하며 논리식·광고·날짜·중복 필터, 일시정지·재개, 결과 내보내기를 유지합니다.
- 키나 검색 종류를 변경하면 이전 연결 테스트 표시를 지웁니다. 기존 키·수집 기록과 Developers 검색 키용 옵션을 보존합니다.
- 기존 Liquid Glass 디자인과 수집 작업실 / 설정 두 메뉴를 유지합니다. GPT·Gemini는 선택 행 번역·CSV 정리에만 사용합니다.

## 설치 후 연결

1. 설정 → 네이버 API Hub에서 콘솔 Application의 Client ID와 Client Secret을 각각 등록합니다.
2. 콘솔에서 신청한 검색 종류를 선택하고 설정 저장·연결 테스트를 누릅니다.
3. 수집 작업실에서 네이버를 선택하고, 사용하지 않는 다른 엔진은 해제한 뒤 번들을 실행합니다.

## 다운로드

- Apple Silicon Mac: `ZeroWaste-Listening-Studio-0.5.2-mac-arm64.dmg`
- Intel Mac: `ZeroWaste-Listening-Studio-0.5.2-mac-x64.dmg`
- Windows: `ZeroWaste-Listening-Studio-0.5.2-win-x64.exe`

기존 앱을 종료한 뒤 설치 파일로 앱을 교체합니다. Mac은 macOS 13 이상이 필요하며 ad-hoc 서명으로 제공되고 Developer ID 공증은 없습니다.

## 검증 범위

단위 테스트 68개, 화면 테스트 5개, Electron의 Hub 연결·쿼리 번들 수집·start=1/101·광고 제외·401 후 재개·CSV 보존을 모의 응답으로 검사합니다. Intel Mac·Windows의 패키징된 앱도 같은 통합 검사를 실행합니다. ARM64 파일은 교차 빌드하고 실제 앱 코드·화면·아키텍처·서명·체크섬을 확인합니다. Apple Silicon 실기기 실행은 미검증입니다.

Hub 주소·요청 규격은 공식 인증 안내와 독립된 공개 클라이언트 세 곳을 교차 확인해 구현했습니다. 실제 사용자 키를 사용한 API 호출·상품 승인·할당량·청구는 이 환경에서 검증하지 않았습니다. 일반 설치 앱은 실제 네트워크로 요청하며, 설정의 연결 테스트로 자신의 키를 확인할 수 있습니다. [요청 규격과 확인 근거](NAVER_API_HUB.md)를 참조하세요.
