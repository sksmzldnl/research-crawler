> 0.3.0의 이전 배포 기록입니다. 최신 버전은 [0.4.0 검색 수집 작업실](SEARCH_RELEASE.md)을 참고하세요.

# ZeroWaste Listening Studio 0.3.0 · 검색 API 없는 자료 작업실

- CSV·텍스트 파일/붙여넣기, 공개 RSS/Atom, 지정한 공개 URL 가져오기.
- 검색 API·Reddit OAuth·AI 검색어 제안·자동 AI 수집 분석 제거.
- GPT/Gemini는 선택한 행의 번역 또는 CSV 정리·요약·분류를 명시적으로 실행할 때만 사용.
- 원래 CSV 열 보존, 중복 행 표시, UTF-8/EUC-KR/UTF-16 LE 입력, CSV/Excel 내보내기.
- 작업 진행률·중지·행별 오류 및 재시도 지원. Liquid Glass 디자인 유지.

Apple Silicon Mac: `ZeroWaste-Listening-Studio-0.3.0-mac-arm64.dmg`
Intel Mac: `ZeroWaste-Listening-Studio-0.3.0-mac-x64.dmg`
Windows: `ZeroWaste-Listening-Studio-0.3.0-win-x64.exe`

이 파일들은 Electron 앱이며 별도의 Python/Qt ZeroWasteListener와 다릅니다. 소스 ZIP은 설치 파일이 아닙니다. macOS 13 이상. Mac은 ad-hoc 서명이며 Developer ID 서명/공증은 없습니다. Apple Silicon 앱은 Intel Mac에서 arm64로 교차 빌드하고 아키텍처·서명 무결성·앱 코드 일치를 검사합니다. Apple Silicon 기기 직접 실행은 미검증입니다. 실제 AI 키로 번역/정리를 호출하는 검증은 수행하지 않았으며 테스트는 제공자 응답 fixture를 사용합니다.

웹페이지 수집은 저장이 허용된 공개 HTML과 robots.txt에 한정합니다. 로그인·CAPTCHA·동적 페이지 렌더링·전역 키워드 검색은 지원하지 않습니다. CSV 원본 파일을 보관하고, 내보내기에서 모든 원래 행을 포함하려면 전체 결과를 선택하세요.

개발 환경 검증: 핵심 자동 테스트 39개, 브라우저 통합 테스트 5개, Linux Electron IPC/SQLite 데모 및 실제 CSV 가져오기 통과. GPT/Gemini는 테스트 응답으로 선택 행·근거 검증·오류 보존·중지를 확인했습니다. 네트워크 수집은 테스트 응답으로 RSS와 robots.txt/공개 HTML 경로를 확인했으며 실제 사이트마다 접근 가능 여부가 다릅니다.
