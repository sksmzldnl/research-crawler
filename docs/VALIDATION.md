# 검증 보고서

검증일: 2026-10-26. 실행 환경: Debian 13 x64 / Node.js 24.19.0 / Electron 45.0.0. 이 보고서는 현재 클라우드 인스턴스의 결과이며, 새 작업에서의 스냅샷 복원이나 macOS/Windows 실행 결과를 뜻하지 않습니다.

| 검사 | 결과 | 확인한 동작 |
|---|---|---|
| `npm ci` | 통과 | package-lock 기반 깨끗한 재설치, 프록시/CA/체크섬 검증 유지 |
| `npm run build` | 통과 | main/backend/UI TypeScript 검사, Vite 프로덕션 빌드, preload 복사 |
| `npm test` | **35개 통과, 실패 0** | Boolean 문법·분할 검색, 날짜/광고/중복/PII, 네이버·다음 고정 응답 계약, Reddit 승인 차단, Retry-After, 내부 URL 차단, AI 스키마·인용·청크·의미 비교, SQLite 저장·중단·재개·백업, CSV/XLSX |
| `CHROMIUM_PATH=/usr/bin/chromium npm run test:ui` | **2개 통과, 실패 0** | 한국어 화면에서 데모 시작→완료→상세 원문/번역→수동 검토→CSV 다운로드→문법 오류·정상 검사→설정·도움말·대시보드, 잘못된 Origin/헤더의 변경 요청 거부 |
| `STUDIO_DESKTOP_HEADLESS=1 … npm run test:desktop` | 통과 | 실제 Electron 창, sandboxed preload, IPC, SQLite, 데모 유효 7/제외 5 |
| Linux unpacked 패키징 | 통과 | `npm run package:linux -- --config.electronDist=node_modules/electron/dist`, 결과 `release/linux-unpacked/` |
| 패키징된 Linux 앱 실행 | 통과 | `STUDIO_EXECUTABLE_PATH=…/release/linux-unpacked/zerowaste-listening-studio`로 같은 Electron 기능 검사, 데모 12건 저장 확인 |
| `npm audit --audit-level=moderate` | **취약점 0건** | 현재 lockfile 기준. ExcelJS의 전이 uuid는 호환 가능한 11.1.1로 제한하고 XLSX 쓰기·다시 읽기 테스트 통과 |
| `npm run test:live` | **SKIPPED / 미검증, 종료 2** | 네이버/AI 키와 모델 변수가 없어 실제 유료 호출하지 않음. 통과로 계산하지 않음 |
| macOS `.app/.dmg` / Windows `.exe` | **미검증** | 해당 OS의 GitHub Actions 워크플로만 제공. 실제 CI 실행·설치·서명·공증은 하지 않음 |
| macOS Keychain / Windows DPAPI | **미검증** | Electron safeStorage 경로 구현. 현재 Linux 보안 저장소 없음→메모리 대체 상태 확인 |
| 공식 API 최신 문서·계정 정책 | **일부 확인, 주요 사이트 접근 차단** | GitHub의 Electron/Google/OpenAI 공식 자료는 확인, 네이버·다음 등 주요 문서 도메인은 현재 정책 403. `docs/API.md` 참조 |

## 기본 데모의 실제 결과

네트워크를 사용하지 않는 12건의 합성 자료를 처리했습니다. 기본 번들·2026년 기간·광고/중복 제거 기준으로 유효 **7건**, 제외 **5건**입니다. 제외 사유는 광고/판매 유도, 게시일 미확인, 같은 URL의 추적 파라미터 변형, 기간 밖, 논리식 불일치입니다. 30건 목표를 채우지 못한 이유가 조사 기록에 남습니다. 전문처럼 저장된 데모 텍스트도 실제 사람의 글이 아닙니다.

## 재사용 환경 설정

환경 초안에 `install_script`, `start_skill`, 문서/API 접근에 필요한 네트워크 도메인을 저장했습니다. `status: saved` 응답으로 저장을 확인했습니다. 설치·시작 지침은 기존 체크아웃 사용, Node 24+, lockfile 재설치, 프록시·CA 유지, 빌드·테스트, 프로세스 재시작, 로컬 기능 확인, OS별 패키징 제약을 담습니다.

저장 자체는 실행 중인 네트워크 정책을 변경하거나 환경을 게시하지 않습니다. 마지막 런타임 상태에서 사용자 정의 허용 도메인은 여전히 비어 있습니다. 사용자는 환경 설정의 변경 사항을 검토·저장한 뒤 환경을 게시해야 합니다. 게시·새 작업 복원 검증은 아직 하지 않았습니다. 실제 키는 환경 초안이나 소스에 넣지 않았으며 앱의 API 설정에서 입력합니다.

## 남은 작업의 성격

실제 검색·번역의 신뢰성과 최신 이용 조건, 대상 OS에서의 설치·보안 저장은 외부 자격증명/승인/네트워크/OS 검증이 필요합니다. Google/Bing/Brave 및 MSI 대상은 구현하지 않았습니다. 자동 보존 만료·모든 제공자의 삭제 이벤트·완전한 의미 중복/PII 제거를 제공하지 않습니다. 자세한 제한은 `ARCHITECTURE.md`에 있습니다. 따라서 이 결과를 모든 요구사항이 검증 완료된 정식 배포판으로 설명해서는 안 됩니다.
