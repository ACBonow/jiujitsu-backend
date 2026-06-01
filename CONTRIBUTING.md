# Guia de Contribuição — jiujitsu-backend

## Filosofia: Spec-Driven + Test-Driven

Todo desenvolvimento segue este fluxo:

```
SDD.md → Testes (RED) → Implementação (GREEN) → Refatoração (BLUE)
```

**Nunca escreva código sem antes ter:**
1. Lido a especificação em `docs/SDD.md`
2. Consultado o glossário em `docs/GLOSSARY.md`
3. Escrito pelo menos um teste que falha

---

## Fluxo de trabalho

### 1. Entenda o requisito

Antes de qualquer linha de código:
- Leia a seção relevante do `docs/SDD.md`
- Consulte o `docs/GLOSSARY.md` para entender os termos do domínio
- Se a feature não está no SDD, **atualize o SDD primeiro**

### 2. Crie os testes (RED)

```bash
# Crie o arquivo de teste
# src/tests/unit/services/<modulo>.service.test.ts   ← lógica de negócio
# src/tests/integration/<modulo>.test.ts             ← rotas HTTP

npm run test:watch  # Confirme que os testes falham
```

Checklist do teste:
- [ ] Testa o happy path
- [ ] Testa casos de erro esperados (validação, not found, conflito)
- [ ] Testa regras de autorização (401 sem token, 403 com perfil errado)
- [ ] Usa helpers de `src/tests/helpers/` para setup

### 3. Implemente (GREEN)

```
src/modules/<nome>/
  <nome>.schemas.ts     ← schema Zod primeiro
  <nome>.repository.ts  ← queries Prisma
  <nome>.service.ts     ← regra de negócio
  <nome>.controller.ts  ← req/res
  <nome>.routes.ts      ← endpoints + middlewares
```

Rode `npm test` frequentemente para ver testes passando.

### 4. Refatore (BLUE)

Com todos os testes passando, refatore sem medo:
- Extraia funções repetidas
- Melhore nomes de variáveis
- Simplifique condicionais

### 5. PR Checklist

Antes de abrir pull request:

```bash
npm run build        # Build sem erros
npm test             # Todos os testes passam
npm run test:coverage  # Cobertura não caiu
```

- [ ] SDD.md atualizado se a feature mudou algum comportamento
- [ ] Novo ADR criado se foi tomada uma decisão arquitetural
- [ ] GLOSSARY.md atualizado se novos termos de domínio foram introduzidos
- [ ] Testes unitários para toda lógica no service.ts
- [ ] Teste de integração para cada endpoint novo

---

## Convenções de código

### Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Variáveis / funções | camelCase | `calcularDataVencimento` |
| Classes / Types / Interfaces | PascalCase | `CriarAlunoInput` |
| Constantes | UPPER_SNAKE_CASE | `LIMITE_FALTAS_RESERVA` |
| Arquivos | kebab-case | `jwt-helper.ts` |
| Tabelas BD | snake_case plural | `@@map("presencas")` |

### Estrutura de uma função de service

```typescript
// ✅ Correto
async function criarReserva(input: CriarReservaInput): Promise<Reserva> {
  // 1. Validações de regra de negócio
  const aluno = await alunoRepository.findById(input.alunoId);
  if (!aluno) throw ApiError.notFound('Aluno não encontrado');
  if (aluno.faltasReservas >= config.reservas.limiteFaltas) {
    throw ApiError.unprocessable('Limite de faltas atingido');
  }

  // 2. Lógica de negócio
  const vagas = await reservaRepository.countConfirmadas(input.aulaId);
  const status = aula.limiteAlunos && vagas >= aula.limiteAlunos ? 'ESPERA' : 'CONFIRMADA';

  // 3. Persistência
  return reservaRepository.create({ ...input, status });
}
```

### Resposta da API

```typescript
// Sucesso 200/201
res.json({ success: true, data: resultado });

// Sucesso com paginação
res.json({ success: true, data: lista, pagination: meta });

// Erro (via ApiError — nunca res.status(x).json() manual em controllers)
throw ApiError.notFound('Aluno não encontrado');
throw ApiError.badRequest('Campo inválido', { nome: ['Nome é obrigatório'] });
```

### Validação com Zod

```typescript
// schemas.ts
export const criarAlunoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional(),
  dataNascimento: z.coerce.date(),
});

// routes.ts
router.post('/', authenticate, authorize([Perfil.ADMIN]), validateBody(criarAlunoSchema), controller.criar);
```

---

## Estrutura de testes

```
src/tests/
  setup.ts                    # afterAll: prisma.$disconnect()
  helpers/
    auth.helper.ts            # gerarToken, tokenAdmin, tokenProfessor...
    db.helper.ts              # limparBanco, criarAcademia, criarAluno...
  unit/
    services/                 # Testa lógica sem HTTP
    utils/                    # Testa helpers
  integration/                # Testa rotas com supertest
```

**Regra:** Testes unitários mocam o repository. Testes de integração usam banco real (`.env.test`).

---

## Criando um novo módulo (passo a passo)

```bash
# 1. Crie a pasta
mkdir src/modules/meu-modulo

# 2. Crie os arquivos na ordem:
touch src/modules/meu-modulo/meu-modulo.schemas.ts
touch src/modules/meu-modulo/meu-modulo.repository.ts
touch src/modules/meu-modulo/meu-modulo.service.ts
touch src/modules/meu-modulo/meu-modulo.controller.ts
touch src/modules/meu-modulo/meu-modulo.routes.ts

# 3. Registre no app.ts
# app.use('/api/meu-modulo', meuModuloRoutes);

# 4. Crie os testes antes de implementar
touch src/tests/unit/services/meu-modulo.service.test.ts
touch src/tests/integration/meu-modulo.test.ts
```

---

## Comandos de desenvolvimento

```bash
npm run dev              # Servidor em modo watch
npm run prisma:migrate   # Rodar migrations
npm run prisma:seed      # Popular banco de dev
npm run prisma:studio    # GUI do banco

npm test                 # Rodar todos os testes
npm run test:watch       # Watch mode
npm run test:coverage    # Relatório de cobertura

npm run build            # Build de produção
```
