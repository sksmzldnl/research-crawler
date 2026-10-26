# ZeroWaste Listening Studio 0.2.0 · Liquid Glass

이번 버전은 라벤더·핑크·블루 배경, 반투명 유리 사이드바와 카드, 빛 반사와 얇은 테두리, 부드러운 그림자를 적용한 인터페이스 개선판입니다. Electron 기반의 같은 프로그램이며 앱 식별자 `org.zerowaste.listeningstudio`와 SQLite 저장 구조를 유지합니다.

## 다운로드

- M1·M2·M3·M4·M5 등 Apple Silicon: `ZeroWaste-Listening-Studio-0.2.0-mac-arm64.dmg`.
- Intel Mac: `ZeroWaste-Listening-Studio-0.2.0-mac-x64.dmg`.
- Windows 64비트: `ZeroWaste-Listening-Studio-0.2.0-win-x64.exe`.
- Mac 앱 ZIP 및 전체 소스 ZIP도 제공합니다. `.sha256`과 `*-build.json`은 무결성·검증 범위 확인용입니다.

## 개선 내용

- 실제 조사 상태와 유효/제외 건수, 목표 확보율을 보여 주는 대시보드.
- 최근 7일 수집 그래프와 소스별 분포 전환, 키보드로 조작하는 조사 캘린더.
- 자료 검색 바로가기와 Cmd/Ctrl+K 단축키.
- 조사 입력·번들 편집·자료 검토·API 설정·도움말에 일관된 유리 스타일 적용.
- 투명도 줄이기·고대비 설정 저장, 움직임 줄이기와 좁은 창 지원.
- 원래의 데모/실제 자료 구분, 수집·검토·CSV/XLSX 내보내기 기능 유지.

Mac은 macOS 13 이상이 필요합니다. DMG를 열고 `ZeroWaste Listening Studio.app`을 응용 프로그램 폴더로 옮겨 실행하세요. API 키는 앱의 API 설정에 입력하며, 키 없이 데모를 사용할 수 있습니다. 기존 앱과 같은 식별자를 사용하므로 데이터 파일 형식 변경은 없습니다. 중요한 조사 데이터는 업데이트 전 앱의 SQLite 백업 기능으로 보관할 수 있습니다.

## 검증과 제한

Windows와 Intel Mac에서 패키징한 앱의 데모 실행을 검사합니다. Apple Silicon 패키지는 Intel Mac에서 실제 arm64 Electron 런타임으로 빌드하며 아키텍처·서명 무결성·포함된 프로그램 코드와 UI 파일을 확인합니다. **Apple Silicon 기기에서의 직접 실행은 미검증**입니다.

Developer ID 서명·Apple 공증이 없는 테스트 배포판입니다. 운영체제 경고가 발생할 수 있습니다. 실제 검색 API·AI 연결과 비용은 사용자 계정 및 승인 상태에 따라 별도 확인해야 합니다. 데모 자료는 합성 예시이며 실제 연구 근거로 사용할 수 없습니다.
