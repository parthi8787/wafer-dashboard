@echo off
setlocal
cd /d "%~dp0"

echo.
echo === Wafer Dashboard: build + start ===
echo.

call npm run build
if errorlevel 1 goto :fail

echo.
echo Starting server on http://localhost:5173
echo Opening Chrome...
echo.

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:5173"
if errorlevel 1 (
  start "" chrome "http://localhost:5173"
)

call npm start
goto :eof

:fail
echo.
echo FAILED. Fix the error above, then re-run this file.
pause
exit /b 1
