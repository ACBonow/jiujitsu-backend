import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '@/shared/middlewares/validation.middleware';
import { authenticate } from '@/shared/middlewares/auth.middleware';
import { loginLimiter } from '@/shared/middlewares/rate-limit.middleware';
import { loginSchema, refreshTokenSchema, changePasswordSchema } from './auth.schemas';

const router = Router();

// POST /api/auth/login - Login
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

// POST /api/auth/logout - Logout (requer autenticação)
router.post('/logout', authenticate, authController.logout);

// POST /api/auth/refresh - Renovar tokens
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

// GET /api/auth/me - Dados do usuário logado (requer autenticação)
router.get('/me', authenticate, authController.me);

// POST /api/auth/change-password - Trocar senha (requer autenticação)
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
