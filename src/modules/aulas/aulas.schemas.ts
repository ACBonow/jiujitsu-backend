import { z } from 'zod';
import {
  DiaSemana,
  CategoriaTurma,
  Modalidade,
  TipoAula,
  StatusAula,
} from '@prisma/client';

// Template de Aula schemas
export const createTemplateAulaSchema = z.object({
  academiaId: z.string().cuid('ID da academia inválido'),
  professorId: z.string().cuid('ID do professor inválido'),
  diaSemana: z.nativeEnum(DiaSemana),
  horarioInicio: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve estar no formato HH:MM'),
  duracao: z.number().int().positive().default(60),
  categoria: z.nativeEnum(CategoriaTurma),
  modalidade: z.nativeEnum(Modalidade).default('JIUJITSU'),
  limiteAlunos: z.number().int().positive().optional().nullable(),
});

export const updateTemplateAulaSchema = createTemplateAulaSchema.partial().extend({
  ativo: z.boolean().optional(),
});

// Aula schemas
export const createAulaSchema = z.object({
  academiaId: z.string().cuid('ID da academia inválido'),
  professorId: z.string().cuid('ID do professor inválido'),
  dataHora: z.coerce.date(),
  duracao: z.number().int().positive().default(60),
  categoria: z.nativeEnum(CategoriaTurma),
  modalidade: z.nativeEnum(Modalidade).default('JIUJITSU'),
  tipoAula: z.nativeEnum(TipoAula).default('PADRAO'),
  limiteAlunos: z.number().int().positive().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export const updateAulaSchema = z.object({
  professorId: z.string().cuid().optional(),
  professorSubstitutoId: z.string().cuid().optional().nullable(),
  dataHora: z.coerce.date().optional(),
  duracao: z.number().int().positive().optional(),
  categoria: z.nativeEnum(CategoriaTurma).optional(),
  modalidade: z.nativeEnum(Modalidade).optional(),
  tipoAula: z.nativeEnum(TipoAula).optional(),
  limiteAlunos: z.number().int().positive().optional().nullable(),
  status: z.nativeEnum(StatusAula).optional(),
  observacoes: z.string().optional().nullable(),
});

export const aulaIdParamSchema = z.object({
  id: z.string().cuid('ID inválido'),
});

export const aulaQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  academiaId: z.string().cuid().optional(),
  professorId: z.string().cuid().optional(),
  categoria: z.nativeEnum(CategoriaTurma).optional(),
  modalidade: z.nativeEnum(Modalidade).optional(),
  status: z.nativeEnum(StatusAula).optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
});

export const templateAulaQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  academiaId: z.string().cuid().optional(),
  professorId: z.string().cuid().optional(),
  diaSemana: z.nativeEnum(DiaSemana).optional(),
  categoria: z.nativeEnum(CategoriaTurma).optional(),
  ativo: z.coerce.boolean().optional(),
});

export const gerarAulasSchema = z.object({
  academiaId: z.string().cuid('ID da academia inválido'),
  dataInicio: z.coerce.date(),
  dataFim: z.coerce.date(),
});

export type CreateTemplateAulaInput = z.infer<typeof createTemplateAulaSchema>;
export type UpdateTemplateAulaInput = z.infer<typeof updateTemplateAulaSchema>;
export type CreateAulaInput = z.infer<typeof createAulaSchema>;
export type UpdateAulaInput = z.infer<typeof updateAulaSchema>;
export type AulaQueryInput = z.infer<typeof aulaQuerySchema>;
export type TemplateAulaQueryInput = z.infer<typeof templateAulaQuerySchema>;
export type GerarAulasInput = z.infer<typeof gerarAulasSchema>;
