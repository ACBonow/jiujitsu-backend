import { Perfil } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: {
        id: string;
        email: string;
        perfil: Perfil;
        academiaId?: string;
      };
    }
  }
}

export {};
