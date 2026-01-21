-- CreateEnum
CREATE TYPE "StatusCadastro" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateTable
CREATE TABLE "cadastros_pendentes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "sexo" "Sexo" NOT NULL,
    "modalidades" "Modalidade"[],
    "observacoes" TEXT,
    "status" "StatusCadastro" NOT NULL DEFAULT 'PENDENTE',
    "motivoRejeicao" TEXT,
    "aprovadoPorId" TEXT,
    "aprovadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cadastros_pendentes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cadastros_pendentes_email_key" ON "cadastros_pendentes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cadastros_pendentes_cpf_key" ON "cadastros_pendentes"("cpf");

-- CreateIndex
CREATE INDEX "cadastros_pendentes_status_idx" ON "cadastros_pendentes"("status");

-- CreateIndex
CREATE INDEX "cadastros_pendentes_email_idx" ON "cadastros_pendentes"("email");

-- CreateIndex
CREATE INDEX "cadastros_pendentes_cpf_idx" ON "cadastros_pendentes"("cpf");
