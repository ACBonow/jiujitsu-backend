import { z } from 'zod';
import { StatusReserva } from '@prisma/client';

export const createReservaSchema = z.object({
  aulaId: z.string().cuid('ID da aula inválido'),
  alunoId: z.string().cuid('ID do aluno inválido'),
});

export const reservaIdParamSchema = z.object({
  id: z.string().cuid('ID inválido'),
});

export const reservaQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  aulaId: z.string().cuid().optional(),
  alunoId: z.string().cuid().optional(),
  status: z.nativeEnum(StatusReserva).optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
});

export type CreateReservaInput = z.infer<typeof createReservaSchema>;
export type ReservaQueryInput = z.infer<typeof reservaQuerySchema>;
