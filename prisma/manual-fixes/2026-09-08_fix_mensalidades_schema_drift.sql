-- ============================================================================
-- FIX: schema drift on `mensalidades` — root cause of QA finding #1 (CRÍTICA)
-- ============================================================================
--
-- Contexto: o commit d986b1b ("feat: implement payment rules configuration
-- and batch payment processing", 2026-08-31) renomeou a coluna `valor` para
-- `valorOriginal` e adicionou `valorPago`, `descontoAplicado` e
-- `pagamentoLoteId` ao model Mensalidade, além de duas tabelas novas
-- (RegraPagamentoAcademia, PagamentoLote). Este projeto não usa
-- `prisma migrate` (não há histórico de migrations) nem roda
-- `prisma db push`/`migrate deploy` no pipeline de deploy — o `vercel-build`
-- só roda `prisma generate`. Então essa mudança de schema nunca foi aplicada
-- no banco de produção (Neon).
--
-- Resultado: todo SELECT em `mensalidades` gerado pelo Prisma Client atual
-- referencia uma coluna `valorOriginal` que não existe na tabela real,
-- o Postgres retorna erro, e o error-handler genérico do backend
-- (src/shared/middlewares/error-handler.middleware.ts) mapeia isso para
-- HTTP 400 "DATABASE_ERROR" — que o frontend, por sua vez, interpreta como
-- "lista vazia" (ver finding #1 e #10 do relatório de QA).
--
-- Este script faz a migração de forma segura (RENAME, não DROP+ADD) para
-- preservar os valores já gravados em produção. NÃO gere isso via
-- `prisma migrate diff` — o diff automático do Prisma não enxerga o rename
-- e produziria `DROP COLUMN "valor"` + `ADD COLUMN "valorOriginal" NOT NULL`,
-- o que apagaria os valores existentes (e provavelmente falharia de cara,
-- já que a coluna nova seria NOT NULL sem default em uma tabela com linhas).
--
-- COMO RODAR (uma única vez, contra o banco de produção):
--   psql "$DATABASE_URL" -f prisma/manual-fixes/2026-09-08_fix_mensalidades_schema_drift.sql
-- ou cole o conteúdo no SQL editor do console da Neon.
--
-- O script inteiro roda em uma transação — se algo falhar no meio, nada é
-- aplicado.
-- ============================================================================

BEGIN;

-- 1. Renomear a coluna existente (preserva os dados já gravados)
ALTER TABLE "mensalidades" RENAME COLUMN "valor" TO "valorOriginal";

-- 2. Novas colunas do model Mensalidade
ALTER TABLE "mensalidades" ADD COLUMN IF NOT EXISTS "valorPago" DECIMAL(10,2);
ALTER TABLE "mensalidades" ADD COLUMN IF NOT EXISTS "descontoAplicado" DECIMAL(10,2);
ALTER TABLE "mensalidades" ADD COLUMN IF NOT EXISTS "pagamentoLoteId" TEXT;

-- 3. Nova tabela: RegraPagamentoAcademia
CREATE TABLE IF NOT EXISTS "regras_pagamento_academia" (
    "id" TEXT NOT NULL,
    "descontoAntecipadoPercentual" DECIMAL(5,2),
    "diaLimiteAntecipado" INTEGER,
    "descontoPagamentoImediatoPercentual" DECIMAL(5,2),
    "formasPagamentoComDesconto" "FormaPagamento"[] NOT NULL DEFAULT ARRAY['DINHEIRO', 'PIX']::"FormaPagamento"[],
    "descontosAcumulativos" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "academiaId" TEXT NOT NULL,

    CONSTRAINT "regras_pagamento_academia_pkey" PRIMARY KEY ("id")
);

-- 4. Nova tabela: PagamentoLote
CREATE TABLE IF NOT EXISTS "pagamentos_lote" (
    "id" TEXT NOT NULL,
    "formaPagamento" "FormaPagamento" NOT NULL,
    "dataPagamento" TIMESTAMP(3) NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "descontoTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "academiaId" TEXT NOT NULL,
    "registradoPorId" TEXT,

    CONSTRAINT "pagamentos_lote_pkey" PRIMARY KEY ("id")
);

-- 5. Índices
CREATE UNIQUE INDEX IF NOT EXISTS "regras_pagamento_academia_academiaId_key" ON "regras_pagamento_academia"("academiaId");
CREATE INDEX IF NOT EXISTS "pagamentos_lote_academiaId_idx" ON "pagamentos_lote"("academiaId");
CREATE INDEX IF NOT EXISTS "mensalidades_pagamentoLoteId_idx" ON "mensalidades"("pagamentoLoteId");

-- 6. Foreign keys (com checagem de existência, para o script ser reexecutável)
DO $$ BEGIN
  ALTER TABLE "mensalidades" ADD CONSTRAINT "mensalidades_pagamentoLoteId_fkey"
    FOREIGN KEY ("pagamentoLoteId") REFERENCES "pagamentos_lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "regras_pagamento_academia" ADD CONSTRAINT "regras_pagamento_academia_academiaId_fkey"
    FOREIGN KEY ("academiaId") REFERENCES "academias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pagamentos_lote" ADD CONSTRAINT "pagamentos_lote_academiaId_fkey"
    FOREIGN KEY ("academiaId") REFERENCES "academias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pagamentos_lote" ADD CONSTRAINT "pagamentos_lote_registradoPorId_fkey"
    FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
