# Setup Local — jiujitsu-backend

Guia completo para rodar o backend do zero em ambiente de desenvolvimento.

**Pré-requisitos:**
- Node.js 20+
- npm 10+
- Conta no [Neon](https://neon.tech) (PostgreSQL serverless gratuito)
- Git

---

## 1. Clone e instalação

```bash
git clone <url-do-repositorio>
cd jiujitsu-backend
npm install
```

---

## 2. Banco de dados (Neon)

### 2.1 Criar banco no Neon

1. Acesse [neon.tech](https://neon.tech) → crie uma conta gratuita
2. Crie um novo projeto: **New Project** → nome: `jiujitsu-dev`
3. Na dashboard do projeto, vá em **Connection Details**
4. Copie as duas strings de conexão:
   - **Connection string** (pooled) → vai para `DATABASE_URL`
   - **Direct connection** → vai para `DIRECT_URL`

> As URLs têm o formato:  
> `postgresql://user:password@host.neon.tech/dbname?sslmode=require`

---

## 3. Variáveis de ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env
```

Edite `.env` com seus valores:

```env
# Banco de dados (Neon)
DATABASE_URL=postgresql://user:pass@host.neon.tech/jiujitsu?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://user:pass@host.neon.tech/jiujitsu?sslmode=require

# JWT — gere strings aleatórias longas
# Sugestão: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=cole-uma-string-aleatoria-longa-aqui
JWT_REFRESH_SECRET=cole-outra-string-aleatoria-diferente

JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Servidor
NODE_ENV=development
PORT=3000

# Regras de negócio (defaults OK para dev)
CONFIRMACAO_RESERVA_MINUTOS=15
LIMITE_FALTAS_RESERVA=3

# CORS — URL do frontend rodando localmente
CORS_ORIGIN=http://localhost:3001

# Cron (não obrigatório em desenvolvimento)
CRON_SECRET=qualquer-valor-aqui
```

---

## 4. Migrations e Seed

```bash
# Rodar migrations (cria as tabelas no banco)
npm run prisma:migrate

# Verificar se o schema está sincronizado
npx prisma migrate status

# Popular banco com dados iniciais
npm run prisma:seed
```

---

## 5. Dados do Seed

O seed cria os seguintes dados de teste:

| Entidade | Dados |
|----------|-------|
| Academia | "Academia Leão de Judá" — São Paulo/SP |
| Admin | **email:** `admin@leaodejuda.com.br` **senha:** `admin123` |

> O seed usa `upsert` — pode ser rodado múltiplas vezes sem duplicar dados.

**Credenciais de login para desenvolvimento:**
```
email: admin@leaodejuda.com.br
senha: admin123
perfil: ADMIN
```

---

## 6. Iniciar o servidor

```bash
npm run dev
# Servidor rodando em http://localhost:3000
```

Verifique que está funcionando:
```bash
curl http://localhost:3000/health
# Resposta: {"status":"ok","timestamp":"...","uptime":...}
```

---

## 7. Ferramentas úteis de desenvolvimento

### Prisma Studio (GUI do banco)
```bash
npm run prisma:studio
# Abre em http://localhost:5555
# Interface visual para explorar e editar dados no banco
```

### Testar endpoints
O projeto inclui uma coleção Postman em `postman/Jiujitsu_API_Collection.json`.

**Para usar:**
1. Importe no Postman
2. Configure a variável `baseUrl = http://localhost:3000`
3. Execute o request de login para obter o token
4. O token é automaticamente injetado nas demais requests

---

## 8. Criar banco separado para testes

Para rodar testes de integração sem afetar o banco de desenvolvimento:

### 8.1 No Neon, crie um segundo banco
1. No painel Neon → **Databases** → **New Database**: `jiujitsu_test`
2. Copie as strings de conexão do banco `jiujitsu_test`

### 8.2 Crie `.env.test`
```env
DATABASE_URL=postgresql://user:pass@host.neon.tech/jiujitsu_test?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://user:pass@host.neon.tech/jiujitsu_test?sslmode=require
JWT_SECRET=test-secret-key-at-least-thirty-characters-long
JWT_REFRESH_SECRET=test-refresh-secret-different-from-access
NODE_ENV=test
PORT=3001
CONFIRMACAO_RESERVA_MINUTOS=15
LIMITE_FALTAS_RESERVA=3
CORS_ORIGIN=http://localhost:3001
CRON_SECRET=test-cron-secret
```

### 8.3 Rodar migrations no banco de teste
```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### 8.4 Rodar testes
```bash
npm test                    # Todos os testes
npm run test:watch          # Watch mode
npm run test:coverage       # Com cobertura
```

---

## 9. Fluxo de desenvolvimento típico

```bash
# 1. Criar feature branch
git checkout -b feature/nova-funcionalidade

# 2. Se precisar de nova tabela/campo, criar migration
npm run prisma:migrate
# Prisma pede nome da migration (ex: "add_campo_observacoes_to_aula")

# 3. Escrever testes (RED)
# src/tests/unit/services/modulo.service.test.ts

# 4. Implementar (GREEN)
# src/modules/modulo/...

# 5. Verificar que tudo passa
npm test
npm run build

# 6. Commitar
git add .
git commit -m "feat: adiciona funcionalidade X"
```

---

## 10. Troubleshooting

| Problema | Causa | Solução |
|----------|-------|---------|
| `Error: DATABASE_URL must be a valid URL` | `.env` não foi criado ou tem URL inválida | Verifique `.env` e formato da URL Neon |
| `Error: Prisma client not generated` | Faltou rodar `prisma generate` | `npm run prisma:generate` |
| `Error: P1001 - Can't reach database` | Banco Neon em auto-pause ou URL incorreta | Acesse o dashboard Neon — banco "acorda" ao acessar |
| `Error: P3006 - Migration failed` | Schema conflita com banco existente | `npx prisma migrate reset` (⚠️ apaga dados!) |
| Port 3000 already in use | Processo anterior ainda rodando | `lsof -ti:3000 \| xargs kill` (Mac/Linux) ou Task Manager (Windows) |
