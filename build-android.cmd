@echo off
echo Building Android APK for TicTacToe Online...
echo.

cd /d "%~dp0clients\web-client"

echo Step 1: Building web app...
call npm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Syncing with Android...
call npx cap sync android
if errorlevel 1 (
    echo Sync failed!
    pause
    exit /b 1
)

echo.
echo Step 3: Opening Android Studio...
call npx cap open android

echo.
echo Android project opened in Android Studio!
echo.
echo Next steps:
echo 1. In Android Studio, click "Build" -^> "Build Bundle(s) / APK(s)" -^> "Build APK(s)"
echo 2. Or click the green play button to run on a connected device/emulator
echo.
pause
