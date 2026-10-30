# 현재 검증 절차

현재 기능과 배포 검증 범위는 [0.12.0 배포 안내](API_RELEASE.md)에 기록합니다. `GLASS_RELEASE.md`, `LOCAL_RELEASE.md`, `SEARCH_RELEASE.md`, `RELEASE_NOTES.md`는 과거 버전 기록입니다.

```sh
npm test
npm run build
npm run test:ui
npm run test:desktop
```

시스템 Chromium을 사용할 때 `CHROMIUM_PATH=/usr/bin/chromium npm run test:ui`, Linux headless Electron은 `STUDIO_DESKTOP_HEADLESS=1 npm run test:desktop`을 사용할 수 있습니다. 실제 설치 패키지는 `node scripts/verify-packaged.mjs`로 검사합니다. 테스트용 외부 응답과 실제 계정의 인증·과금을 구분합니다.

0.12.0은 Mumsnet·MoneySavingExpert를 추가합니다. `tests/forums.test.ts`는 영국 날짜·시간대, 본문/댓글 분리와 다중 페이지 병합, 토론 ID 중복 제거, 키 없는 검색·연결 확인·JSON 저장을 검사합니다. `scripts/forum-browser-smoke.mjs`는 Electron 창에서 모의 Google 검색, 본문 펼치기, 2페이지의 댓글 3개, 원글 반복 제거, 쿠키 확인 대기·사용자 처리 후 재개, 사이트별 세션과 MD/JSON을 검사합니다. 최신 실사이트 DOM·정책·계정 접속은 개발환경 목적지 제한으로 미검증입니다.

2026-10-30 로컬 검증: 빌드 성공, 단위 검사 16파일·150개 통과, UI 검사 8개 통과, headless Electron 통합 검사 통과. 신규 포럼 검사는 원문 펼치기, 2페이지 댓글 3개 병합, 반복 원글 중복 제거, 영국 작성일, MD/JSON, 수동 쿠키 확인 뒤 자동 재개, 세션 재열기·삭제를 포함합니다. 이후 Mac·Windows 배포 작업에서도 최종 소스로 다시 빌드하고 원본 및 패키지의 모의 페이지 통합 검사를 실행합니다. 실사이트 수집 성공의 증거로 해석하지 않습니다.
