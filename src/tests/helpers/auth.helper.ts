import jwt from 'jsonwebtoken';
import { Perfil } from '@prisma/client';

interface TokenPayload {
  userId: string;
  perfil: Perfil;
  academiaId?: string;
}

export function gerarToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET ?? 'test-secret', { expiresIn: '15m' });
}

export const tokenAdmin = (userId = 'user-admin-test') =>
  gerarToken({ userId, perfil: Perfil.ADMIN });

export const tokenProfessor = (userId = 'user-prof-test', academiaId = 'academia-test') =>
  gerarToken({ userId, perfil: Perfil.PROFESSOR, academiaId });

export const tokenRecepcionista = (userId = 'user-recep-test', academiaId = 'academia-test') =>
  gerarToken({ userId, perfil: Perfil.RECEPCIONISTA, academiaId });

export const tokenAluno = (userId = 'user-aluno-test', academiaId = 'academia-test') =>
  gerarToken({ userId, perfil: Perfil.ALUNO, academiaId });
