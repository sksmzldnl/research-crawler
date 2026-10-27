> 이전 버전의 기록입니다. 현재 0.4.1의 동작과 설치는 [검색 수집 버전 안내](SEARCH_RELEASE.md), [최신 README](../README.md)를 참고하세요.

# ZeroWaste Listening Studio · Electron 테스트판

이 배포 파일은 Electron 45 + React + TypeScript + Node SQLite로 만든 **ZeroWaste Listening Studio**입니다. 앱 ID는 `org.zerowaste.listeningstudio`입니다. `ZeroWasteListener`라는 이름의 Python/Qt 프로그램과는 다른 구현입니다.

## 내려받을 파일

- Apple Silicon Mac: 이름에 `mac-arm64`가 있는 `.dmg` 또는 `.zip`.
- Intel Mac: 이름에 `mac-x64`가 있는 `.dmg` 또는 `.zip`.
- Windows 64비트: 이름에 `win-x64`가 있는 `.exe`.
- 소스코드: `ZeroWaste-Listening-Studio-0.1.0-source.zip`. 이것은 설치 파일이 아닙니다.
- `.sha256`은 무결성 확인용이며 설치 프로그램이 아닙니다. `*-build.json`에는 정확한 프로젝트·소스 커밋·아키텍처와 검사 결과가 들어 있습니다.

## 설치

Mac은 DMG를 열고 `ZeroWaste Listening Studio.app`을 응용 프로그램 폴더로 옮겨 실행합니다. Windows는 EXE 설치 마법사를 실행합니다. Node.js/Python을 사용자의 컴퓨터에 따로 설치할 필요가 없습니다.

앱 왼쪽 메뉴는 대시보드 / 새 조사 / 쿼리 번들 / 데이터 검토 / 조사 기록 / API 설정 / 도움말입니다. 처음에는 API 키 없이 데모 조사를 실행할 수 있습니다. 데모 자료는 실제 사람의 경험이 아닌 합성 예시이며 연구 근거로 사용하면 안 됩니다.

## 검증과 제한

배포 워크플로는 해당 운영체제에서 빌드와 자동 테스트를 실행하고, 패키징한 Electron 앱에서 데모 조사(12건 저장, 유효 7건, 제외 5건)를 확인한 뒤 파일을 게시하도록 구성했습니다. 실행 결과는 GitHub Actions에서 확인하세요.

실제 검색·AI 호출은 사용자 자격증명과 승인 없이 검증하지 않습니다. 키는 설치한 앱의 API 설정에서 입력하세요. 키·개인 연구 자료는 설치 파일에 포함하지 않습니다.

이 테스트판에는 개발자 코드 서명과 Apple 공증이 없습니다. 운영체제 경고가 발생할 수 있습니다. 출처를 확인하고 OS의 공식 보안 안내에 따라 판단하세요. 보안 기능을 일괄 해제하는 명령은 제공하지 않습니다.
