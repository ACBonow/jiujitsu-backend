import { Perfil } from '@prisma/client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  perfil: Perfil;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    perfil: Perfil;
    pessoa: {
      nome: string;
      telefone?: string | null;
    };
    academia?: {
      id: string;
      nome: string;
    } | null;
  };
  tokens: AuthTokens;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  senhaAtual: string;
  senhaNova: string;
}
