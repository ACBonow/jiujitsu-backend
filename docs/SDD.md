# SDD — Sistema de Gestão de Academias de Jiu-Jitsu (Backend)

**Versão:** 1.0  
**Stack:** Node.js · TypeScript · Express · Prisma · PostgreSQL (Neon) · Vercel

---

## 1. Visão Geral do Sistema

Sistema multi-academia para gestão completa de academias de artes marciais. Uma única instância serve múltiplas unidades com controle de acesso por perfil.

### Personas

| Perfil | Responsabilidades |
|--------|-------------------|
| ADMIN | Acesso total a todas as academias; configuração do sistema |
| PROFESSOR | Gerencia suas turmas, presenças, alunos da sua academia |
| RECEPCIONISTA | Cadastros, matriculas, pagamentos da academia vinculada |
| ALUNO | Visualiza suas aulas, reservas e histórico |

### Modalidades suportadas
`JIUJITSU` `MUAY_THAI` `JUDO` `MMA` `WRESTLING` `BOXE` `KICKBOXING` `NO_GI`

---

## 2. Arquitetura

```
Express App (app.ts)
│
├── Middlewares globais: Helmet · CORS · express.json · Rate Limiter
│
├── /health (health check)
│
└── /api/*  →  Módulos de negócio
    ├── auth/
    ├── academias/
    ├── alunos/
    ├── professores/
    ├── aulas/
    ├── presencas/
    ├── reservas/
    ├── graduacoes/
    ├── financeiro/
    └── cadastro-publico/
```

### Padrão por módulo

```
modules/<nome>/
  <nome>.routes.ts       # Express router + middleware de auth/roles
  <nome>.controller.ts   # Recebe req/res, chama service, retorna resposta
  <nome>.service.ts      # Lógica de negócio pura
  <nome>.repository.ts   # Queries Prisma
  <nome>.schemas.ts      # Validação Zod (schemas de entrada)
```

### Resposta padrão da API

```typescript
// Sucesso
{ success: true, data: T, pagination?: PaginationMeta, message?: string }

// Erro
{ success: false, message: string, errors?: Record<string, string[]> }
```

### Paginação

