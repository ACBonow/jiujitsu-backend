import { Router } from 'express';
import { cadastroPublicoController } from './cadastro-publico.controller';
import { validate } from '../../shared/middlewares/validation.middleware';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware';
import {
  cadastroPublicoSchema,
  aprovarCadastroSchema,
  rejeitarCadastroSchema,
} from './cadastro-publico.schemas';

const router = Router();

// Perfis que podem gerenciar cadastros
const PERFIS_GESTAO_CADASTROS = ['ADMIN', 'PROFESSOR', 'RECEPCIONISTA'] as const;

// ============================================================================
// ROTAS PÚBLICAS (sem autenticação)
// ============================================================================

/**
 * POST /api/public/cadastro
 * Criar pré-cadastro público
 */
router.post(
  '/public/cadastro',
  validate(cadastroPublicoSchema),
  cadastroPublicoController.criar.bind(cadastroPublicoController)
);

/**
 * GET /api/public/cadastro/status?email=xxx
 * Verificar status do cadastro por email
 */
router.get(
  '/public/cadastro/status',
  cadastroPublicoController.verificarStatus.bind(cadastroPublicoController)
);

// ============================================================================
// ROTAS ADMINISTRATIVAS (com autenticação)
// Acesso: ADMIN, PROFESSOR, RECEPCIONISTA
// ============================================================================

/**
 * GET /api/admin/cadastros-pendentes
 * Listar apenas cadastros pendentes
 */
router.get(
  '/admin/cadastros-pendentes',
  authenticate,
  authorize('ADMIN', 'PROFESSOR', 'RECEPCIONISTA'),
  cadastroPublicoController.listarPendentes.bind(cadastroPublicoController)
);

/**
 * GET /api/admin/cadastros
 * Listar todos os cadastros (com filtro opcional ?status=PENDENTE|APROVADO|REJEITADO)
 */
router.get(
  '/admin/cadastros',
  authenticate,
  authorize('ADMIN', 'PROFESSOR', 'RECEPCIONISTA'),
  cadastroPublicoController.listarTodos.bind(cadastroPublicoController)
);

/**
 * GET /api/admin/cadastros/:id
 * Buscar cadastro por ID
 */
router.get(
  '/admin/cadastros/:id',
  authenticate,
  authorize('ADMIN', 'PROFESSOR', 'RECEPCIONISTA'),
  cadastroPublicoController.buscarPorId.bind(cadastroPublicoController)
);

/**
 * POST /api/admin/cadastros/:id/aprovar
 * Aprovar cadastro e definir papel (ALUNO ou PROFESSOR)
 */
router.post(
  '/admin/cadastros/:id/aprovar',
  authenticate,
  authorize('ADMIN', 'PROFESSOR', 'RECEPCIONISTA'),
  validate(aprovarCadastroSchema),
  cadastroPublicoController.aprovar.bind(cadastroPublicoController)
);

/**
 * POST /api/admin/cadastros/:id/rejeitar
 * Rejeitar cadastro
 */
router.post(
  '/admin/cadastros/:id/rejeitar',
  authenticate,
  authorize('ADMIN', 'PROFESSOR', 'RECEPCIONISTA'),
  validate(rejeitarCadastroSchema),
  cadastroPublicoController.rejeitar.bind(cadastroPublicoController)
);

export default router;
