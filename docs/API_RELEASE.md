# ZeroWaste Listening Studio 0.12.2 · 화면 성능과 움직임 수정

0.12.1의 상시 SVG 배경 굴절·색 분산과 컨트롤마다 겹친 블러를 제거했습니다. 배경은 작은 공유 Canvas에서 움직이고, 가장자리는 같은 배경을 넓고 부드럽게 반사합니다. 토글은 켜고 끄는 약 0.4초 동안만 유리 효과를 보이며 평소에는 단순한 상태로 돌아옵니다.

- 배경 최대 800×540·24fps, 반사 최대 12fps. 색상 텍스처·반사 마스크·레이어 캐시 재사용. 화면이 숨겨지면 중지합니다.
- 고정 무지개 테두리와 상시 SVG backdrop 필터를 없앴습니다. 반사 색은 실제 배경 Canvas에서 가져옵니다.
- 설정 → 화면 → 배경 움직임에서 직접 켜고 끌 수 있습니다. 기본은 시스템 동작 줄이기 설정을 따르며 명시적으로 배경만 켤 수 있습니다.
- 네이버·Reddit·Mumsnet·MoneySavingExpert, 원문·댓글, 개별 MD/JSON 저장과 인증정보는 유지합니다.

[설치 파일](https://github.com/sksmzldnl/research-crawler/releases/tag/studio-api-v0.12.2)

- Windows: ZeroWaste-Listening-Studio-0.12.2-win-x64.exe
- Apple Silicon: ZeroWaste-Listening-Studio-0.12.2-mac-arm64.dmg
- Intel Mac: ZeroWaste-Listening-Studio-0.12.2-mac-x64.dmg
- 안내서: Original-Guide-0.12.2-KO.pdf

기존 앱을 종료하고 설치 파일로 교체합니다. Windows에서 테스트한 사용자를 위해 Windows 설치 앱에서도 실제 배경 픽셀 변화·반사·토글 복귀와 기존 수집을 검사합니다.

## 검증 범위

동일한 Linux 개발 환경·1440×1060·Chromium headless 비교에서 UI requestAnimationFrame 측정값은 약 3.12fps→59.51fps, 95백분위 프레임 간격은 약 416.6ms→16.8ms였습니다. 상시 backdrop-filter 요소는 26개→0개입니다. 이는 개발 환경의 비교 결과이며 사용자 Windows PC의 실제 FPS 보장이 아닙니다. 배경 자체는 별도로 최대 24fps로 제한합니다.

UI와 Electron 설치 앱 검사는 배경 Canvas와 화면 캡처의 실제 픽셀 변화, 반사 Canvas의 변화와 넓은 마스크, 중앙 반사 부재, 유리 토글의 단순 상태 복귀, 시스템 동작 줄이기와 사용자의 배경 선택을 확인합니다. 기존 검색→원문·댓글→개별 파일 저장 검사는 로컬 모의 응답으로 수행합니다.

실제 서비스 계정·실사이트의 최신 구조와 정책 검증 범위는 이전 버전과 같습니다. Apple Silicon은 ARM64 패키지·소스·서명을 확인하며 실기기 실행은 미검증입니다. Mac은 ad-hoc 서명이며 Developer ID 공증이 없습니다.