```typescript
// Query params: ?page=1&limit=20
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

---

## 3. Modelo de Dados

### Hierarquia de identidade

```
Pessoa (dados pessoais base)
├── Usuario (autenticação + perfil)
├── Aluno   (graduação, status, responsável)
└── Professor (modalidades, academias)
```

Uma `Pessoa` pode ser **ao mesmo tempo** `Aluno` e `Professor`.

### Entidades e campos-chave

#### Academia
```
id, nome, cnpj (unique), telefone, email
logradouro, numero, complemento, bairro, cidade, estado, cep
ativo, createdAt, updatedAt
```

#### Pessoa
```
id, nome, telefone, email (unique), cpf (unique), dataNascimento, sexo
logradouro, numero, complemento, bairro, cidade, estado, cep
```

#### Usuario
```
id, email (unique), senha (bcrypt), perfil (ADMIN|PROFESSOR|RECEPCIONISTA|ALUNO)
pessoaId (FK única), academiaId (FK, null = Admin global)
refreshToken, lastLogin, ativo
```

#### Aluno
```
id, pessoaId (FK única)
nomeResponsavel, telefoneResponsavel (obrigatório se menor de 18)
faixa (default BRANCA), graus (0-4, preta até 6)
dataUltimaPromocao, dataMatricula, aulasDesdePromocao
peso (kg), categoriaIdade, categoriaPeso
status (ATIVO|INATIVO|INADIMPLENTE)
faltasReservas (contador de faltas)
professorResponsavelId (FK opcional)
```

#### Professor
```
id, pessoaId (FK única), alunoId (FK única, opcional)
modalidades (array), ativo
→ N:N com Academia via ProfessorAcademia
```

#### TemplateAula (grade semanal)
```
id, academiaId, professorId
diaSemana, horarioInicio ("HH:MM"), duracao (min, default 60)
categoria (CategoriaTurma), modalidade, limiteAlunos (null = sem limite)
ativo
```

#### Aula (instância)
```
id, academiaId, professorId, professorSubstitutoId (opcional)
dataHora, duracao, categoria, modalidade, tipoAula (PADRAO|EXTRA|PARTICULAR)
limiteAlunos, status (AGENDADA|EM_ANDAMENTO|CONCLUIDA|CANCELADA)
observacoes
```

#### Presenca
```
id, aulaId, alunoId, registradoPorId
dataRegistro
UNIQUE(aulaId, alunoId)
```

#### Reserva
```
id, aulaId, alunoId
status (CONFIRMADA|ESPERA|CANCELADA|EXPIRADA|FALTOU)
posicaoFila, dataReserva, dataConfirmacao, dataExpiracao
UNIQUE(aulaId, alunoId)
```

#### Graduacao (histórico imutável)
```
id, alunoId
faixaAnterior, faixaNova, grausAnteriores, grausNovos
dataPromocao, observacao
```

#### Plano
```
id, nome, descricao, valorBase (Decimal), modalidades (array), ativo
→ N:N com Academia via PlanoAcademia (pode ter valorPersonalizado por academia)
```

#### Matricula
```
id, alunoId, academiaId, planoId
valorFinal (Decimal), desconto (Decimal opcional)
diaVencimento (1-31), dataInicio, dataFim (null = indefinido)
status (ATIVA|SUSPENSA|CANCELADA)
```

#### Mensalidade
```
id, matriculaId
mesReferencia ("YYYY-MM"), valorOriginal, valorPago, descontoAplicado
dataVencimento, dataPagamento
formaPagamento (DINHEIRO|PIX|CARTAO_CREDITO|CARTAO_DEBITO|TRANSFERENCIA|BOLETO)
status (PENDENTE|PAGO|ATRASADO)
pagamentoLoteId (opcional — vincula ao PagamentoLote quando paga)
UNIQUE(matriculaId, mesReferencia)
```

#### RegraPagamentoAcademia
```
id, academiaId (unique)
descontoAntecipadoPercentual, diaLimiteAntecipado (1-31)  — x% se pago até o dia y
descontoPagamentoImediatoPercentual, formasPagamentoComDesconto (default: DINHEIRO, PIX) — z% para formas sem taxa
descontosAcumulativos (default true) — soma os dois descontos, ou usa apenas o maior
```

#### PagamentoLote
```
id, academiaId, registradoPorId
formaPagamento, dataPagamento, valorTotal, descontoTotal, observacoes
→ 1:N com Mensalidade (permite pagamento combinado de várias mensalidades numa só operação, ex. pai e filho)
```

#### CadastroPendente
```
id, nome, email (unique), cpf (unique), telefone, dataNascimento, sexo
modalidades (array), observacoes
status (PENDENTE|APROVADO|REJEITADO), motivoRejeicao
aprovadoPorId, aprovadoEm
```

---

## 4. Sistema de Autenticação

### Estratégia JWT duplo

| Token | Expiração | Uso |
|-------|-----------|-----|
| Access Token | 15 minutos | Authorization: Bearer <token> em toda requisição protegida |
| Refresh Token | 7 dias | POST /api/auth/refresh; armazenado na coluna `refreshToken` do Usuario |

### Fluxo de login
1. POST /api/auth/login com `{ email, senha }`
2. Valida credenciais → bcrypt compare
3. Retorna `{ accessToken, refreshToken, user }`
4. Frontend armazena ambos (localStorage via Zustand persist)

### Fluxo de refresh
1. Access token expira (401)
2. Frontend intercepta e chama POST /api/auth/refresh com `{ refreshToken }`
3. Backend valida refresh token no BD + JWT
4. Retorna novos tokens

### Middleware de autorização
```typescript
// Uso nas rotas:
router.get('/', authenticate, authorize([Perfil.ADMIN, Perfil.PROFESSOR]), controller)

