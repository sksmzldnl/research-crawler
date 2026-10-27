# 현재 검증 절차

현재 기능과 배포 검증 범위는 [0.6.2 배포 안내](API_RELEASE.md)에 기록합니다. `GLASS_RELEASE.md`, `LOCAL_RELEASE.md`, `SEARCH_RELEASE.md`, `RELEASE_NOTES.md`는 과거 버전 기록입니다.

```sh
npm test
npm run build
npm run test:ui
npm run test:desktop
```

시스템 Chromium을 사용할 때 `CHROMIUM_PATH=/usr/bin/chromium npm run test:ui`, Linux headless Electron은 `STUDIO_DESKTOP_HEADLESS=1 npm run test:desktop`을 사용할 수 있습니다. 실제 설치 패키지는 `node scripts/verify-packaged.mjs`로 검사합니다. 테스트용 외부 응답과 실제 계정의 인증·과금을 구분합니다.
