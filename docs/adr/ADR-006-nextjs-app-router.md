# ADR-006: Next.js 16 App Router como framework frontend

**Status:** Aceito

## Contexto

O frontend é um SPA administrativo (dashboard) com algumas páginas públicas. Requisitos:
- Roteamento com layouts aninhados (sidebar + header persistentes)
- TypeScript nativo
- Deploy na Vercel (integração nativa)
- Bom ecossistema para componentes e estado

## Decisão

Usar **Next.js 16** com **App Router** (não Pages Router).

Toda a lógica de dados é feita no **cliente** via TanStack Query — não usamos Server Components para fetch de dados da API (a API exige token JWT que não está disponível no servidor).

Estrutura de layouts:
```
app/
  (auth)/layout.tsx       → Layout simples sem sidebar (login)
  (dashboard)/layout.tsx  → Layout com sidebar + header + auth guard
  (public)/layout.tsx     → Layout público (pré-cadastro)
```

## Alternativas consideradas

| Alternativa | Por que descartada |
|-------------|-------------------|
| **Next.js Pages Router** | App Router é o futuro do Next.js. Layouts aninhados e Server Components são mais poderosos. |
| **Remix** | Excelente, mas ecosystem menor e menos familiar para a equipe. |
| **Vite + React (SPA puro)** | Sem SSR/SSG nativo, sem roteamento baseado em arquivos, sem integração nativa Vercel. |
| **Nuxt (Vue)** | Equipe é TypeScript/React-first. |

## Consequências

**Vantagens:**
- Layouts aninhados eliminam re-renders desnecessários da sidebar/header
- App Router tem melhor suporte a streaming e Suspense
- Deploy Vercel com zero configuração
- Route Groups `(auth)`, `(dashboard)`, `(public)` organizam rotas por contexto sem afetar URL

**Desvantagens:**
- App Router tem curva de aprendizado (`'use client'` vs Server Component)
- Server Components não são usados para fetch (limitação do auth baseado em token), então parte do benefício do App Router é subutilizada
- Next.js 16 com React 19 ainda tem algumas incompatibilidades de libs de terceiros
