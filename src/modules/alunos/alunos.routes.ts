import { Router } from 'express';
import { alunosController } from './alunos.controller';
import { validate, validateParams, validateQuery } from '../../shared/middlewares/validation.middleware';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware';
import {
  createAlunoSchema,
  updateAlunoSchema,
  alunoIdParamSchema,
  alunoQuerySchema,
} from './alunos.schemas';
import { z } from 'zod';
import { StatusAluno } from '@prisma/client';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/alunos - Listar alunos
router.get('/', validateQuery(alunoQuerySchema), alunosController.findAll);

// GET /api/alunos/:id - Buscar aluno por ID
router.get('/:id', validateParams(alunoIdParamSchema), alunosController.findById);

// GET /api/alunos/:id/presencas - Listar presenças do aluno
router.get('/:id/presencas', validateParams(alunoIdParamSchema), alunosController.getPresencas);

// GET /api/alunos/:id/graduacoes - Listar histórico de graduações do aluno
router.get('/:id/graduacoes', validateParams(alunoIdParamSchema), alunosController.getGraduacoes);

// POST /api/alunos - Criar aluno (ADMIN, RECEPCIONISTA)
router.post(
  '/',
  authorize('ADMIN', 'RECEPCIONISTA'),
  validate(createAlunoSchema),
  alunosController.create
);

// PUT /api/alunos/:id - Atualizar aluno (ADMIN, RECEPCIONISTA)
router.put(
  '/:id',
  authorize('ADMIN', 'RECEPCIONISTA'),
  validateParams(alunoIdParamSchema),
  validate(updateAlunoSchema),
  alunosController.update
);

// PATCH /api/alunos/:id/status - Atualizar status do aluno (ADMIN, RECEPCIONISTA)
router.patch(
  '/:id/status',
  authorize('ADMIN', 'RECEPCIONISTA'),
  validateParams(alunoIdParamSchema),
  validate(z.object({ status: z.nativeEnum(StatusAluno) })),
  alunosController.updateStatus
);

// DELETE /api/alunos/:id - Excluir aluno (apenas ADMIN)
router.delete(
  '/:id',
  authorize('ADMIN'),
  validateParams(alunoIdParamSchema),
  alunosController.delete
);

export default router;
