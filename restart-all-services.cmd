@echo off
echo Stopping all services...
echo.

taskkill /F /IM node.exe >nul 2>&1

echo Waiting 3 seconds...
timeout /t 3 /nobreak > nul

echo Starting services...
cd /d "%~dp0"
call start-services-only.cmd

echo.
echo All services restarted!
