import { Request } from 'express';
import { CONSTANTS } from '../../config/constants';

export interface PaginationParams {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export interface PaginationInput {
  page?: number;
  limit?: number;
}

export const paginate = (page: number = 1, limit: number = CONSTANTS.PAGINATION_DEFAULT_LIMIT): PaginationParams => {
  // Garantir valores mínimos e máximos
  const validPage = Math.max(1, page);
  const validLimit = Math.min(Math.max(1, limit), CONSTANTS.PAGINATION_MAX_LIMIT);

  const skip = (validPage - 1) * validLimit;
  const take = validLimit;

  return {
    skip,
    take,
    page: validPage,
    limit: validLimit,
  };
};

export const getPaginationParams = (input: Request | PaginationInput): PaginationParams => {
  let page: number;
  let limit: number;

  if ('query' in input) {
    // É um Request do Express
    page = parseInt(input.query.page as string) || 1;
    limit = parseInt(input.query.limit as string) || CONSTANTS.PAGINATION_DEFAULT_LIMIT;
  } else {
    // É um objeto com page/limit
    page = input.page || 1;
    limit = input.limit || CONSTANTS.PAGINATION_DEFAULT_LIMIT;
  }

  return paginate(page, limit);
};

export const getSortParams = (req: Request): { orderBy: string; order: 'asc' | 'desc' } => {
  const orderBy = (req.query.orderBy as string) || 'createdAt';
  const order = (req.query.order as 'asc' | 'desc') || 'desc';

  return { orderBy, order };
};
