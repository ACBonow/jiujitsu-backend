# ADR-002: Prisma como ORM + PostgreSQL (Neon)

**Status:** Aceito

## Contexto

O sistema tem um modelo de dados relacional complexo com ~17 tabelas, múltiplas relações N:N e regras de integridade referencial. Precisamos de:
- Type-safety entre schema e código TypeScript
- Migrations versionadas
- Bom suporte a relações complexas
- Banco gerenciado e compatível com Vercel (serverless)

## Decisão

Usar **Prisma 5** como ORM e **PostgreSQL** hospedado no **Neon** (banco serverless com pooling via `pgbouncer`).

A conexão usa duas URLs:
- `DATABASE_URL`: URL pooled (via pgbouncer) para queries em runtime
- `DIRECT_URL`: URL direta para migrations (Prisma Migrate não funciona com pooler)

## Alternativas consideradas

| Alternativa | Por que descartada |
|-------------|-------------------|
| **TypeORM** | Decorators são verbosos. Type-safety menos precisa que Prisma. Debugging de queries mais difícil. |
| **Drizzle ORM** | Excelente para edge/serverless, mas maduro apenas recentemente. Menos documentação e exemplos em 2024. |
| **Kysely** | Query builder sem migrations nativas. Exige mais boilerplate. |
| **Sequelize** | Legado, menos type-safe, sem suporte nativo a TypeScript moderno. |
| **Supabase** | Alternativa válida ao Neon, mas add-ons (Auth, Storage) não são necessários aqui. Neon tem melhor pricing para serverless. |
| **PlanetScale** | MySQL, não PostgreSQL. Sem suporte a FKs no modo padrão. |

## Consequências

**Vantagens:**
- Schema único (`schema.prisma`) é a fonte de verdade — tipos TypeScript são gerados automaticamente
- Prisma Studio facilita debugging do banco durante desenvolvimento
- Migrations automáticas e versionadas via `prisma migrate`
- Neon tem auto-pause (economia em ambientes não-produtivos)

**Desvantagens:**
- Prisma Client tem um cold start overhead em serverless (~100-200ms na primeira invocação)
- Queries complexas às vezes exigem `$queryRaw` (foge do type-safety)
- `DIRECT_URL` e `DATABASE_URL` separadas adicionam complexidade de configuração
