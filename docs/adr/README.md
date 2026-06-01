# Architecture Decision Records (ADRs)

Registro das decisões arquiteturais do projeto. Cada ADR documenta uma decisão importante, seu contexto e as alternativas consideradas.

## Índice

| # | Decisão | Status |
|---|---------|--------|
| [001](ADR-001-nodejs-express.md) | Node.js + TypeScript + Express como stack do backend | Aceito |
| [002](ADR-002-prisma-postgresql.md) | Prisma como ORM + PostgreSQL (Neon) | Aceito |
| [003](ADR-003-jwt-dual-token.md) | Estratégia JWT duplo (access + refresh) | Aceito |
| [004](ADR-004-modular-architecture.md) | Arquitetura modular (Controller → Service → Repository) | Aceito |
| [005](ADR-005-vercel-serverless.md) | Vercel Serverless como plataforma de deploy | Aceito |
| [006](ADR-006-nextjs-app-router.md) | Next.js 16 App Router como framework frontend | Aceito |
| [007](ADR-007-tanstack-query.md) | TanStack Query para estado de servidor | Aceito |
| [008](ADR-008-zustand.md) | Zustand para estado de autenticação | Aceito |
| [009](ADR-009-shadcn-ui.md) | shadcn/ui como biblioteca de componentes | Aceito |
| [010](ADR-010-vitest.md) | Vitest como framework de testes | Aceito |

## Formato

```
# ADR-NNN: Título da Decisão

**Status:** Proposto | Aceito | Obsoleto | Substituído por ADR-NNN

## Contexto
O que motivou esta decisão.

## Decisão
O que foi decidido.

## Alternativas consideradas
Outras opções avaliadas e por que foram descartadas.

## Consequências
Vantagens e desvantagens da decisão.
```
