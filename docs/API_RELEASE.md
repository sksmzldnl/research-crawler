# ZeroWaste Listening Studio 0.8.0 · 원문 파일 수집

네이버 블로그·카페 쿼리 번들 자동 검색을 유지하면서 공개 본문 전체를 수집합니다. 작업실에서 폴더와 MD/JSON을 선택하면 수집 성공한 글마다 개별 파일로 자동 저장합니다.

- 검색 요약 대신 원문 전체 추출. 블로그 mainFrame, 카페 프레임, SmartEditor·구형 본문 영역 지원. 정적 HTML에 본문이 없는 공개 페이지는 로그인과 분리된 임시 Electron 렌더러로 로딩.
- 원문 메타데이터·게시일 요소·JSON-LD로 게시일 보완, 한국 날짜 유지. 미확인 날짜는 임의 생성하지 않음.
- 팝업·배너 제거 체크박스. 협찬 단어에 따른 글 전체 광고 제외 제거. 기본 번들의 기존 NOT 광고 제거. 사용자가 직접 쓴 검색 조건은 유지.
- MD/JSON 개별 파일, 저장 폴더 선택, 기존 파일 덮어쓰기 방지, 저장 실패 시 일시정지·원문 보존, 저장된 URL 중복 방지.
- AI 페이지·키 설정·AI 호출 및 CSV 인사이트 기능 제거. 작업실 / 설정 두 메뉴 유지.
- 이전 자료 보존. 전문을 확보하려면 새 수집 실행. 앱 재실행 후 재개는 같은 저장 폴더 재선택 필요.

이미지·첨부는 링크로 보존하고 바이너리는 다운로드하지 않습니다. 댓글·로그인·가입·권한이 필요한 글은 제외합니다. 수집 실패를 검색 요약으로 대신해 성공 처리하지 않습니다. 모든 페이지 구조나 접근 가능성을 보장하지 않습니다.

## 설치

[다운로드](https://github.com/sksmzldnl/research-crawler/releases/tag/studio-api-v0.8.0) · [설치·네이버 키 발급·원문 저장 안내](https://github.com/sksmzldnl/research-crawler/blob/codex/naver-key-only-setup/docs/ORIGINAL_GUIDE_KO.md)

- Apple Silicon: `ZeroWaste-Listening-Studio-0.8.0-mac-arm64.dmg`
- Intel Mac: `ZeroWaste-Listening-Studio-0.8.0-mac-x64.dmg`
- Windows x64: `ZeroWaste-Listening-Studio-0.8.0-win-x64.exe`

macOS 13 이상. Mac은 ad-hoc 서명, Developer ID 공증 없음. Windows는 서명되지 않은 설치 파일입니다. 기존 앱을 종료한 뒤 교체하세요. 기존 앱 식별자·로컬 자료·네이버 키 저장 위치는 유지됩니다.

## 검증 범위

단위 검사: 전체 문단·이미지 링크·광고 체크박스·원문 날짜·블로그 프레임·허용 주소와 리다이렉트, 글 10개당 파일 10개, MD/JSON·이름 충돌·본문 보존·페이지 재개·날짜 필터·본문 기준 Boolean·저장 실패·제거된 AI 엔드포인트.

브라우저 검사: 두 메뉴, 번들 편집, 파일 형식·폴더·광고 설정, 최소 네이버 키, 전체 본문·날짜·오류 상세, 좁은 화면.

Electron 검사: 실제 UI·IPC·SQLite·네이티브 폴더 선택과 자바스크립트로 늦게 표시되는 본문의 격리 렌더링을 거쳐 글 10개를 MD 10개와 JSON 10개로 저장, 끝 문단 확인, 원문 게시일, 광고 켜기/끄기, 협찬 문구 보존, 카페 접근 실패와 전문 성공 구분, AI 엔드포인트 제거를 확인합니다. 명시적 격리 테스트에서만 API/HTML fixture를 사용하며 일반 앱은 실제 요청을 보냅니다.

CI는 Intel macOS·Windows에서 소스와 설치 패키지를 실행 검사합니다. Mac ARM64는 교차 빌드와 바이너리·서명·ASAR 내용 검사이며 M 시리즈 실기기 실행은 미검증입니다. 실제 네이버 계정·키·할당량 및 현재 공개 페이지에 대한 실수집은 개발 환경에서 검증하지 않았습니다. 빌드 manifest에 실제 확인 범위를 기록합니다.
