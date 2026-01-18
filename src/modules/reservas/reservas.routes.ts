import { Router } from 'express';
import { reservasController } from './reservas.controller';
import { validate, validateParams, validateQuery } from '../../shared/middlewares/validation.middleware';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware';
import {
  createReservaSchema,
  reservaIdParamSchema,
  reservaQuerySchema,
} from './reservas.schemas';
import { z } from 'zod';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/reservas - Listar reservas
router.get('/', validateQuery(reservaQuerySchema), reservasController.findAll);

// GET /api/reservas/aula/:aulaId - Listar reservas de uma aula
router.get(
  '/aula/:aulaId',
  validateParams(z.object({ aulaId: z.string().cuid() })),
  reservasController.findByAula
);

// GET /api/reservas/:id - Buscar reserva por ID
router.get('/:id', validateParams(reservaIdParamSchema), reservasController.findById);

// POST /api/reservas - Criar reserva (qualquer usuário autenticado pode criar para um aluno)
router.post(
  '/',
  validate(createReservaSchema),
  reservasController.create
);

// PATCH /api/reservas/:id/cancelar - Cancelar reserva
router.patch(
  '/:id/cancelar',
  validateParams(reservaIdParamSchema),
  reservasController.cancelar
);

// PATCH /api/reservas/:id/confirmar - Confirmar reserva em espera (ADMIN, PROFESSOR, RECEPCIONISTA)
router.patch(
  '/:id/confirmar',
  authorize('ADMIN', 'PROFESSOR', 'RECEPCIONISTA'),
  validateParams(reservaIdParamSchema),
  reservasController.confirmar
);

// DELETE /api/reservas/:id - Excluir reserva (ADMIN)
router.delete(
  '/:id',
  authorize('ADMIN'),
  validateParams(reservaIdParamSchema),
  reservasController.delete
);

export default router;
