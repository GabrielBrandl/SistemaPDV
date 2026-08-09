# Instalação do PDV Cashless no celular (maquininha)

**SistemaPDV** — guia de instalação e uso  
**Estratégia:** celular Android com NFC (não usa maquininha Stone/PAX tradicional)

---

## 1. Visão geral

O celular do operador faz o papel da maquininha:

| Uso do NFC | Função |
|------------|--------|
| Pulseira / cartão do cliente | Identificar comanda |
| Cartão de crédito/débito (SoftPOS) | Pagamento por aproximação |
| PIX | QR Code / copia e cola (sem NFC) |

Telas principais:

| Tela | URL | Função |
|------|-----|--------|
| Cadastro / Check-in | `/cadastro` | Nome, CPF, telefone + vincular cartão |
| PDV Comanda | `/pos` | Lançar produtos |
| Pagamento | `/pagar?comanda=...` | PIX ou cartão por aproximação |
| Controle de Saída | `/saida` | Liberar cliente após pagamento |
| Admin | `/admin` | Controle geral |

---

## 2. Requisitos

### Servidor (PC ou nuvem)

- Node.js 20 ou superior
- SistemaPDV clonado/baixado
- Porta **3001** (API) e **5173** (painel), ou as configuradas no `.env`

### Celular

- Android com **NFC**
- Chrome atualizado
- Mesma rede Wi‑Fi do servidor **ou** internet se a API estiver na nuvem

### Hardware do evento

- Pulseiras ou cartões NFC
- (Opcional) impressora Bluetooth — ainda não integrada

---

## 3. Instalar e subir o sistema (PC)

### 3.1 Backend (API)

```bash
cd backend
npm install
```

Copie o arquivo de exemplo de ambiente:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env
```

Ajuste no `backend/.env` (mínimo):

```env
PORT=3001
DB_TYPE=sqlite
SQLITE_PATH=pdv.sqlite
JWT_SECRET=troque_esta_chave
PIX_PROVIDER=demo
SOFTPOS_PROVIDER=demo
```

Suba a API:

```bash
npm run start:dev
```

Confirme: `http://localhost:3001/api/v1` (login deve responder).

### 3.2 Painel web

```bash
cd web-admin
npm install
npm run dev
```

Confirme: `http://localhost:5173`

> O Vite já faz proxy de `/api` para a porta **3001**. Se mudar a porta da API, ajuste `web-admin/vite.config.ts`.

### 3.3 Descobrir o IP do PC (para o celular)

No Windows (PowerShell):

```powershell
ipconfig
```

Anote o IPv4 da rede Wi‑Fi, por exemplo: `192.168.0.15`.

No celular abra:

```
http://192.168.0.15:5173
```

**Não use `localhost` no celular** — isso aponta para o próprio aparelho.

---

## 4. Preparar o celular

1. Ative o **NFC**: Configurações → Conexões / Dispositivos conectados → **NFC** → ligado  
2. Conecte na **mesma Wi‑Fi** do PC (ou use 4G se o sistema estiver publicado na nuvem)  
3. Abra o **Chrome**  
4. Acesse `http://IP_DO_PC:5173`  
5. (Opcional) Menu do Chrome → **Adicionar à tela inicial** → nomeie como “PDV Cashless”

---

## 5. Acessos (usuários demo)

| Perfil | E-mail | Senha | Uso |
|--------|--------|-------|-----|
| Operador (bar / cadastro) | `operador@pdv.local` | `operador123` | `/cadastro`, `/pos`, `/pagar` |
| Controle de Saída | `saida@pdv.local` | `saida123` | `/saida` |
| Admin | `admin@pdv.local` | `admin123` | `/admin` |
| Super Admin SaaS | `super@pdv.local` | `super123` | `/tenants` |

**Cartão NFC de teste:** UID `04A3B2112233`

---

## 6. Fluxo operacional no celular

### 6.1 Entrada do cliente (cadastro)

1. Login como **operador**  
2. Abra **Cadastro Cliente** (`/cadastro`)  
3. Digite o **CPF** e busque  
4. Se for novo: preencha **Nome** e **Telefone**  
5. Toque em **Ativar NFC** (ou digite o UID)  
6. Aproxime a pulseira na **parte de trás** do celular  
7. Confirme → cartão vinculado + comanda aberta + token gerado  

