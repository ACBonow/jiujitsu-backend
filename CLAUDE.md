# CLAUDE.md — jiujitsu-backend

Sistema de gestão de academias de artes marciais. Backend Node.js/TypeScript com Express e Prisma.

## Documentação

- `docs/SDD.md` — Especificação completa: domínio, módulos, regras de negócio, API
- `docs/TDD.md` — Guia de testes: setup, padrões, helpers, lista de comportamentos a cobrir
- `docs/API.md` — Referência detalhada de todos os endpoints (request/response/erros)
- `docs/GLOSSARY.md` — Glossário de domínio: definições precisas de todos os termos do negócio
- `docs/USER-STORIES.md` — Histórias de usuário por perfil com critérios de aceitação (Given/When/Then)
- `docs/STATE-MACHINES.md` — Máquinas de estado (Mermaid) para Aula, Reserva, Mensalidade, etc.
- `docs/SEQUENCES.md` — Diagramas de sequência (Mermaid) para os fluxos críticos do sistema
- `docs/SETUP.md` — Guia completo de setup local (banco, env, migrations, seed, testes)
- `docs/SECURITY.md` — Análise de segurança completa: 20 vulnerabilidades com remediação (5 críticas, 6 altas, 5 médias, 4 baixas)
- `docs/adr/` — Architecture Decision Records: por que cada decisão técnica foi tomada
- `CONTRIBUTING.md` — Fluxo de trabalho SDD+TDD, convenções, passo a passo de novas features

**Ordem de leitura recomendada para IA:**
1. `GLOSSARY.md` → entender os termos
2. `USER-STORIES.md` → entender o PORQUÊ
3. `SDD.md` → entender o COMO
4. `STATE-MACHINES.md` → entender ciclos de vida
5. `API.md` → contratos de interface

## Stack

- Node.js + TypeScript strict
- Express 4
- Prisma 5 + PostgreSQL (Neon)
- Validação: Zod
- Auth: JWT (access 15min + refresh 7d) + bcrypt
- Deploy: Vercel serverless

## Estrutura de módulo

```
src/modules/<nome>/
  <nome>.routes.ts      # Router Express + middleware de auth/roles
  <nome>.controller.ts  # req/res → chama service → retorna ApiResponse
  <nome>.service.ts     # lógica de negócio pura
  <nome>.repository.ts  # queries Prisma
  <nome>.schemas.ts     # schemas Zod de validação
```

## Comandos

```bash
npm run dev              # tsx watch (desenvolvimento)
npm run build            # tsup + prisma generate
npm run prisma:migrate   # rodar migrations
npm run prisma:seed      # popular banco com dados de teste
npm run prisma:studio    # Prisma Studio (GUI do banco)
npm test                 # rodar testes
npm run test:watch       # testes em modo watch
npm run test:coverage    # cobertura de código
```

## Padrão de resposta API

```typescript
// Sucesso
{ success: true, data: T, pagination?: PaginationMeta }

// Erro
{ success: false, message: string, errors?: Record<string, string[]> }
```

## Regras importantes

1. Nunca deletar fisicamente registros de `Pessoa`, `Aluno`, `Professor`, `Academia` — usar `ativo = false`
2. `Graduacao` é append-only — nunca deletar ou editar registros de graduação
3. `Mensalidade` é única por `(matriculaId, mesReferencia)`
4. `Presenca` é única por `(aulaId, alunoId)`
5. Validar com Zod em todo endpoint que recebe body — usar `validateBody` middleware
6. Autorizar com `authenticate` + `authorize([Perfil.X, ...])` em todas as rotas protegidas
7. Lógica de negócio fica no Service, nunca no Controller ou Repository

## TDD

Antes de implementar uma feature nova:
1. Leia a especificação no `docs/SDD.md`
2. Escreva os testes em `src/tests/`
3. Rode `npm test` para ver falhar (RED)
4. Implemente o código
5. Rode `npm test` para ver passar (GREEN)
