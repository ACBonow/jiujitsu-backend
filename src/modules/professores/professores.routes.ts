import { Router } from 'express';
import { professoresController } from './professores.controller';
import { validate, validateParams, validateQuery } from '@/shared/middlewares/validation.middleware';
import { authenticate, authorize } from '@/shared/middlewares/auth.middleware';
import {
  createProfessorSchema,
  updateProfessorSchema,
  professorIdParamSchema,
  professorQuerySchema,
  vinculoAcademiaSchema,
} from './professores.schemas';
import { z } from 'zod';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/professores - Listar professores
router.get('/', validateQuery(professorQuerySchema), professoresController.findAll);

// GET /api/professores/:id - Buscar professor por ID
router.get('/:id', validateParams(professorIdParamSchema), professoresController.findById);

// POST /api/professores - Criar professor (apenas ADMIN)
router.post(
  '/',
  authorize('ADMIN'),
  validate(createProfessorSchema),
  professoresController.create
);

// PUT /api/professores/:id - Atualizar professor (apenas ADMIN)
router.put(
  '/:id',
  authorize('ADMIN'),
  validateParams(professorIdParamSchema),
  validate(updateProfessorSchema),
  professoresController.update
);

// PATCH /api/professores/:id/toggle-status - Ativar/desativar professor (apenas ADMIN)
router.patch(
  '/:id/toggle-status',
  authorize('ADMIN'),
  validateParams(professorIdParamSchema),
  professoresController.toggleStatus
);

// POST /api/professores/:id/academias - Vincular professor a academia (apenas ADMIN)
router.post(
  '/:id/academias',
  authorize('ADMIN'),
  validateParams(professorIdParamSchema),
  validate(vinculoAcademiaSchema),
  professoresController.vincularAcademia
);

// DELETE /api/professores/:id/academias/:academiaId - Desvincular professor de academia (apenas ADMIN)
router.delete(
  '/:id/academias/:academiaId',
  authorize('ADMIN'),
  validateParams(
    z.object({
      id: z.string().cuid('ID do professor inválido'),
      academiaId: z.string().cuid('ID da academia inválido'),
    })
  ),
  professoresController.desvincularAcademia
);

// DELETE /api/professores/:id - Excluir professor (apenas ADMIN)
router.delete(
  '/:id',
  authorize('ADMIN'),
  validateParams(professorIdParamSchema),
  professoresController.delete
);

export default router;
