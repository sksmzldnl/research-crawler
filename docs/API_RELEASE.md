# ZeroWaste Listening Studio 0.12.7 · 네이버 검색 대상 구분

블로그 연결 확인에서 검색 첫 결과가 티스토리여도 그대로 원문 검사 대상으로 쓰던 문제를 수정했습니다. 네이버 블로그 검색 API는 외부 블로그도 반환할 수 있지만, 이 앱의 원문 수집기는 네이버 주소를 지원하므로 검색 후보를 먼저 구분해야 합니다.

- 블로그는 blog.naver.com·m.blog.naver.com, 카페는 cafe.naver.com·m.cafe.naver.com, 지식인은 kin.naver.com·m.kin.naver.com 주소만 해당 검색 종류로 반환합니다. 외부·위장 호스트·인증정보 포함 URL은 제외합니다.
- 연결 확인은 20개씩 최대 3페이지에서 지원 후보를 찾고 최대 3개 원문을 시도합니다. 지원 후보가 없으면 원문은 미실행으로 표시하고 이유를 남깁니다. Reddit 확인 방식은 유지합니다.
- 작업실에도 같은 후보 구분을 적용합니다. 제외된 외부 블로그를 원문 수집 실패 자료로 만들지 않습니다.
- 다음 페이지는 API가 반환한 원래 결과 창의 크기로 계산합니다. 외부 주소만 있는 페이지에서도 다음 검색 페이지로 이어갈 수 있습니다.
- 기존 미니멀 UI, 카페 팝업 경고 처리, 원문·댓글·MD/JSON 저장을 유지합니다.

[설치 파일](https://github.com/sksmzldnl/research-crawler/releases/tag/studio-api-v0.12.7)

- Windows: ZeroWaste-Listening-Studio-0.12.7-win-x64.exe
- Apple Silicon: ZeroWaste-Listening-Studio-0.12.7-mac-arm64.dmg
- Intel Mac: ZeroWaste-Listening-Studio-0.12.7-mac-x64.dmg
- 안내서: Original-Guide-0.12.7-KO.pdf

## 검증 범위

보고된 https://dwqn.tistory.com/189 를 첫 결과로 넣은 모의 API 응답에서, 외부 URL을 열지 않고 네이버 글을 확인·수집·저장하는지 검사합니다. 외부 주소만 있는 페이지의 재개 커서, 탐색 횟수 제한, 잘못된 호스트·검색 종류도 검증합니다. 실제 서비스 계정으로 API를 호출한 검증은 포함하지 않습니다.

Mac은 ad-hoc 서명이며 Developer ID 공증이 없습니다. Apple Silicon 패키지·소스·서명은 확인하지만 ARM64 실기기 실행은 미검증입니다.
