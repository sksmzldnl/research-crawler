#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js 24 이상이 필요합니다. 브라우저에서 https://nodejs.org 를 열어 설치한 뒤 다시 실행해 주세요.'
  open https://nodejs.org/
  read -r -p '종료하려면 Enter를 누르세요. '
  exit 1
fi
node scripts/setup.mjs
npm run desktop
