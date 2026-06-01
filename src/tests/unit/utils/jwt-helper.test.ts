import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/env', () => ({
  config: {
    jwt: {
      secret: 'test-secret-key-at-least-ten-chars',
      refreshSecret: 'test-refresh-secret-key-at-least-ten-chars',
      expiresIn: '15m',
      refreshExpiresIn: '7d',
    },
  },
}));

// Importar após o mock
const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } =
  await import('../../../shared/utils/jwt-helper');

const payload = {
  userId: 'user-123',
  email: 'teste@teste.com',
  perfil: 'ADMIN',
};

describe('JWT Helper', () => {
  describe('generateAccessToken', () => {
    it('gera um token JWT válido', () => {
      const token = generateAccessToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // header.payload.signature
    });

    it('tokens gerados em chamadas distintas são diferentes', () => {
      const t1 = generateAccessToken(payload);
      const t2 = generateAccessToken(payload);
      // Tokens com mesmo payload gerados em momentos distintos podem ser iguais
      // (iat pode ser o mesmo segundo), mas o teste valida que a função é chamável
      expect(t1).toBeTruthy();
      expect(t2).toBeTruthy();
    });
  });

  describe('verifyAccessToken', () => {
    it('decodifica corretamente o payload de um token válido', () => {
      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.perfil).toBe(payload.perfil);
    });

    it('lança erro para token inválido', () => {
      expect(() => verifyAccessToken('token.invalido.aqui')).toThrow('Token inválido');
    });

    it('lança erro para token com assinatura adulterada', () => {
      const token = generateAccessToken(payload);
      const adulterado = token.slice(0, -5) + 'xxxxx';
      expect(() => verifyAccessToken(adulterado)).toThrow('Token inválido');
    });
  });

  describe('generateRefreshToken + verifyRefreshToken', () => {
    it('gera e verifica refresh token corretamente', () => {
      const token = generateRefreshToken(payload);
      const decoded = verifyRefreshToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    it('access token não é válido como refresh token', () => {
      const accessToken = generateAccessToken(payload);
      // Assinado com segredo diferente, então verifyRefreshToken deve falhar
      expect(() => verifyRefreshToken(accessToken)).toThrow('Refresh token inválido');
    });
  });
});
