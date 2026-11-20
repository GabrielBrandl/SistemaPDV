#!/usr/bin/env bash
# Reassina o APK Cielo com Signature Scheme v1 + v2 (Cielo Store).
# Docs: https://docs.cielo.com.br/cielo-smart/docs/pre-requisitos
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
APK_IN="${1:-$ROOT/app/build/outputs/apk/cielo/release/app-cielo-release.apk}"

[[ -f "$APK_IN" ]] || { echo "APK não encontrado: $APK_IN" >&2; exit 1; }
[[ -f "$ROOT/keystore.properties" ]] || { echo "Falta keystore.properties" >&2; exit 1; }

storeFile=$(awk -F= '/^storeFile=/{print substr($0,index($0,"=")+1)}' "$ROOT/keystore.properties" | tr -d '\r')
storePassword=$(awk -F= '/^storePassword=/{print substr($0,index($0,"=")+1)}' "$ROOT/keystore.properties" | tr -d '\r')
keyAlias=$(awk -F= '/^keyAlias=/{print substr($0,index($0,"=")+1)}' "$ROOT/keystore.properties" | tr -d '\r')
keyPassword=$(awk -F= '/^keyPassword=/{print substr($0,index($0,"=")+1)}' "$ROOT/keystore.properties" | tr -d '\r')
KS="$ROOT/$storeFile"

ANDROID_HOME="${ANDROID_HOME:-$REPO/.tools/android-sdk}"
JAVA_HOME="${JAVA_HOME:-$REPO/.tools/jdk-17.0.13+11/Contents/Home}"
BUILD_TOOLS="$ANDROID_HOME/build-tools/34.0.0"
export PATH="$JAVA_HOME/bin:$PATH"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

WORK="$TMP/work.apk"
ALIGNED="$TMP/aligned.apk"
SIGNED="$TMP/signed.apk"

cp "$APK_IN" "$WORK"
zip -d "$WORK" 'META-INF/*.RSA' 'META-INF/*.SF' 'META-INF/MANIFEST.MF' \
  'META-INF/*.DSA' 'META-INF/*.EC' 2>/dev/null || true

"$BUILD_TOOLS/zipalign" -f -p 4 "$WORK" "$ALIGNED"

# min-sdk-version 1 no apksigner: grava bloco v1 mesmo com android:minSdkVersion=24 no manifest
"$BUILD_TOOLS/apksigner" sign \
  --ks "$KS" \
  --ks-key-alias "$keyAlias" \
  --ks-pass "pass:$storePassword" \
  --key-pass "pass:$keyPassword" \
  --v1-signing-enabled true \
  --v2-signing-enabled true \
  --v3-signing-enabled false \
  --min-sdk-version 1 \
  --out "$SIGNED" \
  "$ALIGNED"

echo "=== verificação (min-sdk 1 = v1+v2 visíveis) ==="
"$BUILD_TOOLS/apksigner" verify --verbose --min-sdk-version 1 "$SIGNED"

HAS_RSA=$(unzip -l "$SIGNED" | grep -cE 'META-INF/.*\.(RSA|DSA|EC)$' || true)
if [[ "$HAS_RSA" -lt 1 ]]; then
  echo "ERRO: META-INF sem certificado JAR (v1)" >&2
  exit 1
fi

V1=$("$BUILD_TOOLS/apksigner" verify --verbose --min-sdk-version 1 "$SIGNED" 2>&1 | grep -c "v1 scheme (JAR signing): true" || true)
V2=$("$BUILD_TOOLS/apksigner" verify --verbose --min-sdk-version 1 "$SIGNED" 2>&1 | grep -c "v2 scheme (APK Signature Scheme v2): true" || true)
if [[ "$V1" -lt 1 || "$V2" -lt 1 ]]; then
  echo "ERRO: esperava v1=true e v2=true" >&2
  exit 1
fi

mkdir -p "$REPO/apks"
cp -f "$SIGNED" "$REPO/apks/PDV-Cielo.apk"
VN=$("$BUILD_TOOLS/aapt" dump badging "$SIGNED" | sed -n "s/.*versionName='\([^']*\)'.*/\1/p" | head -1)
VC=$("$BUILD_TOOLS/aapt" dump badging "$SIGNED" | sed -n "s/.*versionCode='\([^']*\)'.*/\1/p" | head -1)
cp -f "$SIGNED" "$REPO/apks/PDV-Cielo-${VN}.apk"
keytool -exportcert -rfc \
  -keystore "$KS" -alias "$keyAlias" -storepass "$storePassword" \
  -file "$REPO/apks/PDV-Cielo-upload-cert.pem" >/dev/null
echo "OK: apks/PDV-Cielo.apk (versionCode=$VC versionName=$VN)"
echo "OK: apks/PDV-Cielo-upload-cert.pem"
unzip -l "$SIGNED" | grep -E 'META-INF/.*\.(RSA|SF|MF)$'
echo "Assinatura: v1 + v2"
