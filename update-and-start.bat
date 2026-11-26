@echo off
setlocal
cd /d "%~dp0"

echo.
echo === Wafer Dashboard: update + start ===
echo.

git checkout main
if errorlevel 1 goto :fail

git pull
if errorlevel 1 goto :fail

call npm run build
if errorlevel 1 goto :fail

echo.
echo Starting server on http://localhost:5173
echo Press Ctrl+C to stop.
echo.
call npm start
goto :eof

:fail
echo.
echo FAILED. Fix the error above, then re-run this file.
pause
exit /b 1
