import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Atribui um requestId a cada requisição e loga uma linha JSON estruturada
 * ao final (método, path, status, duração). Sem serviço externo — os logs
 * ficam disponíveis via `vercel logs` / aba "Logs" do projeto na Vercel.
 * O requestId permite correlacionar essa linha com o log de erro
 * correspondente em error-handler.middleware.ts.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  req.id = randomUUID();
  const startedAt = Date.now();

  res.on('finish', () => {
    const log = {
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(log));
  });

  next();
};
