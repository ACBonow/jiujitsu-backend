import { Router } from 'express';
import { graduacoesController } from './graduacoes.controller';
import { validate, validateParams, validateQuery } from '../../shared/middlewares/validation.middleware';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware';
import {
  createGraduacaoSchema,
  graduacaoIdParamSchema,
  graduacaoQuerySchema,
} from './graduacoes.schemas';
import { z } from 'zod';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/graduacoes - Listar graduações
router.get('/', validateQuery(graduacaoQuerySchema), graduacoesController.findAll);

// GET /api/graduacoes/aluno/:alunoId - Listar graduações de um aluno
router.get(
  '/aluno/:alunoId',
  validateParams(z.object({ alunoId: z.string().cuid() })),
  graduacoesController.findByAluno
);

// GET /api/graduacoes/:id - Buscar graduação por ID
router.get('/:id', validateParams(graduacaoIdParamSchema), graduacoesController.findById);

// POST /api/graduacoes - Registrar promoção (ADMIN, PROFESSOR)
router.post(
  '/',
  authorize('ADMIN', 'PROFESSOR'),
  validate(createGraduacaoSchema),
  graduacoesController.create
);

// DELETE /api/graduacoes/:id - Remover graduação (apenas ADMIN)
router.delete(
  '/:id',
  authorize('ADMIN'),
  validateParams(graduacaoIdParamSchema),
  graduacoesController.delete
);

export default router;
