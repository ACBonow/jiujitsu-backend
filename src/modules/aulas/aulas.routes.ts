import { Router } from 'express';
import { aulasController } from './aulas.controller';
import { validate, validateParams, validateQuery } from '@/shared/middlewares/validation.middleware';
import { authenticate, authorize } from '@/shared/middlewares/auth.middleware';
import {
  createTemplateAulaSchema,
  updateTemplateAulaSchema,
  createAulaSchema,
  updateAulaSchema,
  aulaIdParamSchema,
  aulaQuerySchema,
  templateAulaQuerySchema,
  gerarAulasSchema,
} from './aulas.schemas';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// ==================== TEMPLATE DE AULA ====================

// GET /api/aulas/templates - Listar templates de aula
router.get('/templates', validateQuery(templateAulaQuerySchema), aulasController.findAllTemplates);

// GET /api/aulas/templates/:id - Buscar template por ID
router.get('/templates/:id', validateParams(aulaIdParamSchema), aulasController.findTemplateById);

// POST /api/aulas/templates - Criar template (ADMIN, PROFESSOR)
router.post(
  '/templates',
  authorize('ADMIN', 'PROFESSOR'),
  validate(createTemplateAulaSchema),
  aulasController.createTemplate
);

// PUT /api/aulas/templates/:id - Atualizar template (ADMIN, PROFESSOR)
router.put(
  '/templates/:id',
  authorize('ADMIN', 'PROFESSOR'),
  validateParams(aulaIdParamSchema),
  validate(updateTemplateAulaSchema),
  aulasController.updateTemplate
);

// DELETE /api/aulas/templates/:id - Excluir template (ADMIN)
router.delete(
  '/templates/:id',
  authorize('ADMIN'),
  validateParams(aulaIdParamSchema),
  aulasController.deleteTemplate
);

// ==================== AULA ====================

// GET /api/aulas - Listar aulas
router.get('/', validateQuery(aulaQuerySchema), aulasController.findAllAulas);

// POST /api/aulas/gerar - Gerar aulas a partir dos templates (ADMIN)
router.post(
  '/gerar',
  authorize('ADMIN'),
  validate(gerarAulasSchema),
  aulasController.gerarAulas
);

// GET /api/aulas/:id - Buscar aula por ID
router.get('/:id', validateParams(aulaIdParamSchema), aulasController.findAulaById);

// POST /api/aulas - Criar aula avulsa (ADMIN, PROFESSOR)
router.post(
  '/',
  authorize('ADMIN', 'PROFESSOR'),
  validate(createAulaSchema),
  aulasController.createAula
);

// PUT /api/aulas/:id - Atualizar aula (ADMIN, PROFESSOR)
router.put(
  '/:id',
  authorize('ADMIN', 'PROFESSOR'),
  validateParams(aulaIdParamSchema),
  validate(updateAulaSchema),
  aulasController.updateAula
);

// PATCH /api/aulas/:id/iniciar - Iniciar aula (ADMIN, PROFESSOR, RECEPCIONISTA)
router.patch(
  '/:id/iniciar',
  authorize('ADMIN', 'PROFESSOR', 'RECEPCIONISTA'),
  validateParams(aulaIdParamSchema),
  aulasController.iniciarAula
);

// PATCH /api/aulas/:id/concluir - Concluir aula (ADMIN, PROFESSOR, RECEPCIONISTA)
router.patch(
  '/:id/concluir',
  authorize('ADMIN', 'PROFESSOR', 'RECEPCIONISTA'),
  validateParams(aulaIdParamSchema),
  aulasController.concluirAula
);

// PATCH /api/aulas/:id/cancelar - Cancelar aula (ADMIN, PROFESSOR)
router.patch(
  '/:id/cancelar',
  authorize('ADMIN', 'PROFESSOR'),
  validateParams(aulaIdParamSchema),
  aulasController.cancelarAula
);

// DELETE /api/aulas/:id - Excluir aula (ADMIN)
router.delete(
  '/:id',
  authorize('ADMIN'),
  validateParams(aulaIdParamSchema),
  aulasController.deleteAula
);

export default router;
