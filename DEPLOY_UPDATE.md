# Checklist de go-live — PDV Cashless

Use este guia antes de colocar um tenant em produção (Cielo LIO + NFC-e + impressoras).

## 1. Backend / Docker

- [ ] `JWT_SECRET` forte e único
- [ ] Postgres com backup (volume `pdv_pgdata` ou managed DB)
- [ ] HTTPS no domínio do painel/API
- [ ] Health: `GET /api/v1/health`

### SoftPOS Cielo (pagamentos na LIO)

```env
SOFTPOS_PROVIDER=cielo
CIELO_CLIENT_ID=seu_client_id
CIELO_ACCESS_TOKEN=seu_access_token
```

- [ ] `SOFTPOS_PROVIDER=cielo` no compose / EasyPanel
- [ ] `CIELO_CLIENT_ID` + `CIELO_ACCESS_TOKEN` **no build do APK** (obrigatório para `lio://`)
- [ ] Backend: `CIELO_CLIENT_ID` opcional (só metadados); **não** envia `accessToken` na API
- [ ] Confirmar `GET /api/v1/payments/providers` → `terminals.cielo.ready === true`
- [ ] Default seguro: sem SoftPOS live, manter `SOFTPOS_PROVIDER=demo`

Detalhe: o token Cielo fica só no APK (`BuildConfig`). Confirm SoftPOS exige `softpos_transaction_id` fora do demo.

Guia completo: `docs/INSTALACAO_MAQUININHA_CIELO.md`

### SoftPOS Mercado Pago / PagBank (alternativa)

- [ ] MP: `SOFTPOS_PROVIDER=mercadopago` + `MERCADOPAGO_ACCESS_TOKEN` + `MERCADOPAGO_TERMINAL_ID`
- [ ] PagBank: `SOFTPOS_PROVIDER=pagbank` + APK flavor `pagbank`

## 2. APK na maquininha Cielo (LIO / DX)

```powershell
$env:CIELO_CLIENT_ID="seu_client_id"
$env:CIELO_ACCESS_TOKEN="seu_access_token"
.\gradlew.bat :app:assembleCieloRelease
```

- [ ] Build flavor **`cielo`** com o **mesmo** `CIELO_CLIENT_ID` / `CIELO_ACCESS_TOKEN` do backend
- [ ] Instalar APK no terminal (`br.com.pyrou.pdvcashless.cielo`)
- [ ] URL da API HTTPS apontando para o backend
- [ ] Login operador (bartender / cashier)
- [ ] Teste: pulseira → item → Débito/Crédito → Deep Link `lio://` → retorno `order://response`
- [ ] Homologação / loja Cielo Smart se for distribuição oficial

## 3. NFC-e (Focus NFe) por empresa

Cada tenant configura o próprio token no painel:

1. Login admin da empresa → **Emissor NFC-e** (`/fiscal`)
2. Seção **Configuração Focus NFe**
3. Preencher token Focus, ambiente (`homologacao` / `producao`), CNPJ (14 dígitos), razão social, série

API: `PATCH /api/v1/fiscal/config`

- [ ] Token Focus NFe salvo no tenant
- [ ] Ambiente: `homologacao` até validar; depois `producao`
- [ ] CNPJ + série NFC-e corretos
- [ ] Emitir nota de um pedido pago de teste
- [ ] Sem token: sistema permanece em **homologação local** (seguro para trial)

## 4. Impressoras de rede (bar / cozinha / caixa)

Painel da empresa → **Impressoras** (`/printers`):

- [ ] Cadastrar impressora **BAR** (IP + porta 9100 ESC/POS)
- [ ] Cadastrar impressora **COZINHA**
- [ ] Cadastrar impressora **CAIXA** (recibo)
- [ ] Botão **Testar** em cada uma (backend e impressora na mesma rede)
- [ ] Produtos: categoria `bar`/`bebida` → BAR; `cozinha`/`comida` → COZINHA; ou `print_station` explícito
- [ ] Checkout pago dispara tickets automaticamente (`print` no retorno do pedido)

API: `GET/POST/PATCH/DELETE /api/v1/printers` · `POST /api/v1/printers/:id/test`

## 5. Multi-tenant / equipe

- [ ] Onboard da empresa (`/onboard`) ou provisionamento plataforma
- [ ] Admin do tenant consegue login e painel (`/admin`, `/fiscal`, `/products`)
- [ ] Operadores com papéis corretos (bartender → POS, cashier → recarga/caixa, exit → saída)
- [ ] Evento + cardápio ativos; pulseiras de teste

## 6. Smoke test final

| Fluxo | OK? |
|-------|-----|
| Login tenant admin | |
| Config Focus + emitir NFC-e homolog | |
| POS: comanda + pagamento demo ou Cielo | |
| Saída libera só comanda paga | |
| Impressão bar/cozinha/caixa (se configurado) | |
| APK Cielo na LIO com deep link | |

## Bloqueadores típicos (Cielo live)

1. **Credenciais Cielo** ainda não emitidas no portal de desenvolvedores
2. App não cadastrado como integração **URI** (Deep Link) / metadata `cs_integration_type=uri`
3. APK sem `CIELO_*` no BuildConfig **e** backend sem `CIELO_*` (nenhuma fonte de credencial)
4. Terminal sem app de pagamento Cielo / emulador errado
5. API HTTP (não HTTPS) ou URL incorreta no app
6. Pacote/`applicationId` diferente do cadastrado na loja Cielo
