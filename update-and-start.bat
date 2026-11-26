@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo === Wafer Dashboard: update + start ===
echo Working folder: %CD%
echo.

REM If this folder is not a git clone, try common locations or clone fresh.
if not exist "%CD%\.git\" (
  echo This folder is NOT a git repo ^(no .git^).
  echo.

  if exist "%CD%\wafer-dashboard\.git\" (
    echo Found git repo — switching to %CD%\wafer-dashboard
    cd /d "%CD%\wafer-dashboard"
  ) else if exist "%USERPROFILE%\wafer-dashboard\.git\" (
    echo Found git repo — switching to %USERPROFILE%\wafer-dashboard
    cd /d "%USERPROFILE%\wafer-dashboard"
  ) else (
    echo Cloning https://github.com/parthi8787/wafer-dashboard ...
    echo into: %CD%\wafer-dashboard
    echo.
    git clone https://github.com/parthi8787/wafer-dashboard.git wafer-dashboard
    if errorlevel 1 goto :fail
    cd /d "%CD%\wafer-dashboard"
  )
)

echo Repo: %CD%
echo.

git checkout main
if errorlevel 1 goto :fail

git pull origin main
if errorlevel 1 goto :fail

if not exist "node_modules\" (
  echo Installing npm packages...
  call npm install
  if errorlevel 1 goto :fail
)

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
echo FAILED.
echo.
echo Fix:
echo   1. Open PowerShell
echo   2. Run:
echo        cd %%USERPROFILE%%
echo        git clone https://github.com/parthi8787/wafer-dashboard.git
echo        cd wafer-dashboard
echo        .\update-and-start.bat
echo.
echo Or open the cloned wafer-dashboard folder and double-click update-and-start.bat there.
echo.
pause
exit /b 1
