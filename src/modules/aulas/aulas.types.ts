import {
  DiaSemana,
  CategoriaTurma,
  Modalidade,
  TipoAula,
  StatusAula,
} from '@prisma/client';

// Template de Aula (Grade semanal)
export interface TemplateAulaResponse {
  id: string;
  diaSemana: DiaSemana;
  horarioInicio: string;
  duracao: number;
  categoria: CategoriaTurma;
  modalidade: Modalidade;
  limiteAlunos: number | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
  academia: {
    id: string;
    nome: string;
  };
  professor: {
    id: string;
    pessoa: {
      nome: string;
    };
  };
}

// Aula (Instância)
export interface AulaResponse {
  id: string;
  dataHora: Date;
  duracao: number;
  categoria: CategoriaTurma;
  modalidade: Modalidade;
  tipoAula: TipoAula;
  limiteAlunos: number | null;
  status: StatusAula;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
  academia: {
    id: string;
    nome: string;
  };
  professor: {
    id: string;
    pessoa: {
      nome: string;
    };
  };
  professorSubstituto?: {
    id: string;
    pessoa: {
      nome: string;
    };
  } | null;
}

export interface AulaWithCounts extends AulaResponse {
  _count?: {
    presencas: number;
    reservas: number;
  };
}

export interface AulaListResponse {
  id: string;
  dataHora: Date;
  categoria: CategoriaTurma;
  modalidade: Modalidade;
  status: StatusAula;
  professor: {
    pessoa: {
      nome: string;
    };
  };
  _count?: {
    presencas: number;
    reservas: number;
  };
}

export interface CreateTemplateAulaData {
  academiaId: string;
  professorId: string;
  diaSemana: DiaSemana;
  horarioInicio: string;
  duracao?: number;
  categoria: CategoriaTurma;
  modalidade?: Modalidade;
  limiteAlunos?: number | null;
}

export interface CreateAulaData {
  academiaId: string;
  professorId: string;
  dataHora: Date;
  duracao?: number;
  categoria: CategoriaTurma;
  modalidade?: Modalidade;
  tipoAula?: TipoAula;
  limiteAlunos?: number | null;
  observacoes?: string | null;
}

export interface UpdateAulaData {
  professorId?: string;
  professorSubstitutoId?: string | null;
  dataHora?: Date;
  duracao?: number;
  categoria?: CategoriaTurma;
  modalidade?: Modalidade;
  tipoAula?: TipoAula;
  limiteAlunos?: number | null;
  status?: StatusAula;
  observacoes?: string | null;
}
