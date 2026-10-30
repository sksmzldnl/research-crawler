# ZeroWaste Listening Studio 0.12.4 · 프리즘 유리와 전환 효과

Mumsnet·MoneySavingExpert의 선택 항목, 설정, IPC, 검색 및 수집 어댑터를 제거했습니다. 네이버 블로그·카페·지식인과 Reddit을 유지합니다. 기존에 저장한 자료와 파일은 삭제하지 않습니다.

- 엣지: 배경 Canvas의 실제 RGB를 서로 다른 굴절 위치에서 읽습니다. 둥근 표면의 법선과 두께에 따라 굴절·색 분산이 달라지고 배경 움직임에 반응합니다. 고정 무지개 선이나 단순 확대 반사가 아닙니다.
- 메뉴: 작업실·설정 전환 중 두 물방울 사이 연결부가 늘어나 가늘어지고 떨어집니다. 아이콘 렌즈도 함께 변형됩니다.
- 스위치: 전환하는 약 0.6초 동안 투명한 굴절 렌즈로 부풀고 늘어납니다. 전환 후 단순한 손잡이로 돌아갑니다.
- 성능: 최대 800×540 배경, 최대 24fps 배경·12fps 엣지, 캐시된 엣지 좌표, 최대 6개 보이는 표면. 화면 전체 SVG 필터는 쓰지 않습니다. 작은 컨트롤의 backdrop 굴절은 전환 중에만 적용합니다. 화면이 숨겨지면 멈춥니다. 동작 줄이기·대비 설정을 존중합니다.

[설치 파일](https://github.com/sksmzldnl/research-crawler/releases/tag/studio-api-v0.12.4)

- Windows: ZeroWaste-Listening-Studio-0.12.4-win-x64.exe
- Apple Silicon: ZeroWaste-Listening-Studio-0.12.4-mac-arm64.dmg
- Intel Mac: ZeroWaste-Listening-Studio-0.12.4-mac-x64.dmg
- 안내서: Original-Guide-0.12.4-KO.pdf

## 검증

색 채널 분리·배경 색상 반응·중앙 투명 영역·스크롤된 표면의 클리핑을 검증합니다. 화면 및 설치 앱에서 움직이는 배경과 엣지 픽셀, 전환 중 표면 연결, 투명한 스위치 렌즈와 단순 상태 복귀, 동작 줄이기를 검사합니다. 네이버·Reddit 검색과 원문·댓글·개별 MD/JSON 저장은 모의 응답으로 검증합니다. 이번 작업에서 실사이트 수집은 검증하지 않습니다.

Mac은 ad-hoc 서명이며 Developer ID 공증이 없습니다. Apple Silicon 패키지·소스·서명은 확인하지만 ARM64 실기기 실행은 미검증입니다. 실제 화면 속도는 PC에 따라 다릅니다.
