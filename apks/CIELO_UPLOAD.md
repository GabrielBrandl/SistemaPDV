# Upload Cielo Store — PDV Cashless (sem marca Cielo)

## Credenciais de teste (obrigatório no formulário)

Use **exatamente** estes dados na certificação. Já validados na API de produção (HTTP 201):

| Campo | Valor |
|-------|--------|
| URL da API | `https://sistema-pdv.129-121-39-17.sslip.io/api/v1` |
| E-mail (admin) | `admin@pyrou.com.br` |
| Senha | `pdv525356@#` |
| E-mail (operador / PDV) | `operador@pyrou.com.br` |
| Senha | `pdv525356@#` |

Alternativas seed (também funcionam): `admin@pdv.local` / `admin123` e `operador@pdv.local` / `operador123`.

**Não** informe usuário sem `@` (ex.: `pdvcash`) — a API exige e-mail válido.

## Reprovações anteriores

1. Marca “Cielo” no nome do app → corrigido (`PDV Cashless`).
2. Login HTTP 401 → usuário `admin@pyrou.com.br` não existia; **criado em produção** com a senha acima.

## Arquivo a enviar

| Campo | Valor |
|-------|--------|
| Arquivo | `apks/PDV-Cielo.apk` |
| Package | `br.com.pyrou.sistemapdv.cielo` |
| versionName | `1.0.2` |
| versionCode | `3` |
| Assinatura | v1 + v2 |
| targetSdk | 29 |
| minSdk | 24 |
| Nome do app | **PDV Cashless** |

## SoftPOS (pagamento no terminal)

No `android/keystore.properties` (não versionar):

```properties
CIELO_CLIENT_ID=...credencial real do portal...
CIELO_ACCESS_TOKEN=...credencial real do portal...
```

**Não** use `HOMOLOG_REPLACE_ME`. Depois:

```bash
cd android && ./scripts/build-cielo-release.sh
```

## Fluxo no Dev Console

1. Confirmar nome do app: **PDV Cashless**
2. Preencher login de teste com `admin@pyrou.com.br` / `pdv525356@#` (ou operador)
3. Reenviar para certificação (APK atual `1.0.1` serve se só o login estava errado)
