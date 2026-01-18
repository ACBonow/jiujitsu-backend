-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMIN', 'PROFESSOR', 'RECEPCIONISTA', 'ALUNO');

-- CreateEnum
CREATE TYPE "Faixa" AS ENUM ('BRANCA', 'CINZA', 'AMARELA', 'LARANJA', 'VERDE', 'AZUL', 'ROXA', 'MARROM', 'PRETA', 'CORAL_PRETA_VERMELHA', 'CORAL_BRANCA_VERMELHA', 'VERMELHA');

-- CreateEnum
CREATE TYPE "StatusAluno" AS ENUM ('ATIVO', 'INATIVO', 'INADIMPLENTE');

-- CreateEnum
CREATE TYPE "CategoriaIdade" AS ENUM ('PRE_MIRIM', 'MIRIM', 'INFANTIL', 'INFANTO_JUVENIL', 'JUVENIL', 'TEEN', 'ADULTO', 'MASTER_1', 'MASTER_2', 'MASTER_3', 'MASTER_4', 'MASTER_5', 'MASTER_6', 'MASTER_7');

-- CreateEnum
CREATE TYPE "CategoriaPeso" AS ENUM ('GALO', 'PLUMA', 'PENA', 'LEVE', 'MEDIO', 'MEIO_PESADO', 'PESADO', 'SUPER_PESADO', 'PESADISSIMO');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MASCULINO', 'FEMININO');

-- CreateEnum
CREATE TYPE "Modalidade" AS ENUM ('JIUJITSU', 'MUAY_THAI', 'JUDO', 'MMA', 'WRESTLING', 'BOXE', 'KICKBOXING', 'NO_GI');

-- CreateEnum
CREATE TYPE "CategoriaTurma" AS ENUM ('ADULTO_MASCULINO', 'ADULTO_FEMININO', 'ADULTO_MISTO', 'ADULTO_INICIANTE', 'KIDS', 'COMPETICAO', 'NOGI');

-- CreateEnum
CREATE TYPE "TipoAula" AS ENUM ('PADRAO', 'EXTRA', 'PARTICULAR');

-- CreateEnum
CREATE TYPE "StatusAula" AS ENUM ('AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO');

-- CreateEnum
CREATE TYPE "StatusReserva" AS ENUM ('CONFIRMADA', 'ESPERA', 'CANCELADA', 'EXPIRADA', 'FALTOU');

