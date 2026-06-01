import { z } from 'zod';
import { Faixa, StatusAluno, CategoriaIdade, CategoriaPeso, Sexo } from '@prisma/client';
import { validarCPF } from '../../shared/utils/validators';

export const createAlunoSchema = z.object({
  // Dados da pessoa
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido').optional().nullable(),
  telefone: z.string().min(10, 'Telefone deve ter no mínimo 10 dígitos').optional().nullable(),
  cpf: z
    .string()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length === 11, 'CPF deve conter 11 dígitos')
    .refine(validarCPF, 'CPF inválido')
    .optional()
    .nullable(),
  dataNascimento: z.preprocess(
    (val) => {
      if (!val) return null;
      if (val instanceof Date) return val;
      if (typeof val === 'string') {
        // Ensure ISO-8601 DateTime format for Prisma
        const date = new Date(val);
        return isNaN(date.getTime()) ? null : date;
      }
      return null;
    },
    z.date().optional().nullable()
  ),
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
  // faixa e graus são definidos pelo sistema (sempre BRANCA/0 ao criar)
  // alterações de faixa: exclusivamente via POST /api/graduacoes
  peso: z.number().positive('Peso deve ser positivo').optional().nullable(),
  categoriaIdade: z.nativeEnum(CategoriaIdade).optional().nullable(),
  categoriaPeso: z.nativeEnum(CategoriaPeso).optional().nullable(),
  nomeResponsavel: z.string().optional().nullable(),
  telefoneResponsavel: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

// status removido — use PATCH /api/alunos/:id/status para alterar o status
export const updateAlunoSchema = createAlunoSchema.partial();

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
