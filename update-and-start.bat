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

git fetch origin main
if errorlevel 1 goto :fail

REM Local copies of these files (untracked) block pull — remove if not tracked.
call :remove_if_untracked update-and-start.bat
call :remove_if_untracked SETUP-FROM-HOME.bat

REM Sync exactly to origin/main (discard local tracked edits on main).
git reset --hard origin/main
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

:remove_if_untracked
git ls-files --error-unmatch "%~1" >nul 2>&1
if errorlevel 1 (
  if exist "%~1" (
    echo Removing untracked local file so update can proceed: %~1
    del /f /q "%~1" >nul 2>&1
  )
)
exit /b 0

:fail
echo.
echo FAILED.
echo.
echo Quick fix in PowerShell:
echo   cd $HOME\wafer-dashboard
echo   del .\update-and-start.bat
echo   git pull origin main
echo   .\update-and-start.bat
echo.
pause
exit /b 1
