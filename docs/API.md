# API 발급·지원 범위·비용 (한국어)

키는 **앱의 API 설정**에서 입력합니다. 계정 비밀번호를 앱이나 채팅에 입력하지 않습니다. 등록 후 반드시 연결 테스트를 실행하세요. 단순히 키가 등록되어 있는 상태는 인증 성공과 다릅니다.

| 제공자 | 공식 안내 | 이 앱의 구현 | 확인해야 할 조건 |
|---|---|---|---|
| 네이버 | https://developers.naver.com/docs/serviceapi/search/blog/blog.md | `/v1/search/blog.json`, `cafearticle.json`, `webkr.json` | 개발자센터 애플리케이션 등록 → 검색 API 선택 → Client ID / Secret. 계정별 일일 한도는 공식 콘솔 확인 |
| 다음 | https://developers.kakao.com/docs/latest/ko/daum-search/dev-guide | `/v2/search/web`, `blog`, `cafe` | Kakao Developers 앱 생성 → REST API 키. JavaScript 키나 Admin 키와 혼동하지 않기 |
| Reddit | https://support.reddithelp.com/hc/en-us/articles/14945211791892-Reddit-Data-API-Wiki | 승인 확인 뒤 OAuth read/identity, 검색·접근 가능한 댓글·갱신 토큰 | 별도 Data API 승인, installed app Client ID, 리디렉션 `http://127.0.0.1:48732/callback`. 승인되지 않으면 사용 불가 |
| OpenAI | https://platform.openai.com/docs/overview · https://openai.com/api/pricing/ | 모델 조회, Chat Completions JSON Schema | API 프로젝트 키·과금 설정·JSON Schema 지원 모델. ChatGPT 구독과 API 결제는 별도 |
| Gemini | https://ai.google.dev/gemini-api/docs · https://ai.google.dev/gemini-api/docs/pricing | 모델 조회, generateContent JSON Schema | 사용 지역·프로젝트·과금·지원 모델 확인, AI Studio에서 키 발급 |
| RSS | 사용하려는 사이트의 공식 피드·이용약관 | RSS/Atom 공개 피드 파싱 | 피드와 본문 저장 권한을 사용자가 확인. HTTPS만 지원 |
| Google/Bing | https://developers.google.com/custom-search/v1/overview · https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement | 비활성 | 신규 계정이 기존 CSE를 쓸 수 있다고 가정하지 않음. 사용 가능한 공식/계약 검색 서비스가 확인되어야 별도 구현 가능 |

## 실제 검증과 문서 확인 구분

현재 클라우드의 공식 문서 도메인은 정책상 403으로 차단되었습니다. Electron 공식 보안 지침, Google 공식 python-genai README의 JSON Schema 예시, OpenAI 공식 SDK README, Reddit의 **보관된** OAuth 소스는 GitHub 원본에서 읽었습니다. 보관된 Reddit 소스는 현재 서비스 이용 승인을 증명하지 않습니다. 네이버·다음의 최신 문서 본문과 계정별 이용 가능성은 **아직 확인하지 못했습니다**. 앱의 요청 구현은 알려진 API 계약을 기준으로 작성하고 고정 응답 테스트로 검사했으며, 실제 승인/연결 성공을 주장하지 않습니다.

현재 공식 정책을 확인하려면 환경 설정에서 저장한 문서·API 도메인 변경을 반영해야 합니다. 앱 배포 전 각 제공자의 최신 약관·쿼터·상업/연구 용도·저장/삭제 의무를 확인해야 합니다. Google/Bing의 임의 HTML 검색이나 허위 API 대체는 제공하지 않습니다. Brave 등 허가된 검색 제공자는 향후 커넥터 확장 대상이며 현재 동작하는 기능으로 표시하지 않습니다.

## 날짜와 원문

네이버 블로그 `postdate`, 다음 `datetime`, Reddit `created_utc`, RSS 게시 필드를 우선 사용합니다. 원문이 허용된 경우 `article:published_time`을 보조로 확인합니다. 카페/웹문서 등 게시일이 없는 결과는 날짜를 지어내지 않고 제외 영역에 남깁니다. `provider_reported`는 공급자 값으로서 독립 검증을 뜻하지 않습니다.

원문 전문은 자동으로 허용되지 않습니다. 권한을 확인한 호스트만 설정의 허용 목록에 추가하세요. robots.txt 확인 실패·금지·로그인·리디렉션·본문 추출 실패는 전문 수집을 중단하고 `snippet_only`로 남깁니다. 전체 텍스트 필드에 스니펫만 있으면 `content_status`로 구분해야 합니다. Reddit 접근 가능한 셀프 포스트/댓글 텍스트는 전문으로 구분하며 링크 대상 기사 전문과 같지 않습니다.

## 비용과 요청 한도

API 키 없이 데모는 외부 검색/AI 호출을 하지 않습니다. 실제 모드는 제공자 정책에 따라 과금될 수 있습니다. AI 모델은 연결 테스트로 계정에서 조회한 목록을 참조하고 구조화 출력 지원 여부를 별도로 확인하세요. 입력/출력 100만 토큰당 단가를 새 조사에 직접 입력합니다. 0이면 비용 미산정입니다. 초기 추정은 자료당 입력 2,000·출력 2,000토큰 가정이며 실제 비용 보장이 아닙니다. 청크 길이는 문자 5,000개이며 사용량은 API 응답 토큰으로 누적합니다. 과금 실패/부분 응답의 비용까지 정확히 계산하지 못하므로 결제 콘솔이 최종 기준입니다.

호스트별 요청을 최소 650ms 간격으로 보냅니다. 429/5xx는 최대 네 번 시도하며 지수 백오프 또는 Retry-After를 지킵니다. Retry-After가 60초를 넘으면 일찍 재시도하지 않고 오류로 남겨 사용자가 나중에 재개합니다. 계정의 더 낮은 한도는 제공자 제한을 우선 따라야 합니다. API별 남은 할당량은 현재 UI에서 **확인 불가**로 표시합니다.

## 오류

- **401**: 키 종류/만료/OAuth 토큰 확인. Reddit 갱신 토큰이 있으면 한 번 갱신합니다.
- **403**: 승인·앱 권한·클라우드 도메인 정책 확인. 별도 우회 경로를 사용하지 않습니다.
- **429**: Retry-After 후 재개. 계정 콘솔에서 한도를 확인합니다.
- **AI 스키마/인용 실패**: 원문은 보존하고 `ai_failed`로 표시합니다. 모델을 확인하고 자료 상세에서 재처리합니다.
- **목표 미달**: 필터/게시일 미확인/검색 상한 때문일 수 있습니다. 기간·번들·소스를 검토하되 가짜 데이터를 보충하지 않습니다.
