# 0.5.0 API 연결 안내

모든 키는 설치 앱의 **설정**에만 입력합니다. 채팅·소스코드·CSV에 키를 보내지 마세요. 키별 등록 버튼은 즉시 저장하며, URL·검색 범위·사용 조건 등은 설정 저장이 필요합니다. 각 제공자의 설정 저장·연결 테스트를 누르면 해당 설정을 저장한 뒤 실제 API를 한 번 요청합니다. 키 등록/모델 목록 조회는 실제 자료 수집·번역 완료와 다릅니다.

## 다음(Kakao) · 처음 시작하기

1. https://developers.kakao.com 에 로그인하고 사용할 애플리케이션을 생성/선택합니다.
2. 애플리케이션의 REST API 키를 확인합니다. JavaScript 키·Native 앱 키·Admin 키를 대신 사용하지 않습니다.
3. 앱 설정 → 다음(Kakao) → REST API 키에 붙여 넣고 등록합니다.
4. 웹·블로그·카페 검색 범위를 선택하고 설정 저장·연결 테스트를 누릅니다.
5. 작업실에서 다음(Kakao)와 번들을 선택해 자동 검색·수집 시작을 누릅니다.

공식 요청·한도 설명: https://developers.kakao.com/docs/latest/ko/daum-search/dev-guide

## Brave 웹 검색 · Reddit 공개 링크 검색에도 사용

1. https://api-dashboard.search.brave.com/app/keys 에서 사용 계정과 이용 플랜의 API 키를 준비합니다. 무료 제공 여부와 요금은 해당 콘솔에서 확인하세요.
2. 앱 설정 → Brave Search → API 키 등록 → 설정 저장·연결 테스트.
3. 작업실에서 Brave 웹 검색을 선택합니다.
4. Reddit 공개 링크를 찾으려면 범위 설정에서 Brave로 Reddit 공개글 찾기를 누르세요. reddit.com 도메인 제한이 적용됩니다. 이는 검색에 색인된 제목·URL·요약이며 Reddit API 승인이나 원문·댓글 접근 권한을 대신하지 않습니다.

## 네이버 API Hub

신규 신청 경로: https://www.ncloud.com/product/applicationService/naverApiHub

1. API Hub에서 사용할 검색 상품의 이용 조건과 인증정보를 확인합니다. 계정 상태에 따라 결제수단 등록이 요구될 수 있으며 실제 과금은 상품 조건에 따릅니다.
2. 공식 콘솔/문서에 표시된 **검색 요청 URL**을 앱의 네이버 검색 요청 URL에 입력합니다. ? 앞 주소만 입력하며 키·검색어는 붙이지 않습니다.
3. 콘솔 예시에 맞게 검색 종류와 인증 형식을 선택합니다. 앱은 X-Naver-Client-Id/Secret 또는 x-ncp-apigw-api-key-id/key 두 형식을 지원합니다. 다른 HMAC 서명이나 계약별 경로를 요구하는 상품은 추가 개발이 필요합니다. 이 환경에서는 Ncloud 상품 상세 문서를 읽을 수 없어 신규 Hub의 주소·인증 형식을 자동으로 확정하지 않았습니다.
4. 해당 검색 상품의 Client ID/Secret 또는 Key ID/Key를 각각 등록하고 설정 저장·연결 테스트를 누릅니다. 일반 Ncloud 계정 Access Key를 대신 입력하지 마세요.
5. 기존 NAVER Search API 사용 권한과 키가 있는 계정은 도움말의 기존 Search API 주소 사용 버튼으로 공식 기존 주소를 입력할 수 있습니다. 신규 Developers 화면에 검색 항목이 있다고 가정하지 않습니다.

주소 경로에 {type}을 넣으면 선택한 blog/cafearticle/webkr로 치환합니다. 콘솔에서 종류별 고정 주소를 제공하면 해당 종류와 주소를 함께 맞추세요. 기존 요청 계약 문서: https://developers.naver.com/docs/serviceapi/search/blog/blog.md

## Google · 기존 계정만

공식 안내: https://developers.google.com/custom-search/v1/overview

Custom Search JSON API는 신규 고객에게 제공되지 않습니다. 기존 고객 전환 기한은 2027-01-01입니다. 새 Google Cloud API 키나 Gemini 키를 만들었다고 사용할 수 있는 API가 아닙니다.

이미 사용 중인 계정만 기존 사용 권한 확인을 선택하고, 해당 API 키와 검색 엔진 ID(cx)를 등록하세요. 설정 저장·연결 테스트 후 작업실에서 선택할 수 있습니다. 전환 기한 이후에는 앱이 이 기존 API 호출을 차단합니다.

## Reddit · 사용 승인 후

공식 안내: https://support.reddithelp.com/hc/en-us/articles/14945211791892-Reddit-Data-API-Wiki

1. Reddit에서 자신의 사용 목적에 맞는 Data API 사용 승인을 먼저 받습니다. 체크박스를 선택하는 것 자체가 승인을 부여하지 않습니다. 상업 용도·자료 보존·외부 처리 범위는 승인 조건을 확인하세요.
2. 승인된 installed app Client ID와 Redirect URI http://127.0.0.1:48732/callback 을 준비합니다. installed app에는 앱에서 Client Secret을 요구하지 않습니다.
3. 앱 설정에서 승인 확인과 Client ID 입력 → 설정 저장 → Reddit OAuth 연결.
4. 열린 공식 Reddit 로그인/동의 화면에서 승인합니다. 브라우저가 인증 완료를 표시하면 앱으로 돌아와 연결 테스트를 실행합니다. 토큰은 앱의 보안 저장소에 저장합니다.
5. 필요하면 공개 댓글 옵션을 켭니다. 게시글당 최대 25개의 반환 댓글만 추가하며 더 보기나 삭제·비공개 댓글은 수집하지 않습니다. 추가 API 요청이 발생합니다.
6. 저장 자료는 승인된 용도·기간에 한해 보관하고 삭제 상태 동기화를 실행하세요. 별도 CSV·백업도 변경 사항을 직접 반영해야 합니다.

승인 전에는 Brave 도메인 검색으로 공개 링크·요약을 찾는 기능을 사용할 수 있습니다.

## GPT·Gemini · 번역과 CSV 정리에만

- OpenAI: https://platform.openai.com/api-keys 의 API 키. ChatGPT 구독과 API 사용료는 별개입니다.
- Gemini: https://aistudio.google.com/apikey 의 API 키. Google 검색 API와 다른 키·서비스입니다.

각 카드에서 키 등록 → 연결 테스트·모델 조회 → 원문 외부 전송 동의 → 설정 저장. 작업실 결과에서 행 선택 → 번역·CSV 정리 펼치기 → 작업·제공자·구조화 응답 지원 모델 선택 → 실행합니다. 수집 중에는 AI를 호출하지 않습니다. 번역·정리는 원문을 보존하고 별도 결과 열을 갱신합니다. 실패 행은 오류를 남기며 해당 행만 다시 선택해 처리할 수 있습니다.

## 오류 확인

401: 키/토큰 만료. 403: 권한·상품 승인·지역 또는 네트워크 정책. 429: 계정 한도·요금제·요청량. 인증 오류 시 수집은 현재 위치에서 일시정지하며, 설정을 수정한 뒤 재개합니다. 원래 수집 범위·주소는 기록에 보존하므로 범위나 URL을 바꾸려면 새 수집을 시작하세요. 키 값은 바꿔 등록할 수 있습니다. 실제 청구와 잔여 할당량은 각 제공자 콘솔에서 확인하세요.
