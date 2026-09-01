import { Request, Response, NextFunction } from 'express';
import { Perfil } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt-helper';
import { ApiError } from '../utils/api-error';
import { ErrorCodes } from '../constants/error-codes';
import { prisma } from '../../config/database';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw ApiError.unauthorized('Token não fornecido', ErrorCodes.AUTH_TOKEN_NOT_PROVIDED);
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw ApiError.unauthorized('Formato de token inválido', ErrorCodes.AUTH_TOKEN_INVALID_FORMAT);
    }

    const token = parts[1];
    const decoded = verifyAccessToken(token);

    // Buscar usuário no banco para verificar se ainda está ativo
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        perfil: true,
        ativo: true,
        academiaId: true,
      },
    });

    if (!usuario || !usuario.ativo) {
      throw ApiError.unauthorized('Usuário inválido ou inativo', ErrorCodes.AUTH_USER_INVALID_OR_INACTIVE);
    }

    // Adicionar informações do usuário ao request
    req.user = {
      id: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
      academiaId: usuario.academiaId || undefined,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...perfisPermitidos: Perfil[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Usuário não autenticado', ErrorCodes.AUTH_NOT_AUTHENTICATED));
    }

    if (!perfisPermitidos.includes(req.user.perfil)) {
      return next(ApiError.forbidden('Você não tem permissão para acessar este recurso', ErrorCodes.AUTH_FORBIDDEN_RESOURCE));
    }

    next();
  };
};

// Middleware para verificar se o usuário pertence à mesma academia
export const checkAcademiaAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Usuário não autenticado', ErrorCodes.AUTH_NOT_AUTHENTICATED));
  }

  // Admin geral pode acessar tudo
  if (req.user.perfil === 'ADMIN' && !req.user.academiaId) {
    return next();
  }

  // Verificar se há academiaId no request (params, query ou body)
  const academiaId = req.params.academiaId || req.query.academiaId || req.body.academiaId;

  if (academiaId && req.user.academiaId && academiaId !== req.user.academiaId) {
    return next(ApiError.forbidden('Você não tem acesso a esta academia', ErrorCodes.ACADEMIA_ACCESS_DENIED));
  }

  next();
};
