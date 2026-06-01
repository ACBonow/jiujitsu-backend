/**
 * Testes de integração — Alunos
 * Requer banco de teste. Ver docs/SETUP.md seção 8.
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import app from '../../app';
import { prisma } from '../../config/database';
import { limparBanco, criarAcademia, criarUsuarioAdmin, criarAluno } from '../helpers/db.helper';
import { tokenAdmin, tokenRecepcionista } from '../helpers/auth.helper';

describe('Alunos API (integração)', () => {
  let academiaId: string;

  beforeAll(async () => {
    await limparBanco();
    const academia = await criarAcademia();
    academiaId = academia.id;
    await criarUsuarioAdmin(academiaId);
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Limpar alunos entre os testes (mantendo academia e admin)
    await prisma.usuario.deleteMany({ where: { perfil: 'ALUNO' } });
    await prisma.aluno.deleteMany();
    await prisma.pessoa.deleteMany({ where: { email: { not: 'admin@teste.com' } } });
  });

  describe('GET /api/alunos', () => {
    it('retorna lista paginada para ADMIN', async () => {
      await criarAluno(academiaId);
      await criarAluno(academiaId);

      const res = await request(app)
        .get('/api/alunos')
        .set('Authorization', `Bearer ${tokenAdmin()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('retorna 401 sem token', async () => {
      const res = await request(app).get('/api/alunos');
      expect(res.status).toBe(401);
    });

    it('filtra por status ATIVO', async () => {
      await criarAluno(academiaId, { status: 'ATIVO' });
      await criarAluno(academiaId, { status: 'INATIVO' });

      const res = await request(app)
        .get('/api/alunos?status=ATIVO')
        .set('Authorization', `Bearer ${tokenAdmin()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((a: any) => a.status === 'ATIVO')).toBe(true);
    });
  });

  describe('POST /api/alunos', () => {
    const payloadValido = {
      nome: 'João Silva',
      email: `joao-${Date.now()}@teste.com`,
      dataNascimento: '2000-05-15',
      sexo: 'MASCULINO',
    };

    it('cria aluno com dados válidos — faixa sempre BRANCA', async () => {
      const res = await request(app)
        .post('/api/alunos')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send(payloadValido);

      expect(res.status).toBe(201);
      expect(res.body.data.faixa).toBe('BRANCA');
      expect(res.body.data.graus).toBe(0);
    });

    it('ignora faixa enviada no body — sempre cria como BRANCA', async () => {
      const res = await request(app)
        .post('/api/alunos')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({ ...payloadValido, email: `teste2-${Date.now()}@teste.com`, faixa: 'PRETA', graus: 6 });

      expect(res.status).toBe(201);
      expect(res.body.data.faixa).toBe('BRANCA');
      expect(res.body.data.graus).toBe(0);
    });

    it('retorna 400 quando nome está ausente', async () => {
      const res = await request(app)
        .post('/api/alunos')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({ email: 'teste@teste.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('retorna 400 com CPF matematicamente inválido', async () => {
      const res = await request(app)
        .post('/api/alunos')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({ ...payloadValido, cpf: '12345678900' });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/alunos/:id/status', () => {
    it('muda status para INATIVO', async () => {
      const { aluno } = await criarAluno(academiaId, { status: 'ATIVO' });

      const res = await request(app)
        .patch(`/api/alunos/${aluno.id}/status`)
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({ status: 'INATIVO' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('INATIVO');
    });

    it('retorna 404 para aluno inexistente', async () => {
      const res = await request(app)
        .patch('/api/alunos/cuid-inexistente-aqui/status')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({ status: 'INATIVO' });

      expect([400, 404]).toContain(res.status);
    });
  });

  describe('PUT /api/alunos/:id — status não pode ser alterado via update', () => {
    it('status no body é ignorado (stripped pelo schema)', async () => {
      const { aluno } = await criarAluno(academiaId, { status: 'ATIVO' });

      await request(app)
        .put(`/api/alunos/${aluno.id}`)
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({ status: 'INATIVO', nome: 'Nome Atualizado' });

      // Buscar o aluno para verificar que status não mudou
      const verificacao = await request(app)
        .get(`/api/alunos/${aluno.id}`)
        .set('Authorization', `Bearer ${tokenAdmin()}`);

      expect(verificacao.body.data.status).toBe('ATIVO');
    });
  });
});
