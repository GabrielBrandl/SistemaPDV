# Guia de instalação — Cielo Smart (LIO / DX)

**SistemaPDV** na maquininha Cielo Smart via **Deep Link** (`lio://payment`).  
O SDK LIO legado foi descontinuado. Integração oficial: [Cielo Smart · Deep Link](https://docs.cielo.com.br/cielo-smart/docs/integracao-via-deep-link).

Site institucional: https://www.cielo.com.br/

---

## 1. O que este guia cobre

| Compatível | Não substitui |
|------------|----------------|
| Terminais **Cielo Smart** (LIO, DX e similares Android) | Cielo Lio antiga só com SDK Java legado |
| Emulador Cielo Smart (Android 7.1 ou 10) | Instalar o emulador **no** terminal físico |

Fluxo:

1. App **PDV Cielo** (flavor `cielo`) na maquininha  
2. Lê pulseira NFC  
3. Lança produtos  
4. Toca PIX / Débito / Crédito  
5. O app abre o pagamento Cielo (`lio://payment`) com **foreground service**  
6. Cielo devolve o resultado em `order://response`  
7. O PDV confirma no backend  

---

## 2. Pré-requisitos comerciais

1. Conta no [Portal de desenvolvedores Cielo](https://www.cielo.com.br/)  
2. App cadastrado como integração **URI** (Deep Link)  
3. **Client ID** e **Access Token**  
4. Terminal Cielo Smart de homologação **ou** emulador  
5. Backend PDV no ar (HTTPS)

No `AndroidManifest` o app já declara:

```xml
<meta-data android:name="cs_integration_type" android:value="uri" />
<queries>
  <package android:name="com.ads.lio.uriappclient" />
</queries>
```

Sem o metadata a Cielo responde *metadata de integração não encontrado*.  
Sem o `<queries>` (Android 11+) o sistema bloqueia o deep link para o UriApp.

---

## 3. Backend

No `.env` / EasyPanel:

```env
SOFTPOS_PROVIDER=cielo
PIX_PROVIDER=cielo
CIELO_CLIENT_ID=seu_client_id
CIELO_ACCESS_TOKEN=seu_access_token
```

Reinicie o serviço `sistema-pdv`.

Com `SOFTPOS_PROVIDER=cielo`, `POST /payments/card` **sempre** cria sessão e devolve `softpos_request.cielo` (Deep Link `lio://`).  
`CIELO_*` no backend são recomendados (mesmo par do APK), mas **não bloqueiam** o pagamento on-device se o flavor `cielo` já tiver as credenciais no BuildConfig.

Checklist consolidado: `DEPLOY_UPDATE.md`.

---

## 4. Gerar o APK Cielo (arquivo da loja)

**Package ID (cadastrar na Cielo Store):** `br.com.pyrou.pdvcashless.cielo`  
**Arquivo a enviar:** `apks/PDV-Cielo.apk` (ou `app-cielo-release.apk`)

1. Android Studio → pasta `android/`  
2. **Build Variants** → `cieloRelease`  
3. Configure assinatura + credenciais:

```bash
cp android/keystore.properties.example android/keystore.properties
# edite storePassword, keyPassword, CIELO_CLIENT_ID, CIELO_ACCESS_TOKEN
# gere o JKS se ainda não existir:
keytool -genkeypair -v -keystore android/app/pdv-cielo.jks \
  -alias pdvcashless -keyalg RSA -keysize 2048 -validity 10000
```

4. Build:

```bash
cd android
./scripts/build-cielo-release.sh
```

Ou manualmente:

```bash
export CIELO_CLIENT_ID="seu_client_id"
export CIELO_ACCESS_TOKEN="seu_access_token"
./gradlew :app:assembleCieloRelease
```

APK gerado:

`android/app/build/outputs/apk/cielo/release/app-cielo-release.apk`  
→ copiado para `apks/PDV-Cielo.apk`

---

## 5. Instalar no terminal

1. Wi‑Fi no terminal  
2. Instale o APK (ADB ou loja Cielo após homologação)  
3. Abra **PDV Cielo**  
4. URL da API: `https://sistema-pdv.129-121-39-17.sslip.io/api/v1` (ou seu domínio HTTPS)  
5. Login operador (sem credenciais de demo pré-preenchidas)  
6. Teste: pulseira → item → Débito → confirmar na tela Cielo  

A Cielo exige **foreground** durante o pagamento. O app inicia `PaymentKeepAliveService` antes do `lio://`.

---

## 6. Homologação Cielo Store

1. Cadastre o pacote **`br.com.pyrou.pdvcashless.cielo`** no portal  
2. Grave o fluxo completo (débito, crédito, PIX se habilitado)  
3. Envie o APK **release assinado** (`PDV-Cielo.apk`)  
4. Após aprovação, promova para produção e instale pelo catálogo do terminal  

### Checklist anti-reprova (já no projeto)

- [x] `cs_integration_type=uri`
- [x] `<queries>` → `com.ads.lio.uriappclient`
- [x] Callback `order://response` na `PayActivity`
- [x] Foreground service durante o pagamento
- [x] `minSdk 24` / `targetSdk 29` (pré-requisito Cielo Smart)
- [x] Sem WebView como app principal
- [x] Sem e-mail/senha/UID de demo hardcoded no flavor cielo
- [x] HTTPS only (sem cleartext no flavor cielo)
- [x] Sem permissão PlugPag / intents de outras adquirentes no APK cielo
- [ ] Client ID + Access Token no build do APK
- [ ] APK assinado com o mesmo keystore que será usado nas atualizações
- [ ] Package ID idêntico ao cadastrado na loja

---

## 7. Problemas comuns

| Problema | Solução |
|----------|---------|
| App Cielo não abre | Terminal precisa do UriApp; declare `com.ads.lio.uriappclient` em `<queries>` |
| Sem retorno após pagar | Foreground service + não mate o PDV |
| Metadata não encontrado | Confirme o `<meta-data cs_integration_type=uri>` |
| Credenciais vazias | Exporte `CIELO_CLIENT_ID` / `CIELO_ACCESS_TOKEN` no build |
| Assinatura rejeitada | Use Signature Scheme v2 e o **mesmo** JKS nas atualizações |
