# Guia de instalação — Maquininha PagBank (SmartPOS / Moderninha)

**SistemaPDV** — instalação passo a passo no terminal PagSeguro/PagBank Android  
**Importante:** maquininhas PagBank exigem **app nativo Android** com SDK **PlugPag**. Não é possível instalar só o site no Chrome da Moderninha.

---

## 1. O que este guia cobre

| Hardware compatível | Não compatível |
|---------------------|----------------|
| Moderninha Smart e terminais **PagBank SmartPOS** (Android) | Maquininhas só TEF “fechadas” sem Android |
| Modelos com PlugPag (A930, P2, GPOS780, A50, etc.) | Stone/Cielo sem o SDK específico deles (outro guia) |

Fluxo no terminal:

1. App PDV Cashless na maquininha  
2. Lê **pulseira NFC** do cliente  
3. Lança produtos / abre comanda  
4. Cobra **PIX, débito ou crédito** pelo **PlugPag** (PagBank)  
5. Confirma pagamento no servidor  
6. Na saída, libera o cliente  

---

## 2. Pré-requisitos comerciais (PagBank)

Antes de instalar em produção:

1. Conta PJ / estabelecimento PagBank  
2. **Parceria comercial** PagBank para SmartPOS (canal desenvolvedor)  
3. Terminal de **homologação/debug** (geralmente GPOS780 ou P2)  
4. Código de **ativação** do terminal  
5. Acesso ao portal do desenvolvedor: https://developer.pagbank.com.br  

Sem parceria, você ainda pode:

- Subir o **backend**  
- Gerar APK no flavor **`demo`** e testar o fluxo em celular/emulador  
- **Não** processar dinheiro real na maquininha  

---

## 3. Preparar o servidor (API)

A maquininha precisa alcançar a API pela internet (HTTPS recomendado).

### 3.1 No computador / VPS

```bash
cd backend
npm install
copy .env.example .env   # Windows
```

Configure no `.env`:

```env
PORT=3001
DB_TYPE=sqlite
JWT_SECRET=uma_chave_forte
PIX_PROVIDER=pagbank
SOFTPOS_PROVIDER=pagbank
```

Suba:

```bash
npm run start:dev
```

### 3.2 Expor a API

- Desenvolvimento: IP da rede (`http://192.168.x.x:3001/api/v1`)  
- Produção: publique com **HTTPS** (VPS, Railway, Render, etc.)

Anote a URL final, exemplo:

`https://seu-dominio.com/api/v1`

---

## 4. Gerar o aplicativo Android

### 4.1 Ferramentas

- Android Studio (Hedgehog ou mais novo)  
- JDK 17  
- Código do repositório: pasta `android/`

### 4.2 Abrir o projeto

1. Abra o Android Studio  
2. **Open** → selecione a pasta `SistemaPDV/android`  
3. Aguarde o **Gradle Sync**  

### 4.3 Configurar a URL da API

Em `android/app/build.gradle.kts`, no `defaultConfig`:

```kotlin
buildConfigField("String", "API_BASE_URL", "\"https://seu-dominio.com/api/v1\"")
```

Ou informe a URL na tela de login do app (campo “URL da API”).

### 4.4 Escolher o flavor

| Flavor | Quando usar |
|--------|-------------|
| `demoDebug` | Teste sem maquininha (pagamento simulado) |
| `pagbankDebug` | Terminal PagBank de homologação |
| `pagbankRelease` | Submissão / produção |

No Android Studio: **Build Variants** → `pagbankDebug` ou `pagbankRelease`.

### 4.5 Gerar o APK PagBank

```bash
cd android
./gradlew :app:assemblePagbankRelease
```

Windows:

```bat
gradlew.bat :app:assemblePagbankRelease
```

Arquivo gerado:

`android/app/build/outputs/apk/pagbank/release/app-pagbank-release.apk`

---

## 5. Instalar na maquininha PagBank

### 5.1 Homologação (terminal debug)

1. Ligue o terminal e conecte no **Wi‑Fi**  
2. Ative **modo desenvolvedor** / depuração conforme manual PagBank do modelo  
3. Conecte o cabo USB no PC **ou** copie o APK via armazenamento interno  
4. Instale o APK:

