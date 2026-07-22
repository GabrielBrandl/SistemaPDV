# PDV Cashless SaaS para Bares

Sistema de Ponto de Venda cashless multi-tenant (SaaS) com pulseiras/cartões NFC.

## Modelo SaaS

- Cada estabelecimento é um **tenant** isolado
- Dados (eventos, cartões, pedidos, PDVs, NFC-e) filtrados por `tenant_id`
- Config fiscal (Focus NFe, CNPJ, série) por tenant
- Roles: `super_admin` (plataforma), `admin` (tenant), `operator`

## Estrutura do Monorepo

```
SistemaPDV/
├── backend/          # API NestJS multi-tenant
├── web-admin/        # Painel React (tenant + super admin)
├── android/          # App Smart POS
├── docker-compose.yml
└── PDV_BA_1.pdf
```

## Início Rápido

### Backend

```bash
cd backend
npm install
npm run start:dev
```

API: `http://localhost:3000/api/v1`

### Painel Web

```bash
cd web-admin
npm install
npm run dev
```

Painel: `http://localhost:5173`

## Credenciais demo (seed)

| Perfil | E-mail | Senha | Painel |
|--------|--------|-------|--------|
| Super Admin SaaS | `super@pdv.local` | `super123` | `/tenants` |
| Admin do tenant | `admin@pdv.local` | `admin123` | `/admin` (controle total) |
| Controle de Saída | `saida@pdv.local` | `saida123` | `/saida` (liberação na porta) |
| Operador (bar) | `operador@pdv.local` | `operador123` | `/pos` (comandas) |

Tenant demo: **Bar Demo** (`bar-demo`)  
Pulseira: UID `04A3B2112233`

### Fluxo do evento
1. **Cadastro** (`/cadastro`): Nome + CPF + Telefone · aproxima cartão NFC → gera **token** e abre comanda
2. **Retorno**: só digita o **CPF** → reconhece o cliente → vincula cartão → abre comanda
3. **Bar** (`/pos`): aproxima NFC → lança itens autenticados no cartão/token
4. **Caixa**: fecha comanda e paga PIX / débito / crédito
5. **Saída** (`/saida`): aproxima cartão → só libera se não houver pendência → recolhe o cartão
6. **Admin** (`/admin`): visão geral de comandas, pendências, equipe e liberações

### Supabase (cadastro de clientes)
1. Crie o projeto no Supabase
2. Rode o SQL em `supabase/schema.sql`
3. No `backend/.env` configure:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
Sem essas variáveis o cadastro continua funcionando **localmente** (SQLite/Postgres do PDV).

APIs: `POST /customers/lookup`, `POST /customers/register`, `POST /customers/checkin`, `GET /customers`  
APIs de saída: `POST /exit/check`, `POST /exit/release`, `GET /exit/today`, `GET /exit/blocked`  
APIs admin: `GET /admin/overview`, `GET /admin/comandas`

## Estratégia de hardware

**PDV no celular com NFC** (não usa maquininha dedicada):
1. Celular do operador lê a **pulseira/cartão do cliente** (NFC)
2. No pagamento, o mesmo celular:
   - gera **PIX** (QR / copia e cola), ou
   - recebe **cartão de crédito/débito por aproximação** (SoftPOS / Tap to Phone)

APIs: `POST /payments/pix`, `POST /payments/card`, `GET /payments/:id`, `POST /payments/:id/confirm`  
Tela celular: `/pagar?comanda=UUID`

### SoftPOS (cartão no telefone)
Configure `SOFTPOS_PROVIDER=stone|pagbank|mercadopago` e integre o SDK Android.
Em `demo`, use “Simular cartão aprovado” na tela `/pagar`.

### PIX
Configure `PIX_PROVIDER=mercadopago|pagbank` + chaves do PSP.
Em `demo`, QR é gerado localmente e “Simular PIX recebido” confirma.

## Onboarding

- Público: `POST /api/v1/tenants/onboard` ou tela `/onboard`
- Super admin: lista tenants em `/tenants` e pode “entrar” em um tenant

## Endpoints SaaS

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/tenants/onboard` | Criar tenant + admin |
| GET | `/tenants` | Listar tenants (super_admin) |
| GET | `/tenants/me` | Tenant do usuário logado |
| PATCH | `/tenants/:id` | Atualizar tenant / fiscal |

Header opcional para super admin: `X-Tenant-Id`

## Funcionalidades Implementadas (Fase 1)

### Backend
- Autenticação JWT
- CRUD de eventos e produtos
- Gestão de cartões NFC (vincular, consultar, recarregar, devolver)
- Reserva de saldo (reserve + confirm + rollback) com TTL de 60s
- Pedidos e checkout via pulseira
- Sessões de PDV (abertura/fechamento de caixa)
- Fila de sincronização offline
- Emissão fiscal NFC-e (mock — integração Focus NFe preparada)
- Relatórios de vendas e produtos

### Painel Web
- Dashboard em tempo real
- Gestão de pulseiras/cartões NFC
- Totem de recarga virtual
- CRUD de cardápio
- Relatórios de vendas
- Status dos terminais PDV
- Consulta de documentos fiscais

### Android (scaffold)
- Estrutura base Kotlin + Jetpack Compose
- Leitura NFC (NfcAdapter)
- Interface PaymentGateway para Stone/Cielo/PagSeguro
- Room Database + Outbox Pattern (estrutura)

## Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/login` | Login |
| GET | `/cards/{uid}/status` | Consultar saldo |
| POST | `/cards/{uid}/reserve` | Reservar saldo |
| POST | `/cards/{uid}/confirm` | Confirmar débito |
| POST | `/cards/{uid}/recharge` | Recarregar saldo |
| POST | `/orders` | Criar pedido |
| POST | `/orders/{id}/checkout` | Finalizar venda |
| GET | `/events/{id}/dashboard` | Dashboard do evento |

## Próximas Fases

- **Fase 2:** App Android completo com SDKs das maquininhas
- **Fase 3:** Dashboard com Supabase Realtime
- **Fase 4:** Integração Focus NFe + homologação SEFAZ
- **Fase 5:** Testes de carga, segurança e go-live

## Cartão NFC de Teste

UID: `04A3B2112233` — Saldo inicial: R$ 100,00