Cliente que já veio: só CPF + aproximar o cartão (**check-in**).

### 6.2 Consumo no bar (PDV)

1. Abra **PDV Comanda** (`/pos`)  
2. Ative NFC e aproxime a pulseira  
3. Lance os produtos  
4. Quando for pagar, toque em **Pagar no celular (PIX / Cartão)**

### 6.3 Pagamento

1. Na tela `/pagar`, escolha:

   - **PIX** → mostre o QR ou copie o código  
   - **Débito / Crédito por aproximação** → peça para o cliente aproximar o cartão bancário no NFC  

2. Em modo **demo**, use:

   - “Simular PIX recebido”  
   - “Simular cartão aprovado”  

3. Após pago, a comanda fica quitada.

### 6.4 Saída

1. Login como **saida** (ou admin)  
2. Abra `/saida`  
3. Aproxime a pulseira  
4. Se estiver pago → **Liberar saída e recolher cartão**  
5. Se houver pendência → **BLOQUEADO** (oriente a pagar no caixa)

---

## 7. NFC no Chrome — dicas

- Use **Chrome**, não o navegador embutido do Instagram/WhatsApp  
- NFC precisa estar **ligado**  
- Aproxime a pulseira da traseira (área da antena NFC varia por modelo)  
- Android 8+ recomendado  
- Se a leitura falhar, digite o UID manualmente no campo  

---

## 8. Publicar para uso no bar (recomendado)

Rodar só no PC com IP local funciona para teste. Em evento:

1. Hospede o **backend** (VPS, Railway, Render, etc.) com HTTPS  
2. Hospede o **web-admin** (ou sirva o build estático apontando para a API)  
3. No celular, abra a URL pública, ex.: `https://seu-pdv.com`  
4. Configure no `.env` da nuvem:

   - `JWT_SECRET` forte  
   - Banco Postgres (melhor que SQLite em produção)  
   - `PIX_PROVIDER` / SoftPOS quando for cobrar de verdade  

---

## 9. Pagamento real (ainda não é o modo demo)

| Canal | O que conectar | Status atual |
|-------|----------------|--------------|
| PIX | Mercado Pago ou PagBank (`PIX_PROVIDER` + chaves) | Demo local |
| Cartão por aproximação | SoftPOS Stone / PagBank / Mercado Pago + app homologado | Demo + scaffold Android |
| NFC-e | Focus NFe + CNPJ/certificado | Homologação / mock sem token |

**Treino de equipe:** pode começar hoje em modo demo.  
**Cobrança real:** precisa conectar PIX (e depois SoftPOS).

---

## 10. Checklist de instalação

- [ ] Node.js instalado no PC/servidor  
- [ ] `backend` com `npm install` + `.env` + `npm run start:dev`  
- [ ] `web-admin` com `npm install` + `npm run dev`  
- [ ] Firewall libera portas 3001 e 5173 (rede local)  
- [ ] IP do PC anotado  
- [ ] Celular Android com NFC na mesma Wi‑Fi  
- [ ] Chrome abre `http://IP:5173`  
- [ ] Login operador e saída testados  
- [ ] Cadastro → PDV → pagar (demo) → liberar saída  

---

## 11. Problemas comuns

| Problema | Solução |
|----------|---------|
| Celular não abre o painel | Confirme IP, mesma Wi‑Fi, firewall do Windows |
| NFC não lê | Ligar NFC, usar Chrome, testar outra posição na traseira |
| Login falha | Backend rodando na 3001; proxy do Vite apontando certo |
| “Cartão não encontrado” | Faça cadastro/check-in antes ou use UID demo |
| Saída bloqueada | Cliente ainda tem comanda aberta ou não paga |

---

## 12. O que não instalar nesta etapa

- APK em maquininha Stone/PAX tradicional  
- SoftPOS de produção sem adesão do adquirente  
- Focus NFe em produção sem certificado  

O app Android do repositório é **scaffold** (base para SoftPOS futuro). O uso atual é o **painel web no Chrome do celular**.

---

## 13. Resumo rápido

1. Suba backend + web-admin no PC (ou nuvem)  
2. Abra no Chrome do Android: `http://IP:5173`  
3. Ligue o NFC  
4. Use `/cadastro` → `/pos` → `/pagar` → `/saida`  

Documento referente ao repositório: https://github.com/GabrielBrandl/SistemaPDV
