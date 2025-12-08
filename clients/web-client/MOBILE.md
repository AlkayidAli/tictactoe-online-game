# TicTacToe Online - Mobile Client Setup

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher) ✓
2. **Android Studio**
   - Download: https://developer.android.com/studio
   - Install Android SDK (API level 33 or higher)
   - Create an Android Virtual Device (AVD) for testing

### Environment Setup

1. Install Android Studio
2. Open Android Studio SDK Manager and install:
   - Android SDK Platform (API 33+)
   - Android SDK Build-Tools
   - Android Emulator
3. Add Android SDK to PATH (if not done automatically)

## Building for Mobile

### 1. Configure for Your Network

Before building, update the `.env` file with your computer's local IP address:

```bash
# Find your IP address
ipconfig  # Windows
# Look for "IPv4 Address" under your active network adapter

# Update .env file
VITE_HOST=192.168.1.XXX  # Replace with your actual IP
```

### 2. Build and Run

**Option A: Use the automated script**

```cmd
.\build-android.cmd
```

**Option B: Manual steps**

```cmd
cd clients\web-client

# Build the web app
npm run build

# Sync with Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

### 3. In Android Studio

1. Wait for Gradle sync to complete
2. **To run on emulator:**
   - Click green play button ▶
   - Select your AVD (or create one)
3. **To build APK:**
   - Menu: Build → Build Bundle(s) / APK(s) → Build APK(s)
   - APK location: `clients/web-client/android/app/build/outputs/apk/debug/`

### 4. Testing on Physical Device

1. Enable Developer Options on your Android device
2. Enable USB Debugging
3. Connect device via USB
4. Select device in Android Studio and click Run

## Development Workflow

### After Code Changes

Run sync command to update the Android app:

```cmd
cd clients\web-client
npm run cap:sync
```

Or use the npm script:

```cmd
npm run android
```

### Important Notes

⚠️ **Network Configuration:**

- Services must be running on your computer
- Mobile device must be on the same network
- Use your computer's IP address, NOT `localhost`
- Update `.env` with correct IP before building

⚠️ **First Build:**

- First Android build may take 5-10 minutes
- Gradle will download dependencies
- Subsequent builds are much faster

## Troubleshooting

### Cannot connect to services

- Verify services are running: `.\start-services-only.cmd`
- Check `.env` has correct IP address
- Ensure mobile device is on same WiFi network
- Try pinging your computer from mobile device

### Android Studio issues

- Make sure Android SDK is properly installed
- Check ANDROID_HOME environment variable
- Sync Gradle files if needed

### Build errors

- Clear build cache: Delete `build` and `.svelte-kit` folders
- Reinstall dependencies: `npm install`
- Clean Android: `cd android && .\gradlew clean`

## Project Structure

```
clients/web-client/
├── src/                    # Source code (shared with web)
├── build/                  # Built static files
├── android/                # Android native project
├── capacitor.config.ts     # Capacitor configuration
├── .env                    # Environment variables
└── package.json           # Scripts: cap:sync, cap:open, android
```

## Available Scripts

```bash
npm run dev          # Start web dev server
npm run build        # Build for production
npm run cap:sync     # Build and sync to Android
npm run cap:open     # Open Android Studio
npm run android      # Build, sync, and run on Android
```