```bash
adb install -r app-pagbank-release.apk
```

5. Abra o app **PDV Cashless**  
6. Informe:
   - URL da API  
   - Login: `operador@pdv.local` / `operador123` (ou usuário do seu tenant)  
   - Código de **ativação PagBank** do estabelecimento  
7. Confirme a ativação do pinpad/PlugPag  

### 5.2 Produção (loja PagBank)

1. Grave um vídeo do fluxo completo (login → NFC → venda → pagamento PlugPag)  
2. Abra chamado de **Homologação de aplicativo** no suporte PagBank  
3. Envie o APK + documentação  
4. Após aprovação, publique na **loja de aplicativos PagBank**  
5. No terminal do cliente, instale o app pela loja PagBank  

> Aplicativos WebView/híbridos **não** são aceitos. Este app é nativo Kotlin.

---

## 6. Uso diário na maquininha

### Operador (bar / caixa)

1. Abrir **PDV Cashless**  
2. Login operador  
3. **Aproximar pulseira** do cliente (NFC)  
4. Tocar nos produtos para lançar  
5. Tocar **Pagar**  
6. Escolher **PIX**, **Débito** ou **Crédito**  
7. O **PlugPag** assume a tela — cliente aproxima cartão ou paga PIX  
8. App confirma no servidor automaticamente  

### Saída

1. Login `saida@pdv.local` / `saida123` (ou botão Saída)  
2. Aproximar pulseira  
3. Se **LIBERAR** → liberar e recolher o cartão  
4. Se **BLOQUEADO** → cliente ainda deve pagar  

---

## 7. Checklist de instalação

- [ ] Parceria PagBank SmartPOS ativa  
- [ ] Terminal debug/homologação em mãos  
- [ ] Backend online (URL acessível pelo Wi‑Fi do terminal)  
- [ ] Android Studio sync OK  
- [ ] Flavor `pagbank` selecionado  
- [ ] APK gerado (`assemblePagbankRelease`)  
- [ ] APK instalado no terminal  
- [ ] Código de ativação PagBank informado no login  
- [ ] Teste: pulseira → item → débito/PIX → saída  

---

## 8. Problemas comuns

| Problema | Solução |
|----------|---------|
| Gradle não baixa o PlugPag | Verifique Maven `PlugPagServiceWrapper` no `settings.gradle.kts` e internet |
| App não instala | Use terminal Android PagBank; libere fontes desconhecidas / ADB |
| Ativação falha | Código de ativação incorreto ou terminal sem vínculo ao estabelecimento |
| Pagamento não confirma no PDV | Conferir URL da API e token JWT; ver log do app |
| NFC da pulseira não lê | NFC ligado; aproximar da área NFC do terminal; testar UID manual |
| “WebView não permitido” | Use este APK nativo, não o site no Chrome da maquininha |

---

## 9. Diferença: celular vs maquininha

| | Celular (guia antigo) | Maquininha PagBank (este guia) |
|--|----------------------|--------------------------------|
| Interface | Chrome / PWA | App Android nativo |
| Pagamento | SoftPOS demo / PSP | **PlugPag** oficial |
| Instalação | Abrir URL | Instalar **APK** / loja PagBank |
| Homologação | Livre | Obrigatória PagBank |

---

## 10. Contatos e links

- Repositório: https://github.com/GabrielBrandl/SistemaPDV  
- Pasta do app: `android/`  
- Docs PagBank SmartPOS: https://developer.pagbank.com.br/docs/desenvolvimento-smartpos  
- SDK PlugPag: https://github.com/pagseguro/pagseguro-sdk-plugpagservicewrapper  

---

## 11. Resumo rápido

1. Suba o **backend** com URL pública  
2. Gere o APK **`pagbankRelease`** no Android Studio  
3. Instale na **Moderninha/SmartPOS** (ADB ou loja após homologação)  
4. Ative com o **código PagBank**  
5. Use pulseira NFC + PIX/débito/crédito pelo PlugPag  
6. Liberar na saída  

Documento gerado para o SistemaPDV — instalação em maquininha PagBank.
