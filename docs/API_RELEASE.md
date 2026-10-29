# ZeroWaste Listening Studio 0.9.2 · 지식인 게시일 추출 보완

- 질문 본문 밖의 데스크톱·모바일 작성일 메타데이터도 확인.
- 한 요소에 작성일과 수정일이 함께 있을 때 원래 작성일만 추출.
- 절대 날짜 툴팁·datetime·data-date·질문 JSON-LD 날짜 읽기.
- 답변·댓글·추천 질문·프로필 날짜와 질문 본문 속 인용 날짜를 게시일로 사용하지 않음.
- 절대 날짜 근거가 없는 상대 날짜는 임의로 추정하지 않고 미확인 유지.
- 기존 카페 MS949 수정·검색·원문 저장·UI 유지.

[설치 파일](https://github.com/sksmzldnl/research-crawler/releases/tag/studio-api-v0.9.2)

- Apple Silicon: `ZeroWaste-Listening-Studio-0.9.2-mac-arm64.dmg`
- Intel Mac: `ZeroWaste-Listening-Studio-0.9.2-mac-x64.dmg`
- Windows x64: `ZeroWaste-Listening-Studio-0.9.2-win-x64.exe`
- 사용 안내: `Original-Guide-0.9.2-KO.pdf`

앱을 종료하고 새 버전으로 교체합니다. 저장한 네이버 키와 기록은 유지됩니다. 같은 저장 폴더를 다시 선택하고 기존 자료 상세에서 ‘원문 다시 읽기’를 누르거나 새 수집을 시작하세요. 날짜 필터는 질문 게시일에 적용됩니다.

## 검증

질문 본문 바깥의 작성일, 작성일/수정일 동시 표기, 상대 날짜의 절대 툴팁, 새 CSS 클래스, dt/dd, Question/QAPage JSON-LD, 답변·댓글·프로필·인용문·다른 질문의 날짜 배제를 검사합니다. Electron 설치 패키지에서 지식인 검색 → 본문·답변·원래 게시일 추출 → 개별 파일 저장과 연결 확인을 검증합니다. 응답은 격리 fixture입니다.

이번 제보의 실제 URL과 표시 날짜는 아직 제공되지 않았으며 개발 클라우드의 네이버 접속 제한도 남아 있습니다. 현재 수정은 코드에서 확인하고 재현한 누락 경로에 대한 검증이며 특정 실사이트 글에 대한 해결 확인이라고 주장하지 않습니다.

Windows·Intel Mac에서 패키지를 실행 검사합니다. Mac ARM64는 바이너리·서명·코드 일치 검사이며 M 시리즈 실기기 실행은 미검증입니다. macOS 13 이상, ad-hoc 서명·Developer ID 공증 없음. Windows 설치 파일은 서명되지 않았습니다.
