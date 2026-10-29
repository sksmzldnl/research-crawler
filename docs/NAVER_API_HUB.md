# NAVER API Hub 연결 규격과 확인 근거

0.9.0의 연결은 아래 HTTPS 요청을 사용합니다. 주소·헤더는 앱 내부에서 선택하며 사용자 입력을 요구하지 않습니다.

| 검색 종류 | GET 요청 주소 |
| --- | --- |
| 블로그 | `https://naverapihub.apigw.ntruss.com/search/v1/blog` |
| 지식인 | `https://naverapihub.apigw.ntruss.com/search/v1/kin` |
| 카페글 | `https://naverapihub.apigw.ntruss.com/search/v1/cafearticle` |

- 인증: Application의 Client ID → `X-NCP-APIGW-API-KEY-ID`, Client Secret → `X-NCP-APIGW-API-KEY` 헤더.
- 검색: `query`, `display=100`, `start=1`부터 시작, `format=json`. `sort=date`를 사용합니다.
- 응답: `total`과 `items` 배열을 검사합니다. 각 결과의 `link`, `title`, `description`, 선택적인 `postdate`를 읽습니다.
- 페이지: 100개가 반환되고 다음 위치가 total과 1,000건 한도 내에 있을 때 `start`를 100씩 증가합니다.
- 요청 목적지: 해당 계정 종류에 맞는 정확한 호스트와 검색 경로만 허용합니다. 다른 API Gateway 테넌트나 로그인 정보·쿼리·리다이렉트에 키를 보내지 않습니다.

## 확인 근거

제공된 공식 Application PDF 6쪽과 NAVER 연동 API PDF 4쪽에서 Hub 인증 헤더를 확인했습니다. 공식 이관 공지는 [네이버 개발자센터 32530](https://developers.naver.com/notice/article/32530)이며 [API Hub 이관 가이드](https://guide.ncloud-docs.com/docs/apihub-migration)를 연결합니다.

현재 클라우드 환경에서 Ncloud 문서·API 호스트 접속은 프록시의 403으로 차단됩니다. 따라서 검색 전용 공식 문서를 직접 열람하거나 실계정 요청에 성공했다고 주장하지 않습니다. 요청 호스트·검색 경로·인증·매개변수·응답 형태는 별도로 공개된 다음 세 클라이언트를 읽어 교차 확인했습니다. 외부 코드를 실행하거나 의존성으로 설치하지 않았습니다.

- [sanbu902/naver-search-mcp-remote, 고정 커밋의 server.py](https://github.com/sanbu902/naver-search-mcp-remote/blob/94ba69d1b472d178d031d39e17be8d9e99c80726/server.py): Hub 호스트, 블로그·카페·웹문서 경로, 두 인증 헤더, JSON format, total/items.
- [tommy-zigbang/zigbang-str-search-monitor, 고정 커밋의 README](https://github.com/tommy-zigbang/zigbang-str-search-monitor/blob/bf28150e2ccedcb111e2d76a1a947e4bd0a71b84/README.md): Hub와 기존 Developers 요청 형식의 차이. 같은 커밋의 collector.py에서 검색 경로와 매개변수를 확인했습니다.
- [na06078/naver-api-search-skill, 고정 커밋](https://github.com/na06078/naver-api-search-skill/tree/ea06e8eb39015b14312d2d04cbe1cff07417a9a4): 호출기/네이버_API_계약.py의 경로·헤더·검색 종류별 정렬 지원, 네이버_API_정규화.py의 요청·응답 처리.

## 검증 범위

단위 검사에서 세 검색 종류의 요청 URL·헤더·JSON 매개변수·페이지·응답 검증을 확인합니다. Electron 검사에서는 키 등록 → 쿼리 번들 자동 수집 → start=1/101 → 필터 → 401 후 재개를 실행합니다. 설정의 연결 확인은 종류마다 `display=1`로 실제 검색을 요청한 뒤 첫 결과의 원문과 게시일도 구분해서 확인합니다. 특정 URL 원문 확인은 API 키를 전송하거나 검색하지 않습니다.

명시적인 격리된 테스트 실행만 fixture를 사용합니다. 실제 사용자 키·계정 상품 승인·할당량·청구는 클라우드에서 검증하지 않았습니다. 일반 설치 앱은 사용자의 인터넷 연결과 키로 실제 요청을 보냅니다.
