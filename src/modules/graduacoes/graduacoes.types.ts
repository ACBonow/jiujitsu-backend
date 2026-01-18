import { Faixa } from '@prisma/client';

export interface GraduacaoResponse {
  id: string;
  faixaAnterior: Faixa;
  faixaNova: Faixa;
  grausAnteriores: number;
  grausNovos: number;
  dataPromocao: Date;
  observacao: string | null;
  createdAt: Date;
  aluno: {
    id: string;
    pessoa: {
      nome: string;
    };
  };
}

export interface GraduacaoListResponse {
  id: string;
  faixaAnterior: Faixa;
  faixaNova: Faixa;
  grausAnteriores: number;
  grausNovos: number;
  dataPromocao: Date;
}

export interface CreateGraduacaoData {
  alunoId: string;
  faixaNova: Faixa;
  grausNovos: number;
  dataPromocao?: Date;
  observacao?: string | null;
}
