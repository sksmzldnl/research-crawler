# ZeroWaste Listening Studio 0.12.9 · Reddit 확인 화면 오인 수정

Reddit 본문·댓글이 정상적으로 보여도 ‘브라우저 확인 필요’에서 멈출 수 있던 판정을 수정했습니다. 기존 검사는 일반 페이지에 표시되는 reCAPTCHA 배지를 실제 보안 확인 화면으로 취급할 수 있었습니다.

- 정상 본문을 읽을 수 있는 페이지의 수동 작업이 없는 reCAPTCHA 배지·invisible anchor를 확인 화면으로 오인하지 않습니다. 화면 밖·숨겨진 로그인 안내도 구분합니다.
- 실제 화면에 표시된 CAPTCHA 확인창·체크박스, 로그인·연령 확인창, 접근 차단 화면은 사용자 확인을 기다립니다. 확인 버튼이나 인증코드를 대신 처리하지 않습니다. 직접 완료하면 자동으로 이어갑니다.
- 비어 있는 게시글 로딩 틀만 있는 차단 페이지는 정상 원문으로 판단하지 않습니다.
- 0.12.8의 댓글 대기 개선도 포함합니다. 추천 피드 대신 댓글 영역을 읽고, 추가 내용이 8초 동안 없으면 확보한 본문·댓글을 저장하고 다음 글로 이동합니다. 본문 읽기 30초 실패는 개별 실패로 기록합니다. 댓글 미완료 상태·사유를 보존합니다.
- 네이버 블로그·카페·지식인 수집, 개별 MD/JSON, 미니멀 UI와 브라우저 세션은 유지합니다.

[설치 파일](https://github.com/sksmzldnl/research-crawler/releases/tag/studio-api-v0.12.9)

- Windows: ZeroWaste-Listening-Studio-0.12.9-win-x64.exe
- Apple Silicon: ZeroWaste-Listening-Studio-0.12.9-mac-arm64.dmg
- Intel Mac: ZeroWaste-Listening-Studio-0.12.9-mac-x64.dmg
- 안내서: Original-Guide-0.12.9-KO.pdf

## 검증 범위

정상 원문과 reCAPTCHA 배지를 함께 표시한 모의 페이지에서 확인 대기에 빠지지 않고 본문·댓글을 읽는지 검증합니다. 활성 CAPTCHA·로그인 창은 여전히 대기하며 사용자 확인 후 이어가는지, 화면 밖·숨겨진 로그인 안내와 빈 게시글 틀을 구분하는지 검사합니다. 네이티브 Electron 검사에는 배지가 표시된 Reddit 글, 정체된 댓글 버튼과 긴 추천 영역에서도 확보한 본문·댓글을 저장하고 다음 글로 진행하는 과정이 포함됩니다. 기존 네이버 수집·날짜·댓글·개별 파일 저장·세션 유지 검사도 포함합니다. 실제 Google·Reddit 사이트와 계정으로 재현한 검증은 포함하지 않습니다.

Mac은 ad-hoc 서명이며 Developer ID 공증이 없습니다. Apple Silicon 패키지·소스·서명은 확인하지만 ARM64 실기기 실행은 미검증입니다.
