import { Faixa, StatusAluno, CategoriaIdade, CategoriaPeso, Sexo } from '@prisma/client';

export interface AlunoResponse {
  id: string;
  faixa: Faixa;
  graus: number;
  status: StatusAluno;
  dataMatricula: Date;
  dataUltimaPromocao: Date | null;
  aulasDesdePromocao: number;
  peso: number | null;
  categoriaIdade: CategoriaIdade | null;
  categoriaPeso: CategoriaPeso | null;
  nomeResponsavel: string | null;
  telefoneResponsavel: string | null;
  faltasReservas: number;
  observacoes: string | null;
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
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
  };
}

export interface AlunoWithMatriculas extends AlunoResponse {
  matriculas?: {
    id: string;
    status: string;
    valorFinal: number;
    plano: {
      nome: string;
    };
    academia: {
      id: string;
      nome: string;
    };
  }[];
}

export interface AlunoListResponse {
  id: string;
  faixa: Faixa;
  graus: number;
  status: StatusAluno;
  pessoa: {
    nome: string;
    telefone: string | null;
  };
  _count?: {
    presencas: number;
    matriculas: number;
  };
}

export interface CreateAlunoData {
  // Dados da pessoa
  nome: string;
  email?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  dataNascimento?: Date | null;
  sexo?: Sexo | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  // Dados do aluno
  faixa?: Faixa;
  graus?: number;
  peso?: number | null;
  categoriaIdade?: CategoriaIdade | null;
  categoriaPeso?: CategoriaPeso | null;
  nomeResponsavel?: string | null;
  telefoneResponsavel?: string | null;
  observacoes?: string | null;
}

export interface UpdateAlunoData extends Partial<CreateAlunoData> {
  status?: StatusAluno;
}
