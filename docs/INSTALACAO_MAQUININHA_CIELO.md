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
5. O app abre o pagamento Cielo (`lio://payment`)  
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
```

Sem esse metadata a Cielo responde *metadata de integração não encontrado*.

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

---

## 4. Gerar o APK Cielo

1. Android Studio → pasta `android/`  
2. **Build Variants** → `cieloRelease` (ou `cieloDebug` na homologação)  
3. Passe as credenciais no ambiente **antes** do Gradle:

Windows (PowerShell):

```powershell
$env:CIELO_CLIENT_ID="seu_client_id"
$env:CIELO_ACCESS_TOKEN="seu_access_token"
.\gradlew.bat :app:assembleCieloRelease
```

APK:

`android/app/build/outputs/apk/cielo/release/app-cielo-release.apk`

---

## 5. Instalar no terminal

1. Wi‑Fi no terminal  
2. Instale o APK (ADB ou loja Cielo após homologação)  
3. Abra **PDV Cielo**  
4. URL da API: `https://sistema-pdv.9nb5f0.easypanel.host/api/v1` (ou seu domínio)  
5. Login operador  
6. Teste: pulseira → item → Débito → confirmar na tela Cielo  

A Cielo exige **foreground** durante o pagamento. Não force o app para segundo plano no checkout.

---

## 6. Homologação Cielo

1. Cadastre o pacote `com.pdvcashless.cielo` no portal  
2. Grave o fluxo completo  
3. Envie o APK para a loja Cielo Smart  
4. Após aprovação, instale pelo catálogo do terminal  

---

## 7. Checklist

- [ ] Client ID + Access Token no Gradle e no backend  
- [ ] Flavor `cielo`  
- [ ] Metadata `cs_integration_type=uri` (já no projeto)  
- [ ] Callback `order://response` (já no `PayActivity`)  
- [ ] Teste débito, crédito e PIX  
- [ ] Saída libera só comanda paga  

---

## 8. Problemas comuns

| Problema | Solução |
|----------|---------|
| App Cielo não abre | Terminal precisa do app de pagamento Cielo; teste no emulador Smart |
| Sem retorno após pagar | Não mate o PDV; a Cielo recomenda serviço em foreground |
| Metadata não encontrado | Confirme o `<meta-data>` no manifest |
| Credenciais vazias | Exporte `CIELO_CLIENT_ID` / `CIELO_ACCESS_TOKEN` no build |
