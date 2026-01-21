import { Modalidade, Sexo, StatusCadastro } from '@prisma/client';

export interface CadastroPublicoInput {
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  dataNascimento: Date;
  sexo: Sexo;
  modalidades: Modalidade[];
  observacoes?: string;
}

export interface AprovarCadastroInput {
  papel: 'ALUNO' | 'PROFESSOR';
  academiaId?: string;
}

export interface RejeitarCadastroInput {
  motivo?: string;
}

export interface CadastroPendenteResponse {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string | null;
  dataNascimento: Date;
  sexo: Sexo;
  modalidades: Modalidade[];
  observacoes: string | null;
  status: StatusCadastro;
  createdAt: Date;
}
