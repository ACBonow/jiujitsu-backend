# Análise de Segurança — Sistema de Gestão de Academias de Jiu-Jitsu

**Data:** 2026-05-31  
**Escopo:** jiujitsu-backend + jiujitsu-frontend  
**Metodologia:** Revisão estática de código (SAST) + análise de lógica de negócio

---

## Índice

- [Resumo Executivo](#resumo-executivo)
- [Vulnerabilidades Críticas](#vulnerabilidades-críticas)
- [Vulnerabilidades Altas](#vulnerabilidades-altas)
- [Vulnerabilidades Médias](#vulnerabilidades-médias)
- [Riscos Baixos e Observações](#riscos-baixos-e-observações)
- [Plano de Remediação](#plano-de-remediação)
- [O que está bem implementado](#o-que-está-bem-implementado)

---

## Resumo Executivo

**Atualizado em 2026-08-30** — status revisado contra o código atual (não apenas contra commits declarados).

| Severidade | Quantidade | Status |
|------------|-----------|--------|
| 🔴 CRÍTICO | 5 | ✅ Todos corrigidos |
| 🟠 ALTO | 6 | ✅ Todos corrigidos |
| 🟡 MÉDIO | 5 | ✅ Todos corrigidos |
| 🔵 BAIXO | 4 | ✅ Todos endereçados (SEC-020 via logs nativos da Vercel, sem serviço externo — decisão do usuário) |
| **Total** | **20** | **20 endereçados** |

> A remediação sugerida para SEC-004 (ver abaixo) usava `reserva.aluno.usuario?.id`, mas `Aluno` não tem relação direta `usuario` no schema (só via `aluno.pessoa.usuario`). Esse caminho de `include` inválido foi implementado ao pé da letra e quebrava em runtime `POST /api/reservas` e `PATCH /api/reservas/:id/cancelar` (Prisma rejeita o `include`). Corrigido em 2026-08-30 em `reservas.service.ts`. Adicionalmente, a correção de SEC-005 (isolamento por academia) nunca chegou ao módulo `graduacoes` — o controller calculava o `academiaId` mas o `service` o descartava silenciosamente; também corrigido em 2026-08-30. CI (GitHub Actions) com `tsc --noEmit` foi adicionado aos dois repositórios nesta mesma data para pegar esse tipo de regressão automaticamente no futuro.

**Prioridade imediata antes de qualquer deploy em produção com dados reais:**
- SEC-001: Escalada de privilégio via aprovação de cadastro
- SEC-002: Mass assignment de status em Aula
- SEC-003: Presença em aula AGENDADA (bypass de estado)
- SEC-004: Cancelamento de reserva sem verificação de dono
- SEC-005: Cross-academy data leakage (isolamento de dados)

---

## Vulnerabilidades Críticas

---

### SEC-001 — Escalada de Privilégio na Aprovação de Pré-cadastro

**Arquivo:** `src/modules/cadastro-publico/cadastro-publico.schemas.ts:83-87`  
**Arquivo:** `src/modules/cadastro-publico/cadastro-publico.routes.ts:81-87`

**Descrição:**  
O endpoint `POST /api/admin/cadastros/:id/aprovar` permite que PROFESSOR ou RECEPCIONISTA criem usuários com perfil **ADMIN**. O schema aceita qualquer valor para `papel`:

```typescript
// cadastro-publico.schemas.ts linha 83-87
export const aprovarCadastroSchema = z.object({
  papel: z.enum(['ALUNO', 'PROFESSOR', 'ADMIN', 'RECEPCIONISTA']),
  // ...
});
```

E qualquer um dos três perfis pode chamar o endpoint:
```typescript
// cadastro-publico.routes.ts linha 84
authorize('ADMIN', 'PROFESSOR', 'RECEPCIONISTA'),
```

**Impacto:**
- Um RECEPCIONISTA pode criar um ADMIN global
- Um PROFESSOR pode criar um ADMIN global
- Qualquer um dos três pode criar usuários em qualquer academia (`academiaId` não é validado contra o `req.user.academiaId`)

**Remediação:**
```typescript
// routes: restringir criação de ADMIN e PROFESSOR apenas ao ADMIN
router.post('/admin/cadastros/:id/aprovar',
  authenticate,
  // Não usar authorize simples — lógica condicional no controller
  aprovarCadastroController
);

// controller/service: validar permissões granulares
if (input.papel === 'ADMIN' && req.user.perfil !== 'ADMIN') {
  throw ApiError.forbidden('Apenas ADMIN pode criar outros ADMINs');
}
if (input.papel === 'PROFESSOR' && req.user.perfil === 'RECEPCIONISTA') {
  throw ApiError.forbidden('Recepcionista não pode criar Professores');
}
// Validar academiaId: non-ADMIN só pode criar em sua própria academia
if (req.user.academiaId && input.academiaId !== req.user.academiaId) {
  throw ApiError.forbidden('Você não pode criar usuários em outra academia');
}
```

---

### SEC-002 — Mass Assignment de Status em Aula (Bypass de Máquina de Estados)

**Arquivo:** `src/modules/aulas/aulas.schemas.ts:50`

**Descrição:**  
O schema de atualização de aula aceita `status` como campo editável diretamente:

```typescript
export const updateAulaSchema = z.object({
  // ...
  status: z.nativeEnum(StatusAula).optional(), // ← VULNERÁVEL
});
```

Isso permite que qualquer PROFESSOR ou ADMIN chame `PUT /api/aulas/:id` com `{"status": "CONCLUIDA"}` sem passar pelos endpoints de transição (`/iniciar`, `/concluir`, `/cancelar`), contornando toda a lógica de negócio (como marcar reservas como FALTOU, verificar estado anterior, etc.).

**Impacto:**
- Aula pode ir de `AGENDADA` direto para `CONCLUIDA` sem registrar presenças
- Aula pode ser revertida de `CONCLUIDA` para `AGENDADA` (dados inconsistentes)
- Reservas não são processadas corretamente

**Remediação:**
```typescript
// Remover status do updateAulaSchema completamente
export const updateAulaSchema = z.object({
  professorId: z.string().cuid().optional(),
  professorSubstitutoId: z.string().cuid().optional().nullable(),
  dataHora: z.coerce.date().optional(),
  duracao: z.number().int().positive().optional(),
  categoria: z.nativeEnum(CategoriaTurma).optional(),
  modalidade: z.nativeEnum(Modalidade).optional(),
  tipoAula: z.nativeEnum(TipoAula).optional(),
  limiteAlunos: z.number().int().positive().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  // status REMOVIDO — use /iniciar, /concluir, /cancelar
});
```

---

### SEC-003 — Presença Pode Ser Registrada em Aula AGENDADA

**Arquivo:** `src/modules/presencas/presencas.service.ts:134-136` e `:222-225`

**Descrição:**  
Ambos os métodos `create` e `registrarEmLote` verificam apenas se a aula está `CANCELADA`, mas aceitam aulas em qualquer outro estado — incluindo `AGENDADA` (ainda não iniciada):

```typescript
// presencas.service.ts linha 134-136
if (aula.status === 'CANCELADA') {
  throw ApiError.badRequest('Não é possível registrar presença em aula cancelada');
}
// Aulas AGENDADAS passam por aqui sem erro! ↑
```

**Impacto:**
- Presenças podem ser registradas antes da aula começar
- Contador `aulasDesdePromocao` é incrementado prematuramente
- Histórico de presenças fica adulterado

**Remediação:**
```typescript
// Linha 134-136 e 222-225: substituir verificação
if (aula.status !== 'EM_ANDAMENTO' && aula.status !== 'CONCLUIDA') {
  throw ApiError.unprocessable(
    'Presença só pode ser registrada em aulas em andamento ou concluídas'
  );
}
```

---

### SEC-004 — Cancelamento de Reserva sem Verificação de Propriedade

**Arquivo:** `src/modules/reservas/reservas.routes.ts:37-42`

**Descrição:**  
O endpoint `PATCH /api/reservas/:id/cancelar` requer autenticação (via `router.use(authenticate)` na linha 15), mas **não verifica se o usuário autenticado é dono da reserva**. Qualquer usuário autenticado pode cancelar a reserva de qualquer outro usuário.

```typescript
// reservas.routes.ts linha 37-42
router.patch(
  '/:id/cancelar',
  validateParams(reservaIdParamSchema),
  reservasController.cancelar  // ← nenhuma verificação de propriedade
);
```

**Impacto:**
- Aluno A pode cancelar a reserva do Aluno B, forçando-o a perder a vaga
- PROFESSOR pode cancelar reservas de alunos maliciosamente
- Manipulação de fila de espera (cancelar reservas para subir na fila)

**Remediação:**
```typescript
// No service de cancelar, verificar propriedade:
async cancelar(reservaId: string, usuarioId: string, userPerfil: Perfil): Promise<void> {
  const reserva = await prisma.reserva.findUnique({
    where: { id: reservaId },
    include: { aluno: { include: { usuario: true } } },
  });
  if (!reserva) throw ApiError.notFound('Reserva não encontrada');

  // Só o próprio aluno ou ADMIN/PROFESSOR/RECEPCIONISTA pode cancelar
  const ehDono = reserva.aluno.usuario?.id === usuarioId;
  const ehGestor = ['ADMIN', 'PROFESSOR', 'RECEPCIONISTA'].includes(userPerfil);
  if (!ehDono && !ehGestor) {
    throw ApiError.forbidden('Você não pode cancelar esta reserva');
  }
  // ...
}
```

---

### SEC-005 — Isolamento de Academia Ausente (Cross-Academy Data Leakage)

**Arquivo:** `src/shared/middlewares/auth.middleware.ts:68-86` (existe mas nunca é usado)  
**Afeta:** `alunos`, `aulas`, `presencas`, `reservas`, `graduacoes`, `financeiro` (todas as rotas GET)

**Descrição:**  
O middleware `checkAcademiaAccess` existe mas **não é aplicado em nenhuma rota**. Isso significa que um PROFESSOR vinculado à "Academia A" pode:

```http
GET /api/alunos?academiaId=<id-academia-B>
GET /api/financeiro/mensalidades?academiaId=<id-academia-B>
GET /api/aulas?academiaId=<id-academia-B>
```

E obter dados de outra academia livremente.

**Impacto:**
- Dados pessoais de alunos (CPF, email, telefone) visíveis por professores de outras academias
- Dados financeiros (mensalidades, valores de planos) vazam entre academias
- Viola requisitos de privacidade de dados (LGPD)

**Remediação — estratégia recomendada (filtro automático no service):**

Em vez de depender de middleware (que pode ser esquecido), filtrar no service baseado em `req.user`:

```typescript
// Padrão a ser aplicado em todos os services de listagem
async findAll(params: AlunoFilters, currentUser: AuthUser) {
  const where: Prisma.AlunoWhereInput = {};

  // Non-ADMINs só veem sua própria academia
  if (currentUser.perfil !== 'ADMIN' || currentUser.academiaId) {
    where.matriculas = {
      some: { academiaId: currentUser.academiaId }
    };
  } else if (params.academiaId) {
    where.matriculas = { some: { academiaId: params.academiaId } };
  }
  // ...
}
```

---

## Vulnerabilidades Altas

---

### SEC-006 — Faixa/Graus Podem Ser Definidos Diretamente ao Criar Aluno

**Arquivo:** `src/modules/alunos/alunos.schemas.ts:40-41`

**Descrição:**  
O `createAlunoSchema` expõe `faixa` e `graus` como campos editáveis:

```typescript
faixa: z.nativeEnum(Faixa).default('BRANCA'),
graus: z.number().int().min(0).max(6).default(0),
```

Um RECEPCIONISTA pode criar um aluno com `faixa: 'PRETA'` via `POST /api/alunos`, contornando completamente o sistema de graduação.

**Remediação:**
```typescript
// Remover faixa e graus do createAlunoSchema
// Novos alunos sempre iniciam em BRANCA, 0 graus (valor fixo no service)
// Alterações de faixa: exclusivamente via POST /api/graduacoes
```

---

### SEC-007 — Transição de Estado Inválida: AGENDADA → CONCLUIDA

**Arquivo:** `src/modules/aulas/aulas.service.ts:375`

**Descrição:**
```typescript
// aulas.service.ts linha 375
if (existing.status !== 'EM_ANDAMENTO' && existing.status !== 'AGENDADA') {
  throw ApiError.badRequest('...');
}
```

A validação aceita `AGENDADA` como estado válido para concluir uma aula. Uma aula `AGENDADA` pode ir diretamente para `CONCLUIDA` sem passar por `EM_ANDAMENTO`.

**Impacto:** Aulas concluídas sem registro de início. Reservas marcadas como `FALTOU` incorretamente (quem estava esperando).

**Remediação:**
```typescript
if (existing.status !== 'EM_ANDAMENTO') {
  throw ApiError.badRequest('Apenas aulas em andamento podem ser concluídas');
}
```

---

### SEC-008 — Endpoint de Status Público Sem Rate Limit (Enumeração de Emails)

**Arquivo:** `src/modules/cadastro-publico/cadastro-publico.routes.ts:34-37`

**Descrição:**
```typescript
router.get('/public/cadastro/status', cadastroPublicoController.verificarStatus);
// Sem rate limiting, sem autenticação
```

A query `?email=xxx@example.com` responde se aquele email está ou não cadastrado no sistema (e com qual status). Sem rate limit, um atacante pode enumerar emails válidos em alta velocidade.

**Impacto:** Vazamento de informação — confirma quais emails estão cadastrados no sistema.

**Remediação:**
```typescript
import { createLimiter } from '../../shared/middlewares/rate-limit.middleware';

router.get('/public/cadastro/status',
  createLimiter,           // 30 req/15min por IP
  cadastroPublicoController.verificarStatus
);
```

Adicionalmente, considerar retornar resposta genérica idêntica para email encontrado e não encontrado (evitar timing attacks).

---

### SEC-009 — Registro Sem Verificação de Relação Aluno-Aula

**Arquivo:** `src/modules/presencas/presencas.service.ts:129-213`

**Descrição:**  
Ao registrar presença, o sistema verifica se a aula existe e se o aluno existe, mas **não verifica se o aluno pertence à academia da aula** nem se tem matrícula ativa. Um PROFESSOR pode registrar presença de um aluno de outra academia, ou de um aluno sem matrícula.

**Impacto:** Dados de presença inconsistentes. Contador `aulasDesdePromocao` incrementado para alunos sem vínculo real.

**Remediação:**
```typescript
// Verificar se aluno tem matrícula ativa na academia da aula
const matricula = await prisma.matricula.findFirst({
  where: {
    alunoId: data.alunoId,
    academiaId: aula.academiaId,
    status: 'ATIVA',
  },
});
if (!matricula) {
  throw ApiError.unprocessable('Aluno não possui matrícula ativa nesta academia');
}
```

---

### SEC-010 — Lógica de Reserva "Consumida" é No-Op

**Arquivo:** `src/modules/presencas/presencas.service.ts:200-207` e `:265-273`

**Descrição:**  
Quando uma presença é registrada, o código tenta "consumir" a reserva mas executa um no-op:

```typescript
// linha 200-207 — atualiza CONFIRMADA para CONFIRMADA (sem efeito)
await tx.reserva.updateMany({
  where: { aulaId: data.aulaId, alunoId: data.alunoId, status: 'CONFIRMADA' },
  data: { status: 'CONFIRMADA' },  // ← STATUS IGUAL, NO-OP!
});
```

**Impacto:**  
- Reservas `CONFIRMADA` nunca são marcadas como consumidas/atendidas
- Quando `concluirAula` roda, essas reservas serão marcadas como `FALTOU` mesmo para alunos que compareceram
- Contador `faltasReservas` é incrementado incorretamente para quem foi à aula

**Remediação — opção 1 (adicionar status COMPARECEU):**  
Adicionar `COMPARECEU` ao enum `StatusReserva` no Prisma schema.

**Remediação — opção 2 (simples, sem migração):**  
```typescript
// Em concluirAula, só marcar como FALTOU quem NÃO tem presença registrada
const alunosComPresenca = await tx.presenca.findMany({
  where: { aulaId: id },
  select: { alunoId: true },
});
const idsComPresenca = alunosComPresenca.map(p => p.alunoId);

await tx.reserva.updateMany({
  where: {
    aulaId: id,
    status: 'CONFIRMADA',
    alunoId: { notIn: idsComPresenca }, // só quem não compareceu
  },
  data: { status: 'FALTOU' },
});
```

---

### SEC-011 — Criação de Reserva Sem Verificação de Pertencimento à Academia

**Arquivo:** `src/modules/reservas/reservas.routes.ts:30-35`

**Descrição:**  
`POST /api/reservas` aceita qualquer `alunoId` e `aulaId` sem verificar se o usuário autenticado tem autoridade para criar aquela reserva, e sem verificar se o aluno pertence à academia da aula.

**Remediação:**  
No service de criação de reserva, verificar:
1. Se `req.user.perfil === 'ALUNO'`: o `alunoId` deve corresponder ao aluno vinculado ao usuário
2. Se PROFESSOR/RECEPCIONISTA: o `alunoId` deve pertencer à sua academia
3. O aluno deve ter matrícula ativa na academia da aula

---

## Vulnerabilidades Médias

---

### SEC-012 — Refresh Token Armazenado em Texto Simples no Banco

**Arquivo:** `src/modules/auth/auth.service.ts:63-65`, `:128-130`

**Descrição:**  
O refresh token completo é armazenado em plaintext na coluna `refreshToken` da tabela `usuarios`:

```typescript
data: { refreshToken: tokens.refreshToken }
```

**Impacto:**  
Se o banco de dados for comprometido (SQL injection em outro ponto, backup exposto), todos os refresh tokens ativos são válidos imediatamente e permitem login sem senha.

**Remediação:**  
Armazenar apenas o hash do refresh token:
```typescript
import { createHash } from 'crypto';

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Ao salvar:
data: { refreshToken: hashRefreshToken(tokens.refreshToken) }

// Ao verificar:
if (usuario.refreshToken !== hashRefreshToken(refreshToken)) {
  throw ApiError.unauthorized('Refresh token inválido');
}
```

---

### SEC-013 — Erro de Validação do Prisma Vaza Detalhes Internos

**Arquivo:** `src/shared/middlewares/error-handler.middleware.ts:55-62`

**Descrição:**
```typescript
if (err instanceof Prisma.PrismaClientValidationError) {
  const errorDetail = err.message.split('\n').pop() || '';
  return res.status(400).json(
    error(`Erro de validação de dados: ${errorDetail}`)  // ← vaza estrutura interna
  );
}
```

A mensagem de erro inclui nomes de campos e tipos do schema Prisma, expondo a estrutura interna do banco de dados.

**Remediação:**
```typescript
if (err instanceof Prisma.PrismaClientValidationError) {
  console.error('Prisma Validation Error (interno):', err.message); // apenas no log
  return res.status(400).json(error('Dados inválidos para a operação'));
}
```

---

### SEC-014 — Tokens Armazenados Duplicados no Frontend — ✅ CORRIGIDO

**Arquivo:** `jiujitsu-frontend/stores/auth-store.ts:28-32`

> `api-client.ts` lê exclusivamente do Zustand store via `lib/auth-bridge.ts` (`getAuthState()`); não há mais `localStorage.setItem`/`getItem` manual de tokens fora do `persist` do Zustand.  
**Arquivo:** `jiujitsu-frontend/lib/api-client.ts:16-20`

**Descrição:**  
Os tokens são armazenados em dois lugares distintos no localStorage:
1. Via Zustand persist: chave `auth-storage` (com usuário, tokens, etc.)
2. Via `localStorage.setItem('accessToken', ...)` diretamente no store

O `api-client.ts` lê de `localStorage.getItem('accessToken')` — chave separada. O Zustand persiste em `auth-storage` como JSON. Isso cria duas cópias desincronizadas dos tokens.

**Impacto:**  
- Logout limpa `auth-storage` mas deixa `accessToken` e `refreshToken` como keys separadas
- O `api-client.ts` continua usando o token antigo após logout (até o usuário recarregar)
- Possível manter sessão "zumbi" após logout

**Remediação:**  
Centralizar leitura de token. O `api-client.ts` deve ler do Zustand store, não diretamente do localStorage:

```typescript
// api-client.ts — usar Zustand store como fonte única de verdade
apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});
```

E remover os `localStorage.setItem` manuais do auth-store, deixando apenas o Zustand persist gerenciar.

---

### SEC-015 — Validação de CPF Apenas no Cadastro Público

**Arquivo:** `src/modules/alunos/alunos.schemas.ts:9-13`

**Descrição:**  
O `createAlunoSchema` valida apenas o formato do CPF (11 dígitos numéricos), sem validar os dígitos verificadores:

```typescript
cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos numéricos').optional()
```

O `cadastroPublicoSchema` possui validação matemática completa do CPF. Mas ao criar alunos internamente via `/api/alunos`, aceita CPFs matematicamente inválidos (ex: `12345678900`).

**Remediação:**  
Extrair a função `validarCPF` do `cadastro-publico.schemas.ts` para um utilitário compartilhado em `src/shared/utils/validators.ts` e reutilizá-la no `createAlunoSchema`.

---

### SEC-016 — Rejeição de Cadastro Sem Motivo Obrigatório

**Arquivo:** `src/modules/cadastro-publico/cadastro-publico.schemas.ts:127-129`

**Descrição:**
```typescript
export const rejeitarCadastroSchema = z.object({
  motivo: z.string().max(500).optional(), // ← opcional!
});
```

Permite rejeitar um cadastro sem informar motivo, contradizendo o critério de aceitação da US-093 ("Motivo de rejeição é obrigatório").

**Remediação:**
```typescript
motivo: z.string().min(10, 'Motivo deve ter pelo menos 10 caracteres').max(500),
```

---

## Riscos Baixos e Observações

---

### SEC-017 — Fallback para URL de Produção no Frontend — ✅ CORRIGIDO

**Arquivo:** `jiujitsu-frontend/lib/api-client.ts:4`

> Fora de produção, ausência de `NEXT_PUBLIC_API_URL` agora lança erro no boot em vez de apontar silenciosamente para produção.

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jiujitsu-backend.vercel.app';
```

Se `NEXT_PUBLIC_API_URL` não estiver configurado, o frontend aponta para produção silenciosamente. Um desenvolvedor sem `.env.local` testará contra produção sem perceber.

**Remediação:** Lançar erro em build se a variável não estiver definida:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_BASE_URL) throw new Error('NEXT_PUBLIC_API_URL não configurado');
```

---

### SEC-018 — Comparação de Token Por Mensagem (Frágil) — ✅ CORRIGIDO

**Arquivo:** `jiujitsu-frontend/lib/api-client.ts:35`

> Backend retorna `code: 'TOKEN_EXPIRED'` (`src/shared/utils/api-error.ts`) e o frontend compara por esse código, não mais pela mensagem.

```typescript
if (error.response?.data?.message === 'Token expirado' && !originalRequest._retry) {
```

A lógica de refresh depende de uma comparação de string exata com a mensagem do backend. Se a mensagem mudar (tradução, refatoração), o refresh para de funcionar silenciosamente.

**Remediação:** Usar código de erro estruturado:
```typescript
// Backend: retornar código junto com a mensagem
{ success: false, message: '...', code: 'TOKEN_EXPIRED' }

// Frontend: comparar pelo código
if (error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
```

---

### SEC-019 — Ausência de Complexidade Mínima de Senha — ✅ CORRIGIDO

**Arquivo:** `src/modules/auth/auth.schemas.ts:14-17`

> `senhaNova` agora exige mínimo de 8 caracteres e ao menos uma letra maiúscula.

**Remediação:** Adicionar ao schema de alteração de senha:
```typescript
senhaNova: z.string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
  .regex(/[0-9]/, 'Deve conter ao menos um número'),
```

---

### SEC-020 — Logs de Erros em Produção Sem Serviço de Observabilidade — ✅ ENDEREÇADO (sem serviço externo)

**Arquivos:** `src/shared/middlewares/request-logger.middleware.ts`, `src/shared/middlewares/error-handler.middleware.ts`

Decisão consciente do usuário: usar os logs nativos da Vercel (sem Sentry/Logtail/Datadog) em vez de um serviço externo. O que foi feito em 2026-08-31:

- `requestLogger` (novo middleware, primeiro da cadeia em `app.ts`) gera um `requestId` (`crypto.randomUUID()`) por requisição e loga uma linha JSON ao final de cada requisição — método, path, status, duração, `userId` (quando autenticado). Nível `info`/`warn`/`error` conforme o status code.
- `error-handler.middleware.ts` loga uma linha JSON estruturada por exceção não tratada, com o mesmo `requestId` da linha de acesso (permite correlacionar as duas), nome/mensagem do erro e stack trace (só em `NODE_ENV=development` — produção não vaza stack no log).
- Como consultar: `vercel logs <url-do-deployment>` via CLI, ou aba **Logs** do projeto no dashboard da Vercel. Como as linhas são JSON, dá pra filtrar por `"statusCode":5` ou por um `requestId` específico direto na busca de texto do dashboard.
- Isso não substitui um serviço de observabilidade completo (sem alertas automáticos, sem agregação/dashboards, retenção limitada ao plano da Vercel) — se o volume de erros crescer a ponto de precisar de alertas, Sentry no backend continua sendo a recomendação natural (ver discussão registrada nesta sessão).

---

## Plano de Remediação

### Sprint 1 — Imediato (antes de qualquer usuário real)

| ID | Vulnerabilidade | Esforço | Impacto |
|----|----------------|---------|---------|
| SEC-001 | Escalada de privilégio na aprovação | Médio | Crítico |
| SEC-002 | Mass assignment de status em Aula | Baixo | Crítico |
| SEC-003 | Presença em aula AGENDADA | Baixo | Crítico |
| SEC-004 | Cancelamento de reserva sem auth | Baixo | Crítico |
| SEC-010 | No-op ao consumir reserva (FALTOU errado) | Médio | Crítico |

### Sprint 2 — Alta prioridade (1ª semana)

| ID | Vulnerabilidade | Esforço | Impacto |
|----|----------------|---------|---------|
| SEC-005 | Isolamento de academia ausente | Alto | Alto |
| SEC-006 | Faixa/graus editáveis na criação de aluno | Baixo | Alto |
| SEC-007 | Transição AGENDADA → CONCLUIDA | Baixo | Alto |
| SEC-008 | Rate limit no endpoint de status público | Baixo | Alto |
| SEC-011 | Criação de reserva sem check de academia | Médio | Alto |
| SEC-014 | Tokens duplicados no frontend | Médio | Alto |

### Sprint 3 — Média prioridade (2ª semana)

| ID | Vulnerabilidade | Esforço | Impacto |
|----|----------------|---------|---------|
| SEC-009 | Presença sem verificar matrícula | Médio | Médio |
| SEC-012 | Refresh token em plaintext no banco | Médio | Médio |
| SEC-013 | Vazamento de detalhes Prisma nos erros | Baixo | Médio |
| SEC-015 | CPF sem validação matemática | Baixo | Médio |
| SEC-016 | Rejeição sem motivo obrigatório | Baixo | Médio |

### Sprint 4 — Baixa prioridade (quando possível)

| ID | Vulnerabilidade | Esforço | Impacto | Status |
|----|----------------|---------|---------|--------|
| SEC-017 | Fallback para URL de produção | Baixo | Baixo | ✅ Corrigido |
| SEC-018 | Comparação de token por string | Baixo | Baixo | ✅ Corrigido |
| SEC-019 | Sem complexidade mínima de senha | Baixo | Baixo | ✅ Corrigido |
| SEC-020 | Sem observabilidade de erros | Alto | Baixo | ✅ Endereçado (logs nativos Vercel, sem serviço externo) |

---

## O que está bem implementado

Pontos positivos identificados — manter e usar como referência:

| Aspecto | Implementação |
|---------|---------------|
| **bcrypt** | 10 rounds — adequado (`CONSTANTS.SALT_ROUNDS_BCRYPT`) |
| **JWT duplo** | Access 15min + Refresh 7d com rotação a cada uso |
| **Rate limit no login** | 5 tentativas / 15min, `skipSuccessfulRequests: true` |
| **Rate limit global** | 100 req / 15min por IP |
| **Helmet** | Headers de segurança habilitados (HSTS, CSP, X-Frame-Options) |
| **Validação com Zod** | Presente na maioria dos endpoints |
| **Verificação de usuário ativo** | `authenticate` busca o usuário no banco a cada request |
| **Refresh token invalidado no logout** | `refreshToken: null` no banco |
| **Soft delete** | Sem deleção física de entidades sensíveis |
| **Verificação de senha atual** | `changePassword` verifica senhaAtual antes de alterar |
| **Erros genéricos em produção** | `error-handler` usa mensagem genérica em `NODE_ENV=production` |
| **Validação matemática de CPF** | Implementada no cadastro público |
| **CORS configurável** | Via `CORS_ORIGIN` env, não wildcard hardcoded |
| **Cron jobs protegidos** | Verificam `CRON_SECRET` no header |

---

## Referências

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [CWE-284: Improper Access Control](https://cwe.mitre.org/data/definitions/284.html)
- [CWE-269: Improper Privilege Management](https://cwe.mitre.org/data/definitions/269.html)
- [CWE-915: Improperly Controlled Modification of Dynamically-Determined Object Attributes](https://cwe.mitre.org/data/definitions/915.html)
- [LGPD — Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
