# ZeroWaste Listening Studio 0.6.0 · Naver + CSV Insights

이번 버전은 **네이버 블로그·카페 검색과 CSV 인사이트 정리**에 집중합니다. 기존 Liquid Glass 디자인을 유지하며 작업실과 설정 두 메뉴로 구성했습니다.

- 네이버 쿼리 번들 자동 검색·페이지 순회·필터·오류 후 재개.
- CSV 파일 가져오기, 본문 열 선택, 원래 열·원문 보존.
- OpenAI 또는 Gemini로 선택 행의 한국어 요약·인사이트·개선 제안·근거 추가.
- 표시한 행을 UTF-8 BOM CSV로 저장. 원래 열 이름이 겹쳐도 덮어쓰지 않음.
- 잘못된 인용은 행별 오류 표시, AI 인증·권한·한도 오류는 배치 중지, 완료 결과 보존.
- 다른 엔진·웹문서·RSS·URL 수집·전문 추출·번역 전용·모델 조회·연결 테스트 제거.
- 설정은 네이버 ID·Secret 두 값과 선택한 AI 키 하나. GPT는 Tracking ID 대신 Secret Key 전체값만 입력.

## 설치

- Apple Silicon: `ZeroWaste-Listening-Studio-0.6.0-mac-arm64.dmg`
- Intel Mac: `ZeroWaste-Listening-Studio-0.6.0-mac-x64.dmg`
- Windows: `ZeroWaste-Listening-Studio-0.6.0-win-x64.exe`

[다운로드](https://github.com/sksmzldnl/research-crawler/releases/tag/studio-api-v0.6.0). Mac DMG를 열고 앱을 Applications로 옮깁니다. 기존 앱을 종료한 뒤 교체하세요. 앱 식별자와 데이터 저장 위치를 유지하므로 이전 자료는 보존됩니다. 이전 버전 수집 작업은 새로 시작하세요.

macOS 13 이상. ad-hoc 서명이며 Developer ID 공증은 없습니다. macOS가 차단하면 시스템 설정의 개인정보 보호 및 보안에서 해당 앱의 실행 허용을 확인할 수 있습니다.

## 검증 범위

단위 검사: 실제 URL·인증 헤더·응답 구조·페이지 커서, Boolean·광고·날짜 필터, CSV 원본 보존·충돌 없는 결과 열·수식 방어, 두 AI의 구조화된 결과·정확한 인용, 선택 행 처리·인증 오류 중지·취소.

브라우저 검사: 두 메뉴와 두 검색 종류, 번들 편집, CSV 파일 가져오기·미리보기·행 선택·다운로드, 최소 키 설정과 좁은 화면.

Electron 검사: 실제 UI·IPC·SQLite·네이티브 저장 경로를 거쳐 네이버 블로그·카페, start=1/101, 광고 필터, 401 후 재개, 네이버 키 없는 CSV + OpenAI/Gemini 정리, 원문 보존, CSV 저장, AI 401 중지를 검증합니다. 제공자 응답은 격리된 명시적 테스트 실행에서만 fixture를 사용합니다. 일반 앱은 실제 API를 호출합니다.

CI는 Intel macOS·Windows에서 소스와 설치 패키지의 실행을 검사합니다. Mac 두 아키텍처의 바이너리·서명 무결성·ASAR의 실제 코드·자산·설치 파일 체크섬을 검사합니다. `*-build.json`에 소스 커밋과 검사 범위를 기록합니다. Apple Silicon 바이너리는 교차 빌드 및 내용 검사이며 M 시리즈 실기기 실행은 미검증입니다.

실제 사용자 키·상품 승인·결제·실사용 할당량은 개발 환경에서 검증하지 않았습니다. 키 등록은 인증 성공 표시가 아닙니다.
