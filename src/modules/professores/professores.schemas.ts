import { z } from 'zod';
import { Modalidade, Sexo } from '@prisma/client';

export const createProfessorSchema = z.object({
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
  // Dados do professor
  modalidades: z.array(z.nativeEnum(Modalidade)).min(1, 'Selecione pelo menos uma modalidade'),
  // Vincular a aluno existente (opcional)
  alunoId: z.string().cuid().optional().nullable(),
});

export const updateProfessorSchema = createProfessorSchema.partial().extend({
  ativo: z.boolean().optional(),
});

export const professorIdParamSchema = z.object({
  id: z.string().cuid('ID inválido'),
});

export const professorQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  ativo: z.coerce.boolean().optional(),
  modalidade: z.nativeEnum(Modalidade).optional(),
  academiaId: z.string().cuid().optional(),
  search: z.string().optional(),
});

export const vinculoAcademiaSchema = z.object({
  academiaId: z.string().cuid('ID da academia inválido'),
});

export type CreateProfessorInput = z.infer<typeof createProfessorSchema>;
export type UpdateProfessorInput = z.infer<typeof updateProfessorSchema>;
export type ProfessorQueryInput = z.infer<typeof professorQuerySchema>;
