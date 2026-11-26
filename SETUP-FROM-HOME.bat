@echo off
setlocal
REM Run this from anywhere. Clones (or updates) into %USERPROFILE%\wafer-dashboard then starts.

set "REPO=%USERPROFILE%\wafer-dashboard"
set "URL=https://github.com/parthi8787/wafer-dashboard.git"

echo.
echo === Setup Wafer Dashboard ===
echo Target: %REPO%
echo.

if not exist "%REPO%\.git\" (
  if exist "%REPO%\" (
    echo Folder exists but is not a git clone.
    echo Rename or delete it, then re-run this file:
    echo   %REPO%
    pause
    exit /b 1
  )
  git clone "%URL%" "%REPO%"
  if errorlevel 1 (
    echo Clone failed. Is git installed?
    pause
    exit /b 1
  )
)

cd /d "%REPO%"
call "%REPO%\update-and-start.bat"
