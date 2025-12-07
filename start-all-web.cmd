@echo off
REM Start all TicTacToe services, CLI clients, and web client

echo Starting User Service...
start "User Service" cmd /c "cd /d "%~dp0services\user-service" && npm start"

echo Starting Game Service...
start "Game Service" cmd /c "cd /d "%~dp0services\game-service" && npm start"

echo Starting Room Service...
start "Room Service" cmd /c "cd /d "%~dp0services\room-service" && npm start"

echo Waiting for services to be ready...
timeout /t 5 /nobreak >nul

REM Check health endpoints
echo Checking service health endpoints...
curl -s http://localhost:3001/health
curl -s http://localhost:3003/health
curl -s http://localhost:3002/health

echo.
echo Starting Web Client...
start "Web Client" cmd /c "cd /d "%~dp0clients\web-client" && npm run dev"

echo.
echo Starting CLI Client 1...
start "CLI Client 1" cmd /c "cd /d "%~dp0clients\cli-client" && npm start"

echo.
echo Starting CLI Client 2...
start "CLI Client 2" cmd /c "cd /d "%~dp0clients\cli-client" && npm start"

echo.
echo All services and clients started!
echo Web Client: http://localhost:5173
echo CLI Clients: Two terminal windows opened
echo.
echo To stop all services, run: stop-all.cmd
