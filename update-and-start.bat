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
echo Chrome will open in a few seconds...
echo Press Ctrl+C to stop the server.
echo.

REM Open Chrome after the server has a moment to boot
start "" cmd /c "timeout /t 4 /nobreak >nul & start \"\" \"C:\Program Files\Google\Chrome\Application\chrome.exe\" http://localhost:5173 || start \"\" chrome http://localhost:5173"

call npm start
goto :eof

:fail
echo.
echo FAILED. Fix the error above, then re-run this file.
pause
exit /b 1
