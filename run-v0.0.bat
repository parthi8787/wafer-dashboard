@echo off
setlocal
cd /d "%~dp0"

echo.
echo === Wafer Dashboard Version 0.0 ===
echo Checking out frozen tag v0.0 ...
echo.

git fetch origin tag v0.0 --no-tags 2>nul
git fetch origin refs/tags/v0.0:refs/tags/v0.0 2>nul
git checkout v0.0
if errorlevel 1 (
  echo.
  echo Could not checkout tag v0.0.
  echo Try:  git fetch --tags origin
  echo Then re-run this file.
  pause
  exit /b 1
)

echo.
call npm run build
if errorlevel 1 goto :fail

echo.
echo Starting Version 0.0 on http://localhost:5173
echo Chrome will open in a few seconds...
echo Press Ctrl+C to stop the server.
echo To return to latest later:  git checkout main
echo.

start /b cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:5173"

call npm start
goto :eof

:fail
echo.
echo FAILED. Fix the error above, then re-run this file.
pause
exit /b 1
