import { Router } from 'express';
import { academiasController } from './academias.controller';
import { validate, validateParams } from '../../shared/middlewares/validation.middleware';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware';
import {
  createAcademiaSchema,
  updateAcademiaSchema,
  academiaIdParamSchema,
} from './academias.schemas';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/academias - Listar academias
router.get('/', academiasController.findAll);

// GET /api/academias/:id - Buscar academia por ID
router.get(
  '/:id',
  validateParams(academiaIdParamSchema),
  academiasController.findById
);

// POST /api/academias - Criar academia (apenas ADMIN)
router.post(
  '/',
  authorize('ADMIN'),
  validate(createAcademiaSchema),
  academiasController.create
);

// PUT /api/academias/:id - Atualizar academia (apenas ADMIN)
router.put(
  '/:id',
  authorize('ADMIN'),
  validateParams(academiaIdParamSchema),
  validate(updateAcademiaSchema),
  academiasController.update
);

// PATCH /api/academias/:id/toggle-status - Ativar/desativar academia (apenas ADMIN)
router.patch(
  '/:id/toggle-status',
  authorize('ADMIN'),
  validateParams(academiaIdParamSchema),
  academiasController.toggleStatus
);

// DELETE /api/academias/:id - Excluir academia (apenas ADMIN)
router.delete(
  '/:id',
  authorize('ADMIN'),
  validateParams(academiaIdParamSchema),
  academiasController.delete
);

export default router;
