@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Root directory is the location of this script
set ROOT=%~dp0

REM Start services in separate Command Prompt windows (use /D to set working dir)
start "user-service" /D "%ROOT%services\user-service" cmd /k "npm install && npm start"
start "game-service" /D "%ROOT%services\game-service" cmd /k "npm install && npm start"
start "room-service" /D "%ROOT%services\room-service" cmd /k "npm install && npm start"

REM Wait a bit for servers to boot
call :wait 5

REM Health checks using curl (available on modern Windows). Fallback to simple port checks if curl missing.
where curl >nul 2>nul
if %ERRORLEVEL%==0 (
  echo Checking service health endpoints...
  curl -s http://localhost:3001/health || echo User Service health failed
  curl -s http://localhost:3003/health || echo Game Service health failed
  curl -s http://localhost:3002/health || echo Room Service health failed
) else (
  echo curl not found; skipping HTTP health checks.
)

REM Start two CLI client windows for two players
start "cli-client A" /D "%ROOT%clients\cli-client" cmd /k "npm install && npm start"
start "cli-client B" /D "%ROOT%clients\cli-client" cmd /k "npm start"

echo All services started. Two client windows opened.
exit /b 0

:wait
REM Usage: call :wait <seconds>
set /a SECS=%1
for /l %%i in (1,1,%SECS%) do (
  ping -n 2 127.0.0.1 >nul
)
exit /b
