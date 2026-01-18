import { CategoriaTurma, Modalidade } from '@prisma/client';

export interface PresencaResponse {
  id: string;
  dataRegistro: Date;
  aula: {
    id: string;
    dataHora: Date;
    categoria: CategoriaTurma;
    modalidade: Modalidade;
    academia: {
      id: string;
      nome: string;
    };
  };
  aluno: {
    id: string;
    pessoa: {
      nome: string;
    };
  };
  registradoPor: {
    id: string;
    pessoa: {
      nome: string;
    };
  };
}

export interface PresencaListResponse {
  id: string;
  dataRegistro: Date;
  aluno: {
    id: string;
    pessoa: {
      nome: string;
    };
  };
}

export interface CreatePresencaData {
  aulaId: string;
  alunoId: string;
}

export interface RegistrarPresencasEmLoteData {
  aulaId: string;
  alunoIds: string[];
}
