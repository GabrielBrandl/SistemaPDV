# App Android Smart POS

Scaffold do aplicativo para maquininhas Android (Stone, Cielo, PagSeguro).

## Estrutura

```
android/app/src/main/java/com/pdvcashless/
├── gateway/          # PaymentGateway + Stone/Cielo/PagSeguro
├── data/local/       # Room entities (sync_queue)
├── nfc/              # Extensões NFC (UID hex)
└── ui/               # Jetpack Compose (a implementar)
```

## Próximos passos

1. Abrir pasta `android/` no Android Studio
2. Configurar `local.properties` com `API_BASE_URL` e `STONE_CODE`
3. Adicionar dependências Stone SDK no `build.gradle`
4. Implementar telas Compose: login, grade de produtos, leitura NFC
5. Implementar WorkManager para sync offline (Outbox Pattern)

## Leitura NFC

```kotlin
nfcAdapter.enableReaderMode(activity, { tag ->
    val uid = tag.id.toHexString()
    viewModel.processNfcUid(uid)
}, NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_NFC_B, null)
```

## Permissões (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="true" />
```
