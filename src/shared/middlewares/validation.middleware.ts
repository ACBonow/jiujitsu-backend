import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { error } from '../utils/api-response';
import { ErrorCodes } from '../constants/error-codes';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.body);
      req.body = parsed; // Update req.body with the parsed/transformed data
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        return res.status(400).json(
          error('Erro de validação', errors, ErrorCodes.VALIDATION_ERROR_BODY)
        );
      }
      next(err);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        return res.status(400).json(
          error('Erro de validação nos parâmetros', errors, ErrorCodes.VALIDATION_ERROR_QUERY)
        );
      }
      next(err);
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        return res.status(400).json(
          error('Erro de validação nos parâmetros da URL', errors, ErrorCodes.VALIDATION_ERROR_PARAMS)
        );
      }
      next(err);
    }
  };
};
