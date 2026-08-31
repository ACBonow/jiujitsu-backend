import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/api-error';
import { error } from '../utils/api-response';
import { config } from '../../config/env';

const logError = (req: Request, err: Error, extra?: Record<string, unknown>) => {
  console.error(
    JSON.stringify({
      level: 'error',
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      name: err.name,
      message: err.message,
      stack: config.server.isDevelopment ? err.stack : undefined,
      timestamp: new Date().toISOString(),
      ...extra,
    })
  );
};

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logError(req, err);

  // ApiError customizado
  if (err instanceof ApiError) {
    const body: Record<string, unknown> = { success: false, message: err.message };
    if (err.code) body.code = err.code;
    return res.status(err.statusCode).json(body);
  }

  // Prisma Known Request Error
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        const target = (err.meta?.target as string[]) || [];
        const field = target[0] || 'campo';
        return res.status(409).json(
          error(`${field} já existe no sistema`)
        );

      case 'P2025':
        // Record not found
        return res.status(404).json(
          error('Registro não encontrado')
        );

      case 'P2003':
        // Foreign key constraint failed
        return res.status(400).json(
          error('Registro relacionado não encontrado')
        );

      case 'P2014':
        // Required relation violation
        return res.status(400).json(
          error('Relacionamento obrigatório não preenchido')
        );

      default:
        return res.status(400).json(
          error('Erro ao processar operação no banco de dados')
        );
    }
  }

  // Prisma Validation Error — não expor detalhes internos do schema (já logado acima)
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json(
      error('Dados inválidos para a operação')
    );
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      error('Token inválido')
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      error('Token expirado')
    );
  }

  // Erro genérico
  const statusCode = 500;
  const message = config.server.isDevelopment
    ? err.message
    : 'Erro interno do servidor';

  return res.status(statusCode).json(
    error(message)
  );
};
