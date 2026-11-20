# App Android — PDV Cashless para maquininha

App nativo (WebView **não** entra nas lojas PagBank / Cielo Smart / Point).

## Flavors

| Flavor | Terminal | Pagamento | applicationId |
|--------|----------|-----------|---------------|
| `demo` | Emulador / celular | Simulado | `com.pdvcashless.demo` |
| `pagbank` | Moderninha / SmartPOS PagBank | PlugPag | `com.pdvcashless` |
| `cielo` | Cielo Smart (LIO / DX) | Deep Link `lio://payment` | **`br.com.pyrou.pdvcashless.cielo`** |
| `mercadopago` | Mercado Pago Point Smart | Point API + intent nativo | `com.pdvcashless.mp` |

## Abrir no Android Studio

1. Abra a pasta `android/`
2. Sync Gradle
3. Selecione a variante (`cieloDebug`, `mercadopagoDebug`, `pagbankDebug` ou `demoDebug`)
4. `API_BASE_URL` já aponta para a API de produção EasyPanel. Na tela de login dá para trocar.

## Build Cielo (loja / homologação)

```bash
cp keystore.properties.example keystore.properties
# preencha senhas + CIELO_CLIENT_ID + CIELO_ACCESS_TOKEN
./scripts/build-cielo-release.sh
```

APK de upload: `../apks/PDV-Cielo.apk`

## Build manual

```bash
./gradlew :app:assembleCieloRelease
./gradlew :app:assembleMercadopagoRelease
./gradlew :app:assemblePagbankRelease
./gradlew :app:assembleDemoDebug
```

## Fluxo

1. Login operador (URL da API + e-mail/senha)
2. Aproximar pulseira NFC
3. Lançar produtos (botões grandes)
4. **PAGAR** → PIX / Débito / Crédito no app da adquirente
5. Confirmação automática no backend
6. Tela **Saída** libera o cliente

## Guias

- `docs/INSTALACAO_MAQUININHA_CIELO.md`
- `docs/INSTALACAO_MAQUININHA_MERCADOPAGO.md`
- `docs/INSTALACAO_MAQUININHA_PAGBANK.md`
