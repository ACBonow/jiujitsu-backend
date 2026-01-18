import { prisma } from '@/config/database';
import { ApiError } from '@/shared/utils/api-error';
import { comparePassword, hashPassword } from '@/shared/utils/password-hash';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  JWTPayload,
} from '@/shared/utils/jwt-helper';
import { LoginResponse, AuthTokens } from './auth.types';

export class AuthService {
  async login(email: string, senha: string): Promise<LoginResponse> {
    // Buscar usuário por email
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: {
        pessoa: {
          select: {
            nome: true,
            telefone: true,
          },
        },
        academia: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    if (!usuario) {
      throw ApiError.unauthorized('Email ou senha inválidos');
    }

    if (!usuario.ativo) {
      throw ApiError.forbidden('Usuário inativo');
    }

    // Verificar senha
    const senhaValida = await comparePassword(senha, usuario.senha);
    if (!senhaValida) {
      throw ApiError.unauthorized('Email ou senha inválidos');
    }

    // Gerar tokens
    const payload: JWTPayload = {
      userId: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
    };

    const tokens = {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
    };

    // Salvar refresh token no banco
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastLogin: new Date(),
      },
    });

    return {
      user: {
        id: usuario.id,
        email: usuario.email,
        perfil: usuario.perfil,
        pessoa: {
          nome: usuario.pessoa.nome,
          telefone: usuario.pessoa.telefone,
        },
        academia: usuario.academia,
      },
      tokens,
    };
  }

  async logout(usuarioId: string): Promise<void> {
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { refreshToken: null },
    });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    // Verificar e decodificar refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Verificar se o refresh token no banco corresponde
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        perfil: true,
        ativo: true,
        refreshToken: true,
      },
    });

    if (!usuario || !usuario.ativo) {
      throw ApiError.unauthorized('Usuário inválido ou inativo');
    }

    if (usuario.refreshToken !== refreshToken) {
      throw ApiError.unauthorized('Refresh token inválido');
    }

    // Gerar novos tokens
    const payload: JWTPayload = {
      userId: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
    };

    const newTokens = {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
    };

    // Atualizar refresh token no banco
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { refreshToken: newTokens.refreshToken },
    });

    return newTokens;
  }

  async me(usuarioId: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        email: true,
        perfil: true,
        ativo: true,
        pessoa: {
          select: {
            nome: true,
            telefone: true,
            email: true,
            cpf: true,
          },
        },
        academia: {
          select: {
            id: true,
            nome: true,
            telefone: true,
            email: true,
          },
        },
      },
    });

    if (!usuario) {
      throw ApiError.notFound('Usuário não encontrado');
    }

    return usuario;
  }

  async changePassword(
    usuarioId: string,
    senhaAtual: string,
    senhaNova: string
  ): Promise<void> {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, senha: true },
    });

    if (!usuario) {
      throw ApiError.notFound('Usuário não encontrado');
    }

    // Verificar senha atual
    const senhaValida = await comparePassword(senhaAtual, usuario.senha);
    if (!senhaValida) {
      throw ApiError.badRequest('Senha atual incorreta');
    }

    // Hash da nova senha
    const novaSenhaHash = await hashPassword(senhaNova);

    // Atualizar senha
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { senha: novaSenhaHash },
    });
  }
}

export const authService = new AuthService();