// authenticate → verifica JWT → injeta req.user
// authorize([...]) → verifica req.user.perfil
```

---

## 5. Especificações por Módulo

### 5.1 Auth (`/api/auth`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /login | Público | Login com email + senha |
| POST | /logout | Autenticado | Invalida refresh token |
| POST | /refresh | Público | Renova tokens |
| GET | /me | Autenticado | Dados do usuário logado |
| POST | /change-password | Autenticado | Altera senha |

**Regras:**
- Rate limit de login: 5 tentativas por IP por 15 minutos
- Senha exige mínimo 8 caracteres
- Refresh token é rotacionado a cada uso (novo token emitido, antigo invalidado)

---

### 5.2 Academias (`/api/academias`)

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | / | ADMIN, PROFESSOR, RECEPCIONISTA | Lista academias (paginado) |
| POST | / | ADMIN | Cria nova academia |
| GET | /:id | ADMIN, PROFESSOR, RECEPCIONISTA | Detalhe da academia |
| PUT | /:id | ADMIN | Atualiza academia |
| DELETE | /:id | ADMIN | Desativa academia (soft delete → `ativo = false`) |

---

### 5.3 Alunos (`/api/alunos`)

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | / | ADMIN, PROFESSOR, RECEPCIONISTA | Lista alunos (filtros: status, faixa, academia) |
| POST | / | ADMIN, PROFESSOR, RECEPCIONISTA | Cadastra aluno |
| GET | /:id | ADMIN, PROFESSOR, RECEPCIONISTA | Detalhe do aluno |
| PUT | /:id | ADMIN, PROFESSOR, RECEPCIONISTA | Atualiza aluno |
| PATCH | /:id/status | ADMIN, RECEPCIONISTA | Muda status (ATIVO/INATIVO/INADIMPLENTE) |
| GET | /:id/presencas | ADMIN, PROFESSOR, RECEPCIONISTA | Histórico de presenças |
| GET | /:id/graduacoes | ADMIN, PROFESSOR, RECEPCIONISTA | Histórico de graduações |

**Regras:**
- `nomeResponsavel` e `telefoneResponsavel` são obrigatórios se `dataNascimento` indica menor de 18
- `status = INADIMPLENTE` é setado automaticamente pelo cron quando há mensalidade ATRASADA
- `faltasReservas` incrementa quando reserva fica `FALTOU`; aluno com `LIMITE_FALTAS_RESERVA` faltas não pode fazer novas reservas

---

### 5.4 Professores (`/api/professores`)

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | / | ADMIN, RECEPCIONISTA | Lista professores |
| POST | / | ADMIN | Cria professor |
| GET | /:id | ADMIN, PROFESSOR, RECEPCIONISTA | Detalhe |
| PUT | /:id | ADMIN | Atualiza professor |
| DELETE | /:id | ADMIN | Desativa professor |
| POST | /:id/academias | ADMIN | Vincula professor a academia |
| DELETE | /:id/academias/:academiaId | ADMIN | Desvincula |

---

### 5.5 Aulas (`/api/aulas`)

#### Templates de aula

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /templates | ADMIN, PROFESSOR, RECEPCIONISTA | Lista templates |
| POST | /templates | ADMIN, PROFESSOR | Cria template |
| PUT | /templates/:id | ADMIN, PROFESSOR | Atualiza template |
| DELETE | /templates/:id | ADMIN | Desativa template |

#### Aulas

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | / | ADMIN, PROFESSOR, RECEPCIONISTA | Lista aulas (filtros: data, academia, status) |
| POST | / | ADMIN, PROFESSOR | Cria aula avulsa |
| POST | /gerar | ADMIN, PROFESSOR | Gera aulas de um período a partir dos templates |
| GET | /:id | Autenticado | Detalhe da aula |
| PUT | /:id | ADMIN, PROFESSOR | Atualiza aula |
| PATCH | /:id/iniciar | ADMIN, PROFESSOR | Status → EM_ANDAMENTO |
| PATCH | /:id/concluir | ADMIN, PROFESSOR | Status → CONCLUIDA |
| PATCH | /:id/cancelar | ADMIN, PROFESSOR | Status → CANCELADA |
| PATCH | /:id/substituto | ADMIN | Define professor substituto |

**Regras de transição de status:**
```
AGENDADA → EM_ANDAMENTO → CONCLUIDA
AGENDADA → CANCELADA
EM_ANDAMENTO → CANCELADA (excepcional)
```

---

### 5.6 Presenças (`/api/presencas`)

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| POST | / | ADMIN, PROFESSOR, RECEPCIONISTA | Registra presença(s) |
| GET | /aula/:aulaId | ADMIN, PROFESSOR, RECEPCIONISTA | Presenças de uma aula |
| DELETE | /:id | ADMIN, PROFESSOR | Remove presença |

**Regras:**
- Só pode registrar presença em aulas com status `EM_ANDAMENTO` ou `CONCLUIDA`
- Um aluno só pode ter uma presença por aula (UNIQUE)
- Registro de presença incrementa `aulasDesdePromocao` no Aluno

---

### 5.7 Reservas (`/api/reservas`)

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| POST | / | Autenticado | Cria reserva |
| GET | /aula/:aulaId | ADMIN, PROFESSOR, RECEPCIONISTA | Reservas de uma aula |
| PATCH | /:id/confirmar | ADMIN, PROFESSOR, RECEPCIONISTA | Confirma reserva da fila |
| PATCH | /:id/cancelar | Autenticado | Cancela reserva |

**Regras de negócio (críticas):**
- Reserva criada como `ESPERA` se aula está cheia; `CONFIRMADA` se há vaga
- Confirmação expira em `CONFIRMACAO_RESERVA_MINUTOS` (default: 15 min)
- Quando reserva `CONFIRMADA` expira → status muda para `EXPIRADA` → próximo da fila é promovido
- Aluno com `faltasReservas >= LIMITE_FALTAS_RESERVA` (default: 3) não pode fazer novas reservas
- Cancelamento de reserva `CONFIRMADA` libera vaga para próximo na fila de espera
- Reserva que não comparece → `FALTOU` → incrementa `faltasReservas`

---

### 5.8 Graduações (`/api/graduacoes`)

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | / | ADMIN, PROFESSOR | Lista histórico geral |
| POST | / | ADMIN, PROFESSOR | Registra promoção |
| GET | /aluno/:alunoId | ADMIN, PROFESSOR, RECEPCIONISTA | Histórico do aluno |

**Regras IBJJF:**
- Adultos (18+): BRANCA → AZUL → ROXA → MARROM → PRETA
- Kids (4-15): BRANCA → CINZA → AMARELA → LARANJA → VERDE
- Registro de graduação atualiza `faixa`, `graus`, `dataUltimaPromocao` e zera `aulasDesdePromocao` no Aluno
- Histórico de graduações é imutável (append-only)

---

### 5.9 Financeiro (`/api/financeiro`)

#### Planos

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /planos | ADMIN, RECEPCIONISTA | Lista planos |
| POST | /planos | ADMIN | Cria plano |
| PUT | /planos/:id | ADMIN | Atualiza plano |

#### Matrículas

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /matriculas | ADMIN, RECEPCIONISTA | Lista matrículas |
| POST | /matriculas | ADMIN, RECEPCIONISTA | Cria matrícula |
| GET | /matriculas/:id | ADMIN, RECEPCIONISTA | Detalhe |
| PATCH | /matriculas/:id/status | ADMIN, RECEPCIONISTA | Muda status |

#### Mensalidades

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /mensalidades | ADMIN, RECEPCIONISTA | Lista mensalidades (filtros: status — aceita múltiplos —, mês) |

**Regras:**
- Mensalidade é gerada automaticamente pelo cron diário (6h) para o mês corrente
- `dataVencimento` = dia `diaVencimento` da Matrícula no mês de referência
- Mensalidade vencida e não paga → status `ATRASADO` (verificado pelo cron 9h)
- Aluno com mensalidade `ATRASADO` → status `INADIMPLENTE`

#### Regra de Pagamento (por academia)

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| GET | /academias/:academiaId/regra-pagamento | ADMIN, RECEPCIONISTA | Busca a regra da academia (`null` se não configurada) |
| PUT | /academias/:academiaId/regra-pagamento | ADMIN | Cria/atualiza a regra |

**Regras:**
- Cada academia define, de forma independente: desconto por antecipação (x% até o dia y) e desconto por forma de pagamento (z% para dinheiro/PIX, configurável)
- `descontosAcumulativos` controla se os dois descontos se somam ou se aplica-se apenas o maior

#### Pagamentos (registro de cobrança — único ou combinado)

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| POST | /pagamentos/preview | ADMIN, RECEPCIONISTA | Calcula o desconto aplicável para 1+ mensalidades, sem persistir |
| POST | /pagamentos | ADMIN, RECEPCIONISTA | Registra o pagamento de 1+ mensalidades num único `PagamentoLote` |

**Regras:**
- Todas as mensalidades de uma mesma operação devem pertencer à mesma academia
- O desconto é calculado a partir da `RegraPagamentoAcademia` (dia do pagamento + forma de pagamento); o operador pode ajustar `valorPago` manualmente antes de confirmar
- Pagamento combinado (ex: mensalidade do pai + do filho) é apenas selecionar mais de uma mensalidade no mesmo `PagamentoLote` — não há vínculo formal de família no sistema
- Mensalidade já `PAGO` não pode ser incluída em um novo pagamento

---

### 5.10 Cadastro Público (`/api/public` e `/api/admin`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /api/public/cadastro | Público | Pré-cadastro de interessado |
| GET | /api/public/cadastro/:id/status | Público | Consulta status do pré-cadastro |
| GET | /api/admin/cadastros | ADMIN, PROFESSOR, RECEPCIONISTA | Lista pré-cadastros pendentes |
| PATCH | /api/admin/cadastros/:id/aprovar | ADMIN, PROFESSOR, RECEPCIONISTA | Aprova → cria Pessoa + Aluno + Usuario |
| PATCH | /api/admin/cadastros/:id/rejeitar | ADMIN, PROFESSOR, RECEPCIONISTA | Rejeita com motivo |

---

## 6. Jobs Agendados (Vercel Cron)

| Job | Schedule | Função |
|-----|----------|--------|
| `atualizar-mensalidades` | `0 6 * * *` (6h diário) | Gera mensalidades do mês para matrículas ATIVAS |
| `expirar-reservas` | `*/15 * * * *` (a cada 15min) | Expira reservas CONFIRMADAS sem check-in; promove fila |
| `verificar-inadimplencia` | `0 9 * * *` (9h diário) | Mensalidades PENDENTE vencidas → ATRASADO; Alunos com ATRASADO → INADIMPLENTE |

Todos protegidos por header `Authorization: Bearer ${CRON_SECRET}`.

---

## 7. Segurança

| Camada | Implementação |
|--------|---------------|
| Senhas | bcrypt 10 rounds |
| Tokens | JWT RS256 (15min access, 7d refresh) |
| Rate limit global | 100 req/15min por IP |
| Rate limit login | 5 tentativas/15min por IP |
| Headers | Helmet (HSTS, CSP, X-Frame-Options, etc.) |
| CORS | Origem configurável via `CORS_ORIGIN` env |
| Validação de entrada | Zod em todos os endpoints que recebem body |

---

## 8. Variáveis de Ambiente

```env
# Banco de dados (Neon PostgreSQL)
DATABASE_URL=postgresql://...?sslmode=require
DIRECT_URL=postgresql://...        # Para migrations

