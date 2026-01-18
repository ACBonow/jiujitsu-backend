import rateLimit from 'express-rate-limit';
import { CONSTANTS } from '../../config/constants';

// Rate limit geral para a API
export const apiLimiter = rateLimit({
  windowMs: CONSTANTS.RATE_LIMIT_WINDOW_MS,
  max: CONSTANTS.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Muitas requisições. Por favor, tente novamente mais tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit específico para login (mais restritivo)
export const loginLimiter = rateLimit({
  windowMs: CONSTANTS.RATE_LIMIT_WINDOW_MS,
  max: CONSTANTS.RATE_LIMIT_LOGIN_MAX,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Por favor, aguarde 15 minutos e tente novamente.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não contar requisições bem-sucedidas
});

// Rate limit para criação de recursos (menos restritivo)
export const createLimiter = rateLimit({
  windowMs: CONSTANTS.RATE_LIMIT_WINDOW_MS,
  max: 30,
  message: {
    success: false,
    message: 'Muitas criações em pouco tempo. Por favor, aguarde um pouco.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
