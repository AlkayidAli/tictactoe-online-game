@echo off
echo Starting Backend Services...
echo.

echo Starting User Service on port 3001...
start "User Service" cmd /k "cd /d "%~dp0services\user-service" && npm start"

timeout /t 2 /nobreak > nul

echo Starting Room Service on port 3002...
start "Room Service" cmd /k "cd /d "%~dp0services\room-service" && npm start"

timeout /t 2 /nobreak > nul

echo Starting Game Service on port 3003...
start "Game Service" cmd /k "cd /d "%~dp0services\game-service" && npm start"

echo.
echo All backend services started!
echo User Service: http://localhost:3001
echo Room Service: http://localhost:3002
echo Game Service: http://localhost:3003
echo.
echo Close the service windows to stop them.
