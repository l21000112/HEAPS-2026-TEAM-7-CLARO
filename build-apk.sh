#!/bin/bash
# ==========================================================================
#  build-apk.sh  --  LOCAL production APK build (ScamSimulator, Expo SDK 56)
#  Keep this file in the REPO ROOT, next to frontend/ and backend/.
#
#  Output: frontend/android/app/build/outputs/apk/release/app-release.apk
#
#  PREREQUISITES - install once:
#    * Android Studio, which provides the Android SDK + build-tools + JDK 17.
#      Open it once to install the SDK and accept the licenses.
#
#  NOTES:
#    * frontend/.env holds EXPO_PUBLIC_API_URL + the Firebase config and is
#      baked into the bundle at BUILD time. Edit it before running; rebuild
#      to change the URL or keys.
#    * The release APK is signed with the debug keystore, so it installs on
#      any phone with install-unknown-apps enabled. Use a real keystore for
#      Google Play.
# ==========================================================================
set -u
cd "$(cd "$(dirname "$0")" && pwd)"

fail() {
  echo
  echo "*** BUILD FAILED -- scroll up for the error ***"
  echo "common causes: JDK is not 17, or Android SDK / licenses not installed"
  exit 1
}

# --- React Native 0.85 needs JDK 17; prefer Android Studio's bundled JBR ---
JBR_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
if [ -x "$JBR_HOME/bin/java" ]; then
  export JAVA_HOME="$JBR_HOME"
  echo "[setup] Using Android Studio JBR as JAVA_HOME"
fi

if [ ! -f "frontend/.env" ]; then
  echo "[error] frontend/.env not found -- create it first, see frontend/.env.example"
  exit 1
fi

echo
echo "=== [1/3] Installing JS dependencies ==="
cd frontend || fail

# Expose EXPO_PUBLIC_* as real OS env vars so the Gradle bundler inherits them
# and Babel inlines them into the release JS bundle. Without this the bundle
# can bake EMPTY values and firebase.ts throws "EXPO_PUBLIC_FIREBASE_* not set".
export NODE_ENV=production
while IFS='=' read -r key value; do
  # skip blank lines and comments
  [ -z "$key" ] && continue
  case "$key" in \#*) continue ;; esac
  # strip possible surrounding quotes from the value
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  export "$key=$value"
done < <(grep -v '^[[:space:]]*$' .env | grep -v '^[[:space:]]*#')

echo "[setup] NODE_ENV=$NODE_ENV  EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL  FIREBASE_KEY=${EXPO_PUBLIC_FIREBASE_API_KEY:0:10}..."

npm install
if [ $? -ne 0 ]; then fail; fi

echo
echo "=== [2/3] Generating native Android project - expo prebuild ==="
npx expo prebuild --platform android --no-install
if [ $? -ne 0 ]; then fail; fi

# RN 0.85 + AGP 8.12 are incompatible with Gradle 9 (foojay/JvmVendorSpec
# IBM_SEMERU crash). Pin the wrapper to Gradle 8.13, which AGP 8.12 supports.
sed -i '' -E 's/gradle-9[0-9.]+-bin\.zip/gradle-8.13-bin.zip/' android/gradle/wrapper/gradle-wrapper.properties

# Point Gradle at the Android SDK if local.properties is missing
if [ ! -f "android/local.properties" ]; then
  echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
fi

# Raise Gradle daemon memory (default 512m metaspace OOMs on AGP 8.12 / Kotlin 2.1.20)
if grep -q '^org\.gradle\.jvmargs=' android/gradle.properties; then
  sed -i '' -E 's/^org\.gradle\.jvmargs=.*/org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError/' android/gradle.properties
else
  echo "org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError" >> android/gradle.properties
fi

echo
echo "=== [3/3] Building RELEASE APK (self-contained, embeds JS bundle) - assembleRelease ==="
cd android || fail
echo "Stopping any stuck Gradle daemons from previous runs..."
chmod +x ./gradlew
./gradlew --stop

# Force a fresh JS bundle so the newly-injected EXPO_PUBLIC_* values get
# baked in (the bundle task is otherwise cached from the empty-env build).
rm -f "app/build/generated/assets/react/release/index.android.bundle"
rm -f "app/build/intermediates/sourcemaps/react/release/index.android.bundle.packager.map"

./gradlew assembleRelease
if [ $? -ne 0 ]; then fail; fi

echo
echo "======================================================================"
echo " RELEASE BUILD OK"
echo " APK: $(pwd)/app/build/outputs/apk/release/app-release.apk"
echo " (self-contained - no Metro needed)"
echo "======================================================================"
open "$(pwd)/app/build/outputs/apk/release"
exit 0