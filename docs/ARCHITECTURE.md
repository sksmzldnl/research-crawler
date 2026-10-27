# 0.7.0 구조

Electron main의 Service가 SQLite·OS 암호화 저장소·공식 HTTPS API를 관리합니다. sandbox·contextIsolation을 사용하고 preload는 제한된 IPC 호출만 노출합니다. React 화면은 작업실과 설정으로 구성됩니다. 로컬 개발 서버는 Origin·클라이언트 헤더를 검사합니다.

- `search-api.ts`: 고정 NAVER API HUB blog/cafearticle 경로, 두 인증 헤더, 검증된 JSON 응답.
- `search.ts`: 번들 스냅샷·Boolean 로컬 검증·광고/날짜/중복·페이지 커서·일시정지/재개. AI 미사용.
- `import.ts`: 엄격한 CSV 파서, 원본 열·행 보존. URL 접속이나 AI 호출 없음.
- `ai.ts`: OpenAI/Gemini 구조화된 한국어 요약·인사이트·근거 검증. 원문을 명령으로 취급하지 않음.
- `workspace.ts`: 선택 행 AI 처리·취소·인증 오류 중지·부분 결과 보존.
- `export.ts`: 원본 열 뒤에 AI 결과 추가, 열 이름 충돌 처리, 수식 방어, UTF-8 BOM CSV.
- `store.ts`: 기존 데이터 형식을 읽으며 새 설정만 노출. 제거한 엔진의 과거 자료는 보존하고 실행 재개는 차단.

공식 검색 API가 제공하는 요약과 게시글 전문을 구분합니다. 전문 추출·크롤링·RSS·다른 엔진·OAuth·번역 기능은 포함하지 않습니다. 사용자 지정 API 목적지는 받지 않으며 키는 CSV나 API 오류 본문에 노출하지 않습니다.

`clean-build.mjs`는 컴파일 전 생성 디렉터리를 비워 삭제된 모듈이 패키지에 남는 것을 방지합니다. `desktop/test-api.ts`의 fixture 전송은 격리된 테스트 폴더와 명시적 플래그 두 조건에서만 활성화됩니다.

- `gemini-check.ts`: 합성 입력의 모델 조회·실제 문장 생성·실제 JSON·근거 검증을 관리합니다. 확인은 현재 키와 모델에 연결되며 메모리에만 보존합니다. Service는 확인되지 않은 Gemini CSV 처리를 차단하고 변경 시 기존 확인을 무효화합니다.