# JWT
JWT_SECRET=<string longa e aleatória>
JWT_REFRESH_SECRET=<string diferente>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Servidor
NODE_ENV=development|production
PORT=3000

# Regras de negócio
CONFIRMACAO_RESERVA_MINUTOS=15
LIMITE_FALTAS_RESERVA=3

# CORS
CORS_ORIGIN=https://seu-frontend.vercel.app

# Cron
CRON_SECRET=<segredo para proteger as rotas de cron>
```

---

## 9. Convenções de Código

- Todos os IDs: `cuid()` gerado pelo Prisma
- Datas: `DateTime` Prisma = ISO 8601 UTC
- Valores monetários: `Decimal(10, 2)` no Prisma; tratados como `string` no JSON para evitar floating point
- Horários de template: string `"HH:MM"` (e.g., `"07:30"`)
- Mês de referência de mensalidade: string `"YYYY-MM"` (e.g., `"2026-05"`)
- Nomes de tabelas: snake_case plural (mapeado via `@@map`)
- Soft delete: campo `ativo: Boolean` — nunca deletar fisicamente (exceto cascade em entidades filhas)

---

## 10. Erros Comuns e Códigos HTTP

| Situação | HTTP | Exemplo de mensagem |
|----------|------|---------------------|
| Campo obrigatório ausente | 400 | "nome é obrigatório" |
| Entidade não encontrada | 404 | "Aluno não encontrado" |
| Sem autorização (token) | 401 | "Token inválido ou expirado" |
| Sem permissão (perfil) | 403 | "Sem permissão para esta ação" |
| Conflito de unicidade | 409 | "Email já cadastrado" |
| Regra de negócio violada | 422 | "Aluno com limite de faltas atingido" |
| Erro interno | 500 | "Erro interno do servidor" |
