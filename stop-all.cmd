@echo off
REM Stop all TicTacToe services and stray Node/CLI processes

echo Killing known service ports (3001, 3002, 3003)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3003') do taskkill /PID %%a /F >nul 2>&1

echo Killing Node.js processes that may have been spawned...
taskkill /IM node.exe /F >nul 2>&1

REM Avoid killing all cmd.exe to prevent closing your current terminal
echo Skipping blanket cmd.exe kill to keep your shell open.

echo Done. If your terminal closed, reopen a new one.
exit /b 0