#!/usr/bin/env bash
# Gera o APK assinado para upload na Cielo Store.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
cd "$ROOT"

if [[ ! -f local.properties ]]; then
  if [[ -d "${ANDROID_HOME:-}" ]]; then
    echo "sdk.dir=${ANDROID_HOME}" > local.properties
  elif [[ -d "${HOME}/Library/Android/sdk" ]]; then
    echo "sdk.dir=${HOME}/Library/Android/sdk" > local.properties
  else
    echo "Crie android/local.properties com sdk.dir=... (Android SDK)" >&2
    exit 1
  fi
fi

if [[ ! -f keystore.properties ]]; then
  echo "Crie android/keystore.properties a partir de keystore.properties.example" >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
# Exporta CIELO_* se estiverem no keystore.properties
while IFS='=' read -r key value; do
  [[ -z "${key}" || "${key}" =~ ^# ]] && continue
  key="$(echo "$key" | xargs)"
  value="$(echo "${value}" | xargs)"
  if [[ "$key" == "CIELO_CLIENT_ID" || "$key" == "CIELO_ACCESS_TOKEN" ]]; then
    export "$key=$value"
  fi
done < keystore.properties
set +a

if [[ -z "${CIELO_CLIENT_ID:-}" || -z "${CIELO_ACCESS_TOKEN:-}" ]]; then
  echo "Defina CIELO_CLIENT_ID e CIELO_ACCESS_TOKEN (env ou keystore.properties)" >&2
  exit 1
fi

KS_FILE="$(grep -E '^storeFile=' keystore.properties | cut -d= -f2- | xargs)"
KS_PATH="$ROOT/${KS_FILE}"
if [[ ! -f "$KS_PATH" ]]; then
  echo "Keystore não encontrado: $KS_PATH" >&2
  echo "Gere com: keytool -genkeypair -v -keystore app/pdv-cielo.jks -alias pdvcashless -keyalg RSA -keysize 2048 -validity 10000" >&2
  exit 1
fi

chmod +x ./gradlew
./gradlew :app:assembleCieloRelease --no-daemon

APK="$ROOT/app/build/outputs/apk/cielo/release/app-cielo-release.apk"
if [[ ! -f "$APK" ]]; then
  echo "APK não gerado" >&2
  exit 1
fi

mkdir -p "$REPO/apks"
# Reassina com v1+v2 (Cielo Store / "Certificado não localizado")
chmod +x "$ROOT/scripts/resign-cielo-v1v2.sh"
"$ROOT/scripts/resign-cielo-v1v2.sh" "$APK"

echo ""
echo "APK pronto para a Cielo Store:"
echo "  $REPO/apks/PDV-Cielo.apk"
echo "  package: br.com.pyrou.sistemapdv.cielo"
echo "  Assinatura: v1 + v2"
