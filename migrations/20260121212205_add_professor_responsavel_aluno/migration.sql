-- AlterTable
ALTER TABLE "alunos" ADD COLUMN     "professorResponsavelId" TEXT;

-- CreateIndex
CREATE INDEX "alunos_professorResponsavelId_idx" ON "alunos"("professorResponsavelId");

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_professorResponsavelId_fkey" FOREIGN KEY ("professorResponsavelId") REFERENCES "professores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
