import { z } from 'zod';
import { Modalidade, StatusMatricula, StatusMensalidade, FormaPagamento } from '@prisma/client';

// Plano schemas
export const createPlanoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  descricao: z.string().optional().nullable(),
  valorBase: z.number().positive('Valor deve ser positivo'),
  modalidades: z.array(z.nativeEnum(Modalidade)).min(1, 'Selecione pelo menos uma modalidade'),
});

export const updatePlanoSchema = createPlanoSchema.partial().extend({
  ativo: z.boolean().optional(),
});

// Matrícula schemas
export const createMatriculaSchema = z.object({
  alunoId: z.string().cuid('ID do aluno inválido'),
  academiaId: z.string().cuid('ID da academia inválido'),
  planoId: z.string().cuid('ID do plano inválido'),
  valorFinal: z.number().positive('Valor deve ser positivo').optional(),
  desconto: z.number().min(0, 'Desconto não pode ser negativo').optional().nullable(),
  diaVencimento: z.number().int().min(1).max(31, 'Dia deve estar entre 1 e 31'),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export const updateMatriculaSchema = z.object({
  planoId: z.string().cuid().optional(),
  valorFinal: z.number().positive().optional(),
  desconto: z.number().min(0).optional().nullable(),
  diaVencimento: z.number().int().min(1).max(31).optional(),
  dataFim: z.coerce.date().optional().nullable(),
  status: z.nativeEnum(StatusMatricula).optional(),
  observacoes: z.string().optional().nullable(),
});

// Mensalidade schemas
export const registrarPagamentoSchema = z.object({
  dataPagamento: z.coerce.date().optional(),
  formaPagamento: z.nativeEnum(FormaPagamento),
  observacoes: z.string().optional().nullable(),
});

export const gerarMensalidadesSchema = z.object({
  academiaId: z.string().cuid('ID da academia inválido').optional(),
  mesReferencia: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Mês de referência deve estar no formato YYYY-MM'),
});

// ID params
export const idParamSchema = z.object({
  id: z.string().cuid('ID inválido'),
});

// Query schemas
export const planoQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  ativo: z.coerce.boolean().optional(),
  modalidade: z.nativeEnum(Modalidade).optional(),
});

export const matriculaQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  alunoId: z.string().cuid().optional(),
  academiaId: z.string().cuid().optional(),
  status: z.nativeEnum(StatusMatricula).optional(),
});

export const mensalidadeQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  matriculaId: z.string().cuid().optional(),
  alunoId: z.string().cuid().optional(),
  academiaId: z.string().cuid().optional(),
  status: z.nativeEnum(StatusMensalidade).optional(),
  mesReferencia: z.string().optional(),
});

export type CreatePlanoInput = z.infer<typeof createPlanoSchema>;
export type UpdatePlanoInput = z.infer<typeof updatePlanoSchema>;
export type CreateMatriculaInput = z.infer<typeof createMatriculaSchema>;
export type UpdateMatriculaInput = z.infer<typeof updateMatriculaSchema>;
export type RegistrarPagamentoInput = z.infer<typeof registrarPagamentoSchema>;
export type GerarMensalidadesInput = z.infer<typeof gerarMensalidadesSchema>;
export type PlanoQueryInput = z.infer<typeof planoQuerySchema>;
export type MatriculaQueryInput = z.infer<typeof matriculaQuerySchema>;
export type MensalidadeQueryInput = z.infer<typeof mensalidadeQuerySchema>;
