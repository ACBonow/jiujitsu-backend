import { Perfil } from '@prisma/client';

interface AuthUser {
  perfil: Perfil;
  academiaId?: string;
}

/**
 * Retorna o academiaId efetivo para filtros de listagem.
 * - ADMIN global (sem academiaId): pode filtrar por qualquer academia via query param, ou ver tudo
 * - Qualquer outro perfil ou ADMIN vinculado a academia: restrito à sua própria academia
 */
export function resolveAcademiaScope(
  currentUser: AuthUser,
  requestedAcademiaId?: string
): string | undefined {
  const isGlobalAdmin = currentUser.perfil === Perfil.ADMIN && !currentUser.academiaId;

  if (isGlobalAdmin) {
    return requestedAcademiaId; // Admin global pode filtrar ou ver tudo
  }

  // Non-global: força sempre a academia do usuário, ignora query param
  return currentUser.academiaId;
}

/**
 * Verifica se o usuário tem acesso a um academiaId específico.
 * Lança erro 403 se não tiver.
 */
export function assertAcademiaAccess(currentUser: AuthUser, targetAcademiaId: string): void {
  const isGlobalAdmin = currentUser.perfil === Perfil.ADMIN && !currentUser.academiaId;
  if (!isGlobalAdmin && currentUser.academiaId !== targetAcademiaId) {
    const { ApiError } = require('./api-error');
    const { ErrorCodes } = require('../constants/error-codes');
    throw ApiError.forbidden('Você não tem acesso a esta academia', ErrorCodes.ACADEMIA_ACCESS_DENIED);
  }
}