-- CreateEnum
CREATE TYPE "StatusMatricula" AS ENUM ('ATIVA', 'SUSPENSA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusMensalidade" AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'TRANSFERENCIA', 'BOLETO');

-- CreateTable
CREATE TABLE "academias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pessoas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "cpf" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "sexo" "Sexo",
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pessoas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "pessoaId" TEXT NOT NULL,
    "academiaId" TEXT,
    "refreshToken" TEXT,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" TEXT NOT NULL,
    "nomeResponsavel" TEXT,
    "telefoneResponsavel" TEXT,
    "faixa" "Faixa" NOT NULL DEFAULT 'BRANCA',
    "graus" INTEGER NOT NULL DEFAULT 0,
    "dataUltimaPromocao" TIMESTAMP(3),
    "dataMatricula" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aulasDesdePromocao" INTEGER NOT NULL DEFAULT 0,
    "peso" DOUBLE PRECISION,
    "categoriaIdade" "CategoriaIdade",
    "categoriaPeso" "CategoriaPeso",
    "status" "StatusAluno" NOT NULL DEFAULT 'ATIVO',
    "faltasReservas" INTEGER NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pessoaId" TEXT NOT NULL,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professores" (
    "id" TEXT NOT NULL,
    "modalidades" "Modalidade"[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pessoaId" TEXT NOT NULL,
    "alunoId" TEXT,

    CONSTRAINT "professores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professores_academias" (
    "professorId" TEXT NOT NULL,
    "academiaId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataVinculo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professores_academias_pkey" PRIMARY KEY ("professorId","academiaId")
);

-- CreateTable
CREATE TABLE "graduacoes" (
    "id" TEXT NOT NULL,
    "faixaAnterior" "Faixa" NOT NULL,
    "faixaNova" "Faixa" NOT NULL,
    "grausAnteriores" INTEGER NOT NULL,
    "grausNovos" INTEGER NOT NULL,
    "dataPromocao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,
    "alunoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "graduacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates_aula" (
    "id" TEXT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "horarioInicio" TEXT NOT NULL,
    "duracao" INTEGER NOT NULL DEFAULT 60,
    "categoria" "CategoriaTurma" NOT NULL,
    "modalidade" "Modalidade" NOT NULL DEFAULT 'JIUJITSU',
    "limiteAlunos" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "academiaId" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,

    CONSTRAINT "templates_aula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aulas" (
    "id" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "duracao" INTEGER NOT NULL DEFAULT 60,
    "categoria" "CategoriaTurma" NOT NULL,
    "modalidade" "Modalidade" NOT NULL DEFAULT 'JIUJITSU',
    "tipoAula" "TipoAula" NOT NULL DEFAULT 'PADRAO',
    "limiteAlunos" INTEGER,
    "status" "StatusAula" NOT NULL DEFAULT 'AGENDADA',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "academiaId" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "professorSubstitutoId" TEXT,

    CONSTRAINT "aulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presencas" (
    "id" TEXT NOT NULL,
    "dataRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aulaId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "registradoPorId" TEXT NOT NULL,

    CONSTRAINT "presencas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas" (
    "id" TEXT NOT NULL,
    "status" "StatusReserva" NOT NULL DEFAULT 'ESPERA',
    "posicaoFila" INTEGER,
    "dataReserva" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataConfirmacao" TIMESTAMP(3),
    "dataExpiracao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aulaId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "valorBase" DECIMAL(10,2) NOT NULL,
    "modalidades" "Modalidade"[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos_academias" (
    "planoId" TEXT NOT NULL,
    "academiaId" TEXT NOT NULL,
    "valorPersonalizado" DECIMAL(10,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "planos_academias_pkey" PRIMARY KEY ("planoId","academiaId")
);

-- CreateTable
CREATE TABLE "matriculas" (
    "id" TEXT NOT NULL,
    "valorFinal" DECIMAL(10,2) NOT NULL,
    "desconto" DECIMAL(10,2),
    "diaVencimento" INTEGER NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" TIMESTAMP(3),
    "status" "StatusMatricula" NOT NULL DEFAULT 'ATIVA',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "alunoId" TEXT NOT NULL,
    "academiaId" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,

    CONSTRAINT "matriculas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensalidades" (
    "id" TEXT NOT NULL,
    "mesReferencia" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "formaPagamento" "FormaPagamento",
    "status" "StatusMensalidade" NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "matriculaId" TEXT NOT NULL,

    CONSTRAINT "mensalidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tabela" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "dadosAntigos" JSONB,
    "dadosNovos" JSONB,
    "usuarioId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academias_cnpj_key" ON "academias"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "pessoas_email_key" ON "pessoas"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pessoas_cpf_key" ON "pessoas"("cpf");

-- CreateIndex
CREATE INDEX "pessoas_nome_idx" ON "pessoas"("nome");

-- CreateIndex
CREATE INDEX "pessoas_cpf_idx" ON "pessoas"("cpf");

-- CreateIndex
CREATE INDEX "pessoas_email_idx" ON "pessoas"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_pessoaId_key" ON "usuarios"("pessoaId");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_perfil_idx" ON "usuarios"("perfil");

-- CreateIndex
CREATE UNIQUE INDEX "alunos_pessoaId_key" ON "alunos"("pessoaId");

-- CreateIndex
CREATE INDEX "alunos_status_idx" ON "alunos"("status");

-- CreateIndex
CREATE INDEX "alunos_faixa_idx" ON "alunos"("faixa");

-- CreateIndex
CREATE INDEX "alunos_dataMatricula_idx" ON "alunos"("dataMatricula");

-- CreateIndex
CREATE UNIQUE INDEX "professores_pessoaId_key" ON "professores"("pessoaId");

-- CreateIndex
CREATE UNIQUE INDEX "professores_alunoId_key" ON "professores"("alunoId");

-- CreateIndex
CREATE INDEX "graduacoes_alunoId_idx" ON "graduacoes"("alunoId");

-- CreateIndex
CREATE INDEX "graduacoes_dataPromocao_idx" ON "graduacoes"("dataPromocao");

-- CreateIndex
CREATE INDEX "templates_aula_academiaId_diaSemana_idx" ON "templates_aula"("academiaId", "diaSemana");

-- CreateIndex
CREATE INDEX "templates_aula_professorId_idx" ON "templates_aula"("professorId");

-- CreateIndex
CREATE INDEX "aulas_academiaId_dataHora_idx" ON "aulas"("academiaId", "dataHora");

-- CreateIndex
CREATE INDEX "aulas_professorId_idx" ON "aulas"("professorId");

-- CreateIndex
CREATE INDEX "aulas_status_idx" ON "aulas"("status");

-- CreateIndex
CREATE INDEX "aulas_dataHora_idx" ON "aulas"("dataHora");

-- CreateIndex
CREATE INDEX "presencas_alunoId_idx" ON "presencas"("alunoId");

-- CreateIndex
CREATE INDEX "presencas_aulaId_idx" ON "presencas"("aulaId");

-- CreateIndex
CREATE INDEX "presencas_dataRegistro_idx" ON "presencas"("dataRegistro");

-- CreateIndex
CREATE UNIQUE INDEX "presencas_aulaId_alunoId_key" ON "presencas"("aulaId", "alunoId");

-- CreateIndex
CREATE INDEX "reservas_aulaId_status_idx" ON "reservas"("aulaId", "status");

-- CreateIndex
CREATE INDEX "reservas_alunoId_idx" ON "reservas"("alunoId");

-- CreateIndex
CREATE INDEX "reservas_status_idx" ON "reservas"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reservas_aulaId_alunoId_key" ON "reservas"("aulaId", "alunoId");

-- CreateIndex
CREATE INDEX "matriculas_alunoId_idx" ON "matriculas"("alunoId");

-- CreateIndex
CREATE INDEX "matriculas_academiaId_idx" ON "matriculas"("academiaId");

-- CreateIndex
CREATE INDEX "matriculas_status_idx" ON "matriculas"("status");

-- CreateIndex
CREATE INDEX "mensalidades_status_idx" ON "mensalidades"("status");

-- CreateIndex
CREATE INDEX "mensalidades_dataVencimento_idx" ON "mensalidades"("dataVencimento");

-- CreateIndex
CREATE INDEX "mensalidades_mesReferencia_idx" ON "mensalidades"("mesReferencia");

-- CreateIndex
CREATE UNIQUE INDEX "mensalidades_matriculaId_mesReferencia_key" ON "mensalidades"("matriculaId", "mesReferencia");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_chave_key" ON "configuracoes"("chave");

-- CreateIndex
CREATE INDEX "audit_logs_tabela_registroId_idx" ON "audit_logs"("tabela", "registroId");

-- CreateIndex
CREATE INDEX "audit_logs_usuarioId_idx" ON "audit_logs"("usuarioId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "pessoas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_academiaId_fkey" FOREIGN KEY ("academiaId") REFERENCES "academias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "pessoas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professores" ADD CONSTRAINT "professores_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "pessoas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professores" ADD CONSTRAINT "professores_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professores_academias" ADD CONSTRAINT "professores_academias_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professores_academias" ADD CONSTRAINT "professores_academias_academiaId_fkey" FOREIGN KEY ("academiaId") REFERENCES "academias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graduacoes" ADD CONSTRAINT "graduacoes_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates_aula" ADD CONSTRAINT "templates_aula_academiaId_fkey" FOREIGN KEY ("academiaId") REFERENCES "academias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates_aula" ADD CONSTRAINT "templates_aula_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aulas" ADD CONSTRAINT "aulas_academiaId_fkey" FOREIGN KEY ("academiaId") REFERENCES "academias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aulas" ADD CONSTRAINT "aulas_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aulas" ADD CONSTRAINT "aulas_professorSubstitutoId_fkey" FOREIGN KEY ("professorSubstitutoId") REFERENCES "professores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presencas" ADD CONSTRAINT "presencas_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "aulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presencas" ADD CONSTRAINT "presencas_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presencas" ADD CONSTRAINT "presencas_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "aulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_academias" ADD CONSTRAINT "planos_academias_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_academias" ADD CONSTRAINT "planos_academias_academiaId_fkey" FOREIGN KEY ("academiaId") REFERENCES "academias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_academiaId_fkey" FOREIGN KEY ("academiaId") REFERENCES "academias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensalidades" ADD CONSTRAINT "mensalidades_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "matriculas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
