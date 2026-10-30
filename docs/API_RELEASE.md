# ZeroWaste Listening Studio 0.12.1 · Liquid Glass

참고 이미지의 코랄·핑크·보라·옐로가 부드럽게 움직이는 배경을 적용했습니다. 투명 패널의 굴절과 색 분산·스펙트럼 가장자리를 강화하고, 작업실·설정 아이콘과 선택 전환을 유리 물방울로 표현합니다. 광고·해시태그·기간·번들 선택은 입체 유리 온오프 토글로 바꿨습니다.

- 패널 배경만 SVG 변위 필터로 굴절시키고 RGB 채널을 분산합니다. 텍스트는 또렷하게 유지합니다.
- 메뉴 선택 시 남은 물방울과 이동 물방울 사이에 목이 생겼다가 분리됩니다. 빠른 연속 전환도 현재 위치에서 이어갑니다.
- 토글은 네이티브 입력과 switch 의미를 유지하며 라벨 클릭·Tab·Space, 기존 수집 설정 저장을 지원합니다.
- 운영체제의 동작 줄이기 설정에서는 배경과 메뉴 애니메이션을 멈춥니다. 명암 대비·강제 색상 모드도 대응합니다.
- 검색 대상과 원문·댓글 수집, 개별 MD/JSON 저장, 네이버 키와 사이트별 로그인 세션은 유지합니다.

[설치 파일](https://github.com/sksmzldnl/research-crawler/releases/tag/studio-api-v0.12.1)

- Apple Silicon: ZeroWaste-Listening-Studio-0.12.1-mac-arm64.dmg
- Intel Mac: ZeroWaste-Listening-Studio-0.12.1-mac-x64.dmg
- Windows: ZeroWaste-Listening-Studio-0.12.1-win-x64.exe
- 설치·키·커뮤니티·화면 움직임 안내: Original-Guide-0.12.1-KO.pdf

기존 앱을 종료하고 새 설치 파일로 교체합니다. 설정과 수집 기록은 보존됩니다. 파일 저장 폴더는 작업실에서 다시 선택합니다.

## 검증 범위

UI 검사는 토글의 키보드 조작·설정 유지, 배경 움직임, 물방울 연결부와 빠른 메뉴 전환 후 최종 위치, 동작 줄이기와 명암 대비 모드, 기존 두 메뉴와 수집 설정을 확인합니다. 별도의 렌더링 비교로 실제 SVG 배경 굴절을 확인합니다. Electron의 원본 앱과 Mac·Windows 설치 패키지에서 기존 검색→원문·댓글→개별 파일 저장 모의 통합 검사를 실행합니다.

실제 네이버·Google·Reddit·Mumsnet·MoneySavingExpert 계정 접속 및 신규 포럼의 최신 실사이트 구조·정책은 개발환경 목적지 제한으로 미검증입니다. 이 버전은 수집기의 실사이트 지원 범위를 넓히는 변경이 아닙니다. Apple Silicon은 ARM64 구성·소스·서명 무결성을 확인하며 실기기 실행은 미검증입니다. Mac은 ad-hoc 서명이고 Developer ID 공증은 없습니다.
