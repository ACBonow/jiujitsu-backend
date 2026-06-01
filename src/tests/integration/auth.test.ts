/**
 * Testes de integração — Auth
 * Requer banco de teste configurado. Ver docs/SETUP.md seção 8.
 *
 * DATABASE_URL deve apontar para o banco de TESTE (não produção).
 * Rodar com: DATABASE_URL="..." npm test
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../../app';
import { prisma } from '../../config/database';
import { limparBanco, criarUsuarioAdmin } from '../helpers/db.helper';

describe('Auth API (integração)', () => {
  beforeAll(async () => {
    await limparBanco();
    await criarUsuarioAdmin();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  describe('POST /api/auth/login', () => {
    it('retorna tokens com credenciais válidas', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@teste.com', senha: 'senha123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe('admin@teste.com');
    });

    it('retorna 401 com senha incorreta', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@teste.com', senha: 'errada' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('retorna 401 com email inexistente', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'naoexiste@teste.com', senha: 'senha123' });

      expect(res.status).toBe(401);
    });

    it('retorna 400 com email inválido', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nao-eh-email', senha: 'senha123' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@teste.com', senha: 'senha123' });
      refreshToken = login.body.data.refreshToken;
    });

    it('retorna novos tokens com refresh token válido', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      // Tokens devem ser diferentes (rotação)
      expect(res.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('retorna 401 com refresh token inválido', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'token.invalido.aqui' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@teste.com', senha: 'senha123' });
      accessToken = login.body.data.accessToken;
    });

    it('retorna dados do usuário autenticado', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('admin@teste.com');
      expect(res.body.data.perfil).toBe('ADMIN');
    });

    it('retorna 401 sem token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('retorna 401 com token malformado', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token.invalido');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('invalida sessão e refresh token não pode ser reutilizado', async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@teste.com', senha: 'senha123' });

      const { accessToken, refreshToken } = login.body.data;

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Refresh token não deve mais funcionar
      const refresh = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refresh.status).toBe(401);
    });
  });
});
