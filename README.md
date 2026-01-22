# Backend - Sistema de Gestão de Academias de Jiu-Jitsu

Backend completo para gerenciamento de academias de artes marciais (Jiu-Jitsu), desenvolvido com Node.js, Express, Prisma e PostgreSQL.

## 🚀 Tecnologias

- **Node.js** + **TypeScript**
- **Express** - Framework web
- **Prisma** - ORM para PostgreSQL
- **PostgreSQL** (Neon) - Banco de dados
- **Zod** - Validação de schemas
- **JWT** - Autenticação
- **Bcrypt** - Hash de senhas
- **Vercel** - Deploy serverless

## 📁 Estrutura do Projeto

```
jiujitsu-backend/
├── src/
│   ├── config/         # Configurações (database, env, constants)
│   ├── shared/         # Código compartilhado
│   │   ├── middlewares/    # Auth, validation, error handling
│   │   ├── utils/          # Helpers e utilitários
│   │   └── types/          # TypeScript types
│   ├── modules/        # Módulos de negócio (auth, alunos, etc)
│   ├── app.ts         # Aplicação Express
│   └── server.ts      # Servidor local
├── prisma/
│   ├── schema.prisma  # Schema do banco de dados
│   └── seed.ts        # Seeds de dados iniciais
├── api/
│   └── index.ts       # Entry point Vercel
└── package.json
```

## 🛠️ Instalação

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e configure as variáveis:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
DIRECT_URL="postgresql://user:password@host:5432/dbname"

JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

NODE_ENV="development"
PORT=3000
```

### 3. Executar migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Popular banco de dados (opcional)

```bash
npm run prisma:seed
```

### 5. Iniciar servidor de desenvolvimento

```bash
npm run dev
```

O servidor estará rodando em `http://localhost:3000`

## 📚 Scripts Disponíveis

- `npm run dev` - Iniciar servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm start` - Iniciar servidor de produção
- `npm run prisma:generate` - Gerar Prisma Client
- `npm run prisma:migrate` - Executar migrations
- `npm run prisma:migrate:deploy` - Deploy migrations (produção)
- `npm run prisma:seed` - Popular banco com dados de teste
- `npm run prisma:studio` - Abrir Prisma Studio
- `npm run fix:usuarios-sem-senha` - Verificar e corrigir usuários sem senha (gera hash com CPF)

## 🔐 Autenticação

O sistema utiliza JWT com refresh tokens:

- **Access Token**: Expira em 15 minutos
- **Refresh Token**: Expira em 7 dias

### Endpoints de Autenticação

```
POST /api/auth/login          # Login
POST /api/auth/logout         # Logout
POST /api/auth/refresh        # Renovar access token
GET  /api/auth/me             # Dados do usuário logado
POST /api/auth/change-password # Trocar senha
```

## 👤 Perfis de Usuário

- **ADMIN** - Acesso total ao sistema
- **PROFESSOR** - Gerenciar aulas e presenças
- **RECEPCIONISTA** - Gerenciar alunos e matrículas
- **ALUNO** - Acesso limitado (reservas, perfil)

## 📊 Módulos Principais

### 1. Academias
Gerenciamento de unidades/academias

### 2. Alunos
- CRUD completo
- Cálculo de categorias IBJJF
- Histórico de graduações
- Lista de resgate (7/30/90 dias sem treinar)

### 3. Professores
- CRUD completo
- Vínculo com múltiplas academias
- Modalidades que leciona

### 4. Aulas
- Templates de aula semanal
- Geração automática de aulas
- Substituição de professor
- Controle de status

### 5. Presenças
- Registro de presença
- Histórico por aluno
- Relatórios

### 6. Reservas
- Sistema de vagas
- Fila de espera
- Confirmação com expiração (15 min)
- Prioridade por histórico

### 7. Graduações
- Histórico de promoções
- Validação de requisitos IBJJF
- Alunos elegíveis para promoção

### 8. Financeiro
- Planos de matrícula
- Matrículas
- Mensalidades
- Controle de inadimplência

### 9. Dashboard
- Métricas consolidadas
- Gráficos
- Filtros por academia e período

### 10. Pré-Cadastro Público
Sistema para pessoas interessadas se cadastrarem antes de serem aprovadas como alunos/professores.

**Endpoints Públicos (sem autenticação):**
```
POST /api/public/cadastro              # Criar pré-cadastro
GET  /api/public/cadastro/status?email=xxx  # Verificar status
```

**Endpoints Admin (ADMIN, PROFESSOR, RECEPCIONISTA):**
```
GET  /api/admin/cadastros-pendentes    # Listar pendentes
GET  /api/admin/cadastros              # Listar todos (filtro opcional)
GET  /api/admin/cadastros/:id          # Buscar por ID
POST /api/admin/cadastros/:id/aprovar  # Aprovar e definir papel
POST /api/admin/cadastros/:id/rejeitar # Rejeitar
```

**Papéis na aprovação:**
- `ALUNO` - Cria Pessoa + Aluno (sem acesso ao sistema)
- `PROFESSOR` - Cria Pessoa + Aluno + Professor + Usuário (senha = CPF)
- `ADMIN` - Cria Pessoa + Usuário como ADMIN (senha = CPF)
- `RECEPCIONISTA` - Cria Pessoa + Usuário como RECEPCIONISTA (senha = CPF)

**Funcionalidades:**
- Editar dados na aprovação (`dadosEditados`)
- Vincular professor responsável ao aluno (`professorResponsavelId`)
- Definir faixa e graus na aprovação
- Senha inicial = CPF (sem pontuação)

## 🔧 Scripts Utilitários

### Corrigir usuários sem senha

Verifica e corrige usuários (PROFESSOR, ADMIN, RECEPCIONISTA) que não têm senha configurada, gerando hash com CPF:

```bash
npm run fix:usuarios-sem-senha
```

O script também cria usuários para professores que não possuem conta de acesso.

## 🔄 Jobs Cron (Vercel)

O sistema possui 3 jobs agendados:

- **Expirar reservas** - A cada 15 minutos
- **Gerar mensalidades** - Dia 25 do mês às 8h
- **Verificar inadimplência** - Diariamente às 9h

## 🚀 Deploy

### Deploy na Vercel

1. Instalar Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Configurar variáveis de ambiente no dashboard da Vercel

4. Deploy de produção:
```bash
vercel --prod
```

### Migrations em produção

```bash
npm run prisma:migrate:deploy
```

## 🧪 Dados de Teste (Seeds)

Ao executar `npm run prisma:seed`, serão criados:

- 1 Academia "Leão de Judá"
- 1 Admin (admin@leaodejuda.com.br / admin123)
- 2 Professores
- 15 Alunos
- Templates de aula (segunda a sexta)
- 3 Planos de matrícula
- 10 Matrículas com mensalidades

## 📝 Documentação da API

### Health Check
```
GET /health
```

### Padrão de Resposta

**Sucesso:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Mensagem opcional"
}
```

**Erro:**
```json
{
  "success": false,
  "message": "Descrição do erro",
  "errors": [ ... ]
}
```

**Paginação:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

## 🔒 Segurança

- Senhas hasheadas com bcrypt (10 rounds)
- JWT com refresh tokens
- Rate limiting (100 req/15min)
- Rate limiting login (5 tentativas/15min)
- Helmet para headers de segurança
- CORS configurado
- Validação de inputs com Zod

## 📞 Suporte

Para dúvidas ou problemas, entre em contato.

## 📄 Licença

MIT
