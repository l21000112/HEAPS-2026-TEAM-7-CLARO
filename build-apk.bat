@echo off
REM ==========================================================================
REM  build-apk.bat  --  LOCAL production APK build (ScamSimulator, Expo SDK 56)
REM  Keep this file in the REPO ROOT, next to frontend\ and backend\.
REM
REM  Output: frontend\android\app\build\outputs\apk\release\app-release.apk
REM
REM  PREREQUISITES - install once:
REM    * Android Studio, which provides the Android SDK + build-tools + JDK 17.
REM      Open it once to install the SDK and accept the licenses.
REM
REM  NOTES:
REM    * frontend\.env holds EXPO_PUBLIC_API_URL + the Firebase config and is
REM      baked into the bundle at BUILD time. Edit it before running; rebuild
REM      to change the URL or keys.
REM    * The release APK is signed with the debug keystore, so it installs on
REM      any phone with install-unknown-apps enabled. Use a real keystore for
REM      Google Play.
REM ==========================================================================
setlocal enableextensions
cd /d "%~dp0"

REM --- React Native 0.85 needs JDK 17; prefer Android Studio's bundled JBR ---
if exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" (
  set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
  echo [setup] Using Android Studio JBR as JAVA_HOME
)

if not exist "frontend\.env" (
  echo [error] frontend\.env not found -- create it first, see frontend\.env.example
  pause
  exit /b 1
)

echo.
echo === [1/3] Installing JS dependencies ===
cd frontend

REM Expose EXPO_PUBLIC_* as real OS env vars so the Gradle bundler inherits them
REM and Babel inlines them into the release JS bundle. Without this the bundle
REM can bake EMPTY values and firebase.ts throws "EXPO_PUBLIC_FIREBASE_* not set".
set NODE_ENV=production
for /f "usebackq eol=# tokens=1,* delims==" %%a in (.env) do (
  if not "%%a"=="" set "%%a=%%b"
)
echo [setup] NODE_ENV=%NODE_ENV%  EXPO_PUBLIC_API_URL=%EXPO_PUBLIC_API_URL%  FIREBASE_KEY=%EXPO_PUBLIC_FIREBASE_API_KEY:~0,10%...

call npm install
if errorlevel 1 goto :fail

echo.
echo === [2/3] Generating native Android project - expo prebuild ===
call npx expo prebuild --platform android --no-install
if errorlevel 1 goto :fail

REM RN 0.85 + AGP 8.12 are incompatible with Gradle 9 (foojay/JvmVendorSpec
REM IBM_SEMERU crash). Pin the wrapper to Gradle 8.13, which AGP 8.12 supports.
powershell -NoProfile -Command "$p='android\gradle\wrapper\gradle-wrapper.properties'; (Get-Content $p) -replace 'gradle-9[\d.]+-bin\.zip','gradle-8.13-bin.zip' | Set-Content $p"

REM Point Gradle at the Android SDK if local.properties is missing
powershell -NoProfile -Command "$p='android\local.properties'; if(-not(Test-Path $p)){ ('sdk.dir=' + (($env:LOCALAPPDATA)+('\Android\Sdk')) -replace '\\','/') | Set-Content $p }"

REM Raise Gradle daemon memory (default 512m metaspace OOMs on AGP 8.12 / Kotlin 2.1.20)
powershell -NoProfile -Command "$p='android\gradle.properties'; (Get-Content $p) -replace 'org\.gradle\.jvmargs=.*','org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError' | Set-Content $p"

echo.
echo === [3/3] Building RELEASE APK (self-contained, embeds JS bundle) - assembleRelease ===
cd android
echo Stopping any stuck Gradle daemons from previous runs...
call gradlew.bat --stop
REM Force a fresh JS bundle so the newly-injected EXPO_PUBLIC_* values get
REM baked in (the bundle task is otherwise cached from the empty-env build).
if exist "app\build\generated\assets\react\release\index.android.bundle" del /q "app\build\generated\assets\react\release\index.android.bundle"
if exist "app\build\intermediates\sourcemaps\react\release\index.android.bundle.packager.map" del /q "app\build\intermediates\sourcemaps\react\release\index.android.bundle.packager.map"
call gradlew.bat assembleRelease
if errorlevel 1 goto :fail

echo.
echo ======================================================================
echo  RELEASE BUILD OK
echo  APK: %CD%\app\build\outputs\apk\release\app-release.apk
echo  (self-contained - no Metro needed)
echo ======================================================================
explorer "%CD%\app\build\outputs\apk\release"
pause
exit /b 0

:fail
echo.
echo *** BUILD FAILED -- scroll up for the error ***
echo common causes: JDK is not 17, or Android SDK / licenses not installed
pause
exit /b 1
