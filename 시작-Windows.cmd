@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 이상을 설치한 뒤 다시 실행해 주세요.
  start https://nodejs.org/
  pause
  exit /b 1
)
node scripts/setup.mjs
if errorlevel 1 (pause & exit /b 1)
call npm run desktop
pause
