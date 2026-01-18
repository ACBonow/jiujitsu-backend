import { z } from 'zod';
import { Faixa } from '@prisma/client';

export const createGraduacaoSchema = z.object({
  alunoId: z.string().cuid('ID do aluno inválido'),
  faixaNova: z.nativeEnum(Faixa),
  grausNovos: z.number().int().min(0).max(6),
  dataPromocao: z.coerce.date().optional(),
  observacao: z.string().optional().nullable(),
});

export const graduacaoIdParamSchema = z.object({
  id: z.string().cuid('ID inválido'),
});

export const graduacaoQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  alunoId: z.string().cuid().optional(),
  faixa: z.nativeEnum(Faixa).optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
});

export type CreateGraduacaoInput = z.infer<typeof createGraduacaoSchema>;
export type GraduacaoQueryInput = z.infer<typeof graduacaoQuerySchema>;
