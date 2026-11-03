# Guia de instalação — Mercado Pago Point

**SistemaPDV** no Point Smart / Pro. Duas camadas oficiais:

1. **API Point** — o backend cria uma *order* (`POST /v1/orders`, `type=point`) e o terminal mostra a cobrança  
2. **App no terminal** — flavor Android `mercadopago` para pulseira NFC + cardápio **na** maquininha  

Docs: [Mercado Pago Developers · Point](https://www.mercadopago.com.br/developers/pt/docs/mp-point/overview)  
Pagamento: [Processar pagamentos Point](https://www.mercadopago.com.br/developers/pt/docs/mp-point/payment-processing)

---

## 1. Hardware

| Terminal | Modo |
|----------|------|
| Point Smart 1 / 2 | App PDV **no** terminal + API |
| Point Pro 2 / 3 | API Point (PDV na nuvem / outro dispositivo) |

O terminal precisa estar em **modo PDV** (não Standalone).

---

## 2. Conta e aplicação

1. Crie a aplicação em [Suas integrações](https://www.mercadopago.com.br/developers/panel/app)  
2. Copie o **Access Token** (`APP_USR-...`) de teste e, depois, o de produção  
3. Cadastre a **chave PIX** se for oferecer PIX  
4. Associe o terminal à conta e anote o `terminal_id`  

Listar terminais:

```bash
curl -X GET "https://api.mercadopago.com/terminals/v1/list?limit=50&offset=0" ^
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

O `id` vem no formato `NEWLAND_N950__N950...` (use **exatamente** esse valor).

---

## 3. Backend

```env
SOFTPOS_PROVIDER=mercadopago
PIX_PROVIDER=mercadopago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-...
MERCADOPAGO_TERMINAL_ID=NEWLAND_N950__SEU_SERIAL
```

O que acontece no pagamento:

1. Operador toca **Débito / Crédito / PIX**  
2. API cria a order Point e envia ao terminal  
3. Cliente paga na maquininha  
4. O PDV consulta `GET /payments/:id` até `approved` (ou webhook)  

Sem `MERCADOPAGO_TERMINAL_ID` a order não vai ao Point — o app Android ainda tenta o scheme `mercadopago://point`.

---

## 4. App no Point Smart

```bat
cd android
gradlew.bat :app:assembleMercadopagoRelease
```

APK: `android/app/build/outputs/apk/mercadopago/release/`

1. Instale no Point Smart (homologação / loja de apps MP)  
2. Login operador + URL da API  
3. Pulseira NFC → produtos → PAGAR  

Homologação de **SmartApp** no Point exige cadastro no programa de terceiros do Mercado Pago. Enquanto isso, use a **API Point** (passo 3) com o terminal em modo PDV.

---

## 5. Checklist

- [ ] Aplicação criada no portal Developers  
- [ ] Access Token no EasyPanel  
- [ ] Terminal em modo PDV  
- [ ] `MERCADOPAGO_TERMINAL_ID` igual ao `id` da API  
- [ ] Teste crédito, débito e PIX  
- [ ] Flavor `mercadopago` se o PDV rodar **no** Point Smart  

---

## 6. Problemas comuns

| Problema | Solução |
|----------|---------|
| Order não aparece no Point | Modo PDV + `terminal_id` idêntico ao da listagem; botão atualizar no terminal |
| 401 na API | Token de teste vs produção trocado |
| PIX não gera QR | Chave PIX cadastrada na conta MP |
| App Point não abre | Instale o flavor `mercadopago` **ou** use só a API Point |
