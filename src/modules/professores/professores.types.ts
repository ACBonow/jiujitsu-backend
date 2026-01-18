import { Modalidade, Sexo, Faixa } from '@prisma/client';

export interface ProfessorResponse {
  id: string;
  modalidades: Modalidade[];
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
  pessoa: {
    id: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    cpf: string | null;
    dataNascimento: Date | null;
    sexo: Sexo | null;
  };
  aluno?: {
    id: string;
    faixa: Faixa;
    graus: number;
  } | null;
}

export interface ProfessorWithAcademias extends ProfessorResponse {
  academias?: {
    academiaId: string;
    academia: {
      id: string;
      nome: string;
    };
    ativo: boolean;
    dataVinculo: Date;
  }[];
}

export interface ProfessorListResponse {
  id: string;
  modalidades: Modalidade[];
  ativo: boolean;
  pessoa: {
    nome: string;
    telefone: string | null;
  };
  aluno?: {
    faixa: Faixa;
    graus: number;
  } | null;
  _count?: {
    academias: number;
    aulasComoProfessor: number;
  };
}

export interface CreateProfessorData {
  // Dados da pessoa
  nome: string;
  email?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  dataNascimento?: Date | null;
  sexo?: Sexo | null;
  // Dados do professor
  modalidades: Modalidade[];
  // Vincular a aluno existente (opcional)
  alunoId?: string | null;
}

export interface UpdateProfessorData extends Partial<CreateProfessorData> {
  ativo?: boolean;
}
