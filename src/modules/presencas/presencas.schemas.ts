import { z } from 'zod';

export const createPresencaSchema = z.object({
  aulaId: z.string().cuid('ID da aula inválido'),
  alunoId: z.string().cuid('ID do aluno inválido'),
});

export const registrarPresencasEmLoteSchema = z.object({
  aulaId: z.string().cuid('ID da aula inválido'),
  alunoIds: z.array(z.string().cuid('ID do aluno inválido')).min(1, 'Selecione pelo menos um aluno'),
});

export const presencaIdParamSchema = z.object({
  id: z.string().cuid('ID inválido'),
});

export const presencaQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  aulaId: z.string().cuid().optional(),
  alunoId: z.string().cuid().optional(),
  academiaId: z.string().cuid().optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
});

export type CreatePresencaInput = z.infer<typeof createPresencaSchema>;
export type RegistrarPresencasEmLoteInput = z.infer<typeof registrarPresencasEmLoteSchema>;
export type PresencaQueryInput = z.infer<typeof presencaQuerySchema>;
