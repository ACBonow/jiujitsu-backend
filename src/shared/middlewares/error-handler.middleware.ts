import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/api-error';
import { error } from '../utils/api-response';
import { config } from '../../config/env';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log do erro (em produção, enviar para serviço de log)
  console.error('❌ Erro:', err);

  // ApiError customizado
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(
      error(err.message)
    );
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

  // Prisma Validation Error
  if (err instanceof Prisma.PrismaClientValidationError) {
    // Extrair a última linha da mensagem que contém o detalhe do erro
    const errorDetail = err.message.split('\n').pop() || '';
    console.error('Prisma Validation Error:', errorDetail);
    return res.status(400).json(
      error(`Erro de validação de dados: ${errorDetail}`)
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
