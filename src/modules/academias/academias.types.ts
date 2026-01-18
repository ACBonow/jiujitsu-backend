import { Academia } from '@prisma/client';

export interface AcademiaResponse {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcademiaWithStats extends AcademiaResponse {
  _count?: {
    usuarios?: number;
    aulas?: number;
    matriculas?: number;
  };
}

export type CreateAcademiaInput = Omit<Academia, 'id' | 'createdAt' | 'updatedAt' | 'ativo'>;
export type UpdateAcademiaInput = Partial<CreateAcademiaInput>;
