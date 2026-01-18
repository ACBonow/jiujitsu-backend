import { Router } from 'express';
import { planosController, matriculasController, mensalidadesController } from './financeiro.controller';
import { validate, validateParams, validateQuery } from '@/shared/middlewares/validation.middleware';
import { authenticate, authorize } from '@/shared/middlewares/auth.middleware';
import {
  createPlanoSchema,
  updatePlanoSchema,
  createMatriculaSchema,
  updateMatriculaSchema,
  registrarPagamentoSchema,
  gerarMensalidadesSchema,
  idParamSchema,
  planoQuerySchema,
  matriculaQuerySchema,
  mensalidadeQuerySchema,
} from './financeiro.schemas';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// ==================== PLANOS ====================

// GET /api/financeiro/planos - Listar planos
router.get('/planos', validateQuery(planoQuerySchema), planosController.findAll);

// GET /api/financeiro/planos/:id - Buscar plano por ID
router.get('/planos/:id', validateParams(idParamSchema), planosController.findById);

// POST /api/financeiro/planos - Criar plano (ADMIN)
router.post(
  '/planos',
  authorize('ADMIN'),
  validate(createPlanoSchema),
  planosController.create
);

// PUT /api/financeiro/planos/:id - Atualizar plano (ADMIN)
router.put(
  '/planos/:id',
  authorize('ADMIN'),
  validateParams(idParamSchema),
  validate(updatePlanoSchema),
  planosController.update
);

// DELETE /api/financeiro/planos/:id - Excluir plano (ADMIN)
router.delete(
  '/planos/:id',
  authorize('ADMIN'),
  validateParams(idParamSchema),
  planosController.delete
);

// ==================== MATRÍCULAS ====================

// GET /api/financeiro/matriculas - Listar matrículas
router.get('/matriculas', validateQuery(matriculaQuerySchema), matriculasController.findAll);

// GET /api/financeiro/matriculas/:id - Buscar matrícula por ID
router.get('/matriculas/:id', validateParams(idParamSchema), matriculasController.findById);

// POST /api/financeiro/matriculas - Criar matrícula (ADMIN, RECEPCIONISTA)
router.post(
  '/matriculas',
  authorize('ADMIN', 'RECEPCIONISTA'),
  validate(createMatriculaSchema),
  matriculasController.create
);

// PUT /api/financeiro/matriculas/:id - Atualizar matrícula (ADMIN, RECEPCIONISTA)
router.put(
  '/matriculas/:id',
  authorize('ADMIN', 'RECEPCIONISTA'),
  validateParams(idParamSchema),
  validate(updateMatriculaSchema),
  matriculasController.update
);

// PATCH /api/financeiro/matriculas/:id/cancelar - Cancelar matrícula (ADMIN)
router.patch(
  '/matriculas/:id/cancelar',
  authorize('ADMIN'),
  validateParams(idParamSchema),
  matriculasController.cancelar
);

// ==================== MENSALIDADES ====================

// GET /api/financeiro/mensalidades - Listar mensalidades
router.get('/mensalidades', validateQuery(mensalidadeQuerySchema), mensalidadesController.findAll);

// GET /api/financeiro/mensalidades/:id - Buscar mensalidade por ID
router.get('/mensalidades/:id', validateParams(idParamSchema), mensalidadesController.findById);

// POST /api/financeiro/mensalidades/gerar - Gerar mensalidades do mês (ADMIN)
router.post(
  '/mensalidades/gerar',
  authorize('ADMIN'),
  validate(gerarMensalidadesSchema),
  mensalidadesController.gerarMensalidades
);

// PATCH /api/financeiro/mensalidades/:id/pagar - Registrar pagamento (ADMIN, RECEPCIONISTA)
router.patch(
  '/mensalidades/:id/pagar',
  authorize('ADMIN', 'RECEPCIONISTA'),
  validateParams(idParamSchema),
  validate(registrarPagamentoSchema),
  mensalidadesController.registrarPagamento
);

export default router;
