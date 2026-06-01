# ADR-001: Node.js + TypeScript + Express como stack do backend

**Status:** Aceito

## Contexto

O sistema precisa de uma API REST para suportar um SPA (Next.js). Os requisitos são:
- Deploy serverless na Vercel
- TypeScript end-to-end (frontend também usa TS)
- Equipe com experiência em JavaScript/TypeScript
- Ecossistema rico para auth, validação e ORM

## Decisão

Usar **Node.js** com **TypeScript** (strict mode) e **Express 4** como framework HTTP.

## Alternativas consideradas

| Alternativa | Por que descartada |
|-------------|-------------------|
| **NestJS** | Overhead de decorators e IoC container desnecessário para este escopo. Curva de aprendizado alta. Complexidade extra sem benefício proporcional. |
| **Fastify** | Alternativa válida e mais performática, mas ecossistema de plugins menos maduro que Express. Familiaridade da equipe com Express foi determinante. |
| **Hono** | Excelente para edge, mas ainda imaturo para APIs full-featured em 2024. |
| **Python (FastAPI)** | Quebraria a coerência TypeScript end-to-end. Dois runtimes para manter. |

## Consequências

**Vantagens:**
- TypeScript compartilhado com frontend — tipos podem ser reusados via package
- Express tem ecossistema maduro (middleware, integrações)
- Familiaridade da equipe = menor risco de erros
- Compatível nativamente com Vercel serverless

**Desvantagens:**
- Express não tem type-safety nativo nas rotas (contornado com tipos TypeScript manuais)
- Performance inferior a Fastify/Hono em benchmarks de throughput puro (aceitável para o volume esperado)
