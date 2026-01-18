import { z } from 'zod';
import { Faixa, StatusAluno, CategoriaIdade, CategoriaPeso, Sexo } from '@prisma/client';

export const createAlunoSchema = z.object({
  // Dados da pessoa
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido').optional().nullable(),
  telefone: z.string().min(10, 'Telefone deve ter no mínimo 10 dígitos').optional().nullable(),
  cpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF deve conter 11 dígitos numéricos')
    .optional()
    .nullable(),
  dataNascimento: z.coerce.date().optional().nullable(),
  sexo: z.nativeEnum(Sexo).optional().nullable(),
  logradouro: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().length(2, 'Estado deve ter 2 caracteres (UF)').optional().nullable(),
  cep: z
    .string()
    .regex(/^\d{8}$/, 'CEP deve conter 8 dígitos numéricos')
    .optional()
    .nullable(),
  // Dados do aluno
  faixa: z.nativeEnum(Faixa).default('BRANCA'),
  graus: z.number().int().min(0).max(6).default(0),
  peso: z.number().positive('Peso deve ser positivo').optional().nullable(),
  categoriaIdade: z.nativeEnum(CategoriaIdade).optional().nullable(),
  categoriaPeso: z.nativeEnum(CategoriaPeso).optional().nullable(),
  nomeResponsavel: z.string().optional().nullable(),
  telefoneResponsavel: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export const updateAlunoSchema = createAlunoSchema.partial().extend({
  status: z.nativeEnum(StatusAluno).optional(),
});

export const alunoIdParamSchema = z.object({
  id: z.string().cuid('ID inválido'),
});

export const alunoQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(StatusAluno).optional(),
  faixa: z.nativeEnum(Faixa).optional(),
  academiaId: z.string().cuid().optional(),
  search: z.string().optional(),
});

export type CreateAlunoInput = z.infer<typeof createAlunoSchema>;
export type UpdateAlunoInput = z.infer<typeof updateAlunoSchema>;
export type AlunoQueryInput = z.infer<typeof alunoQuerySchema>;
