import { Router } from 'express';
import { presencasController } from './presencas.controller';
import { validate, validateParams, validateQuery } from '../../shared/middlewares/validation.middleware';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware';
import {
  createPresencaSchema,
  registrarPresencasEmLoteSchema,
  presencaIdParamSchema,
  presencaQuerySchema,
} from './presencas.schemas';
import { z } from 'zod';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// GET /api/presencas - Listar presenças
router.get('/', validateQuery(presencaQuerySchema), presencasController.findAll);

// GET /api/presencas/aula/:aulaId - Listar presenças de uma aula
router.get(
  '/aula/:aulaId',
  validateParams(z.object({ aulaId: z.string().cuid() })),
  presencasController.findByAula
);

// GET /api/presencas/:id - Buscar presença por ID
router.get('/:id', validateParams(presencaIdParamSchema), presencasController.findById);

// POST /api/presencas - Registrar presença individual (ADMIN, PROFESSOR, RECEPCIONISTA)
router.post(
  '/',
  authorize('ADMIN', 'PROFESSOR', 'RECEPCIONISTA'),
  validate(createPresencaSchema),
  presencasController.create
);

// POST /api/presencas/lote - Registrar presenças em lote (ADMIN, PROFESSOR, RECEPCIONISTA)
router.post(
  '/lote',
  authorize('ADMIN', 'PROFESSOR', 'RECEPCIONISTA'),
  validate(registrarPresencasEmLoteSchema),
  presencasController.registrarEmLote
);

// DELETE /api/presencas/:id - Remover presença (ADMIN, PROFESSOR)
router.delete(
  '/:id',
  authorize('ADMIN', 'PROFESSOR'),
  validateParams(presencaIdParamSchema),
  presencasController.delete
);

export default router;
