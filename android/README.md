# App Android — PDV Cashless para maquininha

App nativo (WebView **não** entra nas lojas PagBank / Cielo Smart / Point).

## Flavors

| Flavor | Terminal | Pagamento |
|--------|----------|-----------|
| `demo` | Emulador / celular | Simulado |
| `pagbank` | Moderninha / SmartPOS PagBank | PlugPag |
| `cielo` | Cielo Smart (LIO / DX) | Deep Link `lio://payment` |
| `mercadopago` | Mercado Pago Point Smart | Point API + intent nativo |

## Abrir no Android Studio

1. Abra a pasta `android/`
2. Sync Gradle
3. Selecione a variante (`cieloDebug`, `mercadopagoDebug`, `pagbankDebug` ou `demoDebug`)
4. `API_BASE_URL` já aponta para a API de produção EasyPanel. Na tela de login dá para trocar.

## Build

```bat
gradlew.bat :app:assembleCieloRelease
gradlew.bat :app:assembleMercadopagoRelease
gradlew.bat :app:assemblePagbankRelease
gradlew.bat :app:assembleDemoDebug
```

Cielo (credenciais no build):

```powershell
$env:CIELO_CLIENT_ID="..."
$env:CIELO_ACCESS_TOKEN="..."
gradlew.bat :app:assembleCieloRelease
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
