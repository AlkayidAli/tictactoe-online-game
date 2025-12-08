@echo off
echo Starting Web Client...
echo.

cd /d "%~dp0clients\web-client"

echo Web client starting on http://localhost:5173
echo.
npm run dev
