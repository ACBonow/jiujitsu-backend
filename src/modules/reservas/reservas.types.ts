import { StatusReserva, CategoriaTurma, Modalidade } from '@prisma/client';

export interface ReservaResponse {
  id: string;
  status: StatusReserva;
  posicaoFila: number | null;
  dataReserva: Date;
  dataConfirmacao: Date | null;
  dataExpiracao: Date | null;
  createdAt: Date;
  updatedAt: Date;
  aula: {
    id: string;
    dataHora: Date;
    categoria: CategoriaTurma;
    modalidade: Modalidade;
    limiteAlunos: number | null;
    academia: {
      id: string;
      nome: string;
    };
    professor: {
      pessoa: {
        nome: string;
      };
    };
  };
  aluno: {
    id: string;
    pessoa: {
      nome: string;
    };
  };
}

export interface ReservaListResponse {
  id: string;
  status: StatusReserva;
  posicaoFila: number | null;
  dataReserva: Date;
  aluno: {
    id: string;
    pessoa: {
      nome: string;
    };
  };
}

export interface CreateReservaData {
  aulaId: string;
  alunoId: string;
}
