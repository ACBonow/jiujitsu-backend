import { z } from 'zod';

export const createAcademiaSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos numéricos')
    .optional()
    .nullable(),
  telefone: z.string().min(10, 'Telefone deve ter no mínimo 10 dígitos').optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable(),
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
});

export const updateAcademiaSchema = createAcademiaSchema.partial().extend({
  ativo: z.boolean().optional(),
});

export const academiaIdParamSchema = z.object({
  id: z.string().cuid('ID inválido'),
});

export type CreateAcademiaInput = z.infer<typeof createAcademiaSchema>;
export type UpdateAcademiaInput = z.infer<typeof updateAcademiaSchema>;
