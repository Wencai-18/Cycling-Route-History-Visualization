@echo off
title Cycling Route Visualizer

set "NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE%" set "NODE=node"

REM Strip trailing backslash to avoid quote escaping
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo ========================================
echo    Cycling Route Visualizer
echo ========================================
echo.
echo Starting server on http://127.0.0.1:5173 ...
echo.

start "Cycling Server" /min "%NODE%" "%ROOT%\server.js" "%ROOT%"

echo Waiting for server...
set RETRIES=0
:check
timeout /t 1 /nobreak >nul 2>&1
set /a RETRIES+=1
curl -s -o NUL http://127.0.0.1:5173 2>nul
if %ERRORLEVEL% EQU 0 goto ready
if %RETRIES% LSS 15 goto check

:ready
echo Server is ready! Opening browser...
start "" http://127.0.0.1:5173
echo.
echo Close this window when done.
pause