@echo off
REM Restart Room Service only

echo Killing Room Service on port 3002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do taskkill /PID %%a /F >nul 2>&1

echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo Starting Room Service...
cd /d "%~dp0services\room-service"
start "Room Service" cmd /c "npm start"

echo Room Service restarted!
