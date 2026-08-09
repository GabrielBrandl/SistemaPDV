# App Android — PDV Cashless para maquininha PagBank (SmartPOS)

App nativo obrigatório: WebView **não** é aceito na loja PagBank.

## Flavors

| Flavor | Uso |
|--------|-----|
| `demo` | Emulador / celular sem PlugPag (pagamento simulado) |
| `pagbank` | Moderninha Smart / terminais PagBank (PlugPag real) |

## Abrir no Android Studio

1. Abra a pasta `android/`
2. Sync Gradle
3. Selecione variante `pagbankDebug` (terminal) ou `demoDebug` (teste)
4. Em `app/build.gradle.kts`, ajuste `API_BASE_URL` para seu backend HTTPS

## Build APK PagBank

```bash
./gradlew :app:assemblePagbankRelease
```

APK em: `app/build/outputs/apk/pagbank/release/`

## Fluxo

1. Login (operador/saída) apontando para a API
2. Ativação do terminal com código PagBank (não-demo)
3. PDV: NFC da pulseira → produtos → Pagar
4. PlugPag: débito / crédito / PIX na maquininha
5. App confirma no backend (`POST /payments/:id/confirm`)
6. Tela Saída libera o cliente

## Parceria PagBank

É necessário contrato comercial + terminal de homologação + submissão do APK na loja PagBank.
Docs: https://developer.pagbank.com.br/docs/desenvolvimento-smartpos
