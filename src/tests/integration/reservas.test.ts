/**
 * Testes de integração — Reservas
 * Requer banco de teste. Ver docs/SETUP.md seção 8.
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import app from '../../app';
import { prisma } from '../../config/database';
import { limparBanco, criarAcademia, criarAluno } from '../helpers/db.helper';
import { tokenAdmin, tokenAluno } from '../helpers/auth.helper';

describe('Reservas API (integração)', () => {
  let academiaId: string;
  let professorId: string;
  let aulaId: string;
  let alunoId: string;
  let alunoUsuarioId: string;

  beforeAll(async () => {
    await limparBanco();
    const academia = await criarAcademia();
    academiaId = academia.id;

    // Criar professor
    const pessoaProf = await prisma.pessoa.create({
      data: { nome: 'Prof Teste', email: 'prof@teste.com' },
    });
    const profRecord = await prisma.professor.create({
      data: { pessoaId: pessoaProf.id, modalidades: ['JIUJITSU'] },
    });
    professorId = profRecord.id;

    await prisma.professorAcademia.create({
      data: { professorId, academiaId, ativo: true },
    });

    // Criar aula no futuro
    const aulaRecord = await prisma.aula.create({
      data: {
        academiaId,
        professorId,
        dataHora: new Date(Date.now() + 7_200_000), // 2h no futuro
        duracao: 60,
        categoria: 'ADULTO_MISTO',
        modalidade: 'JIUJITSU',
        limiteAlunos: 5,
        status: 'AGENDADA',
      },
    });
    aulaId = aulaRecord.id;

    // Criar aluno com matrícula ativa
    const { aluno, usuario } = await criarAluno(academiaId);
    alunoId = aluno.id;
    alunoUsuarioId = usuario.id;

    await prisma.plano.create({
      data: { nome: 'Plano Teste', valorBase: 100, modalidades: ['JIUJITSU'] },
    }).then(async (plano) => {
      await prisma.matricula.create({
        data: {
          alunoId,
          academiaId,
          planoId: plano.id,
          valorFinal: 100,
          diaVencimento: 10,
          status: 'ATIVA',
        },
      });
    });
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.reserva.deleteMany();
  });

  describe('POST /api/reservas', () => {
    it('cria reserva CONFIRMADA quando há vaga', async () => {
      const res = await request(app)
        .post('/api/reservas')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({ aulaId, alunoId });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('CONFIRMADA');
      expect(res.body.data.dataExpiracao).toBeTruthy(); // deve ter expiração
    });

    it('cria reserva ESPERA quando aula está lotada', async () => {
      // Lotar a aula: criar 5 reservas confirmadas
      for (let i = 0; i < 5; i++) {
        const { aluno: a } = await criarAluno(academiaId);
        await prisma.plano.findFirst().then(async (plano) => {
          if (plano) {
            await prisma.matricula.create({
              data: { alunoId: a.id, academiaId, planoId: plano.id, valorFinal: 100, diaVencimento: 10, status: 'ATIVA' },
            });
          }
        });
        await prisma.reserva.create({
          data: { aulaId, alunoId: a.id, status: 'CONFIRMADA' },
        });
      }

      const res = await request(app)
        .post('/api/reservas')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({ aulaId, alunoId });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('ESPERA');
      expect(res.body.data.posicaoFila).toBe(1);
    });

    it('retorna 422 quando aluno não tem matrícula ativa', async () => {
      const { aluno: semMatricula } = await criarAluno(academiaId);

      const res = await request(app)
        .post('/api/reservas')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({ aulaId, alunoId: semMatricula.id });

      expect(res.status).toBe(422);
    });

    it('retorna 409 quando reserva já existe', async () => {
      // Primeira reserva
      await request(app)
        .post('/api/reservas')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({ aulaId, alunoId });

      // Segunda reserva (duplicada)
      const res = await request(app)
        .post('/api/reservas')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({ aulaId, alunoId });

      expect(res.status).toBe(409);
    });

    it('retorna 401 sem token', async () => {
      const res = await request(app).post('/api/reservas').send({ aulaId, alunoId });
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/reservas/:id/cancelar', () => {
    it('cancela reserva como ADMIN', async () => {
      const reserva = await prisma.reserva.create({
        data: { aulaId, alunoId, status: 'CONFIRMADA' },
      });

      const res = await request(app)
        .patch(`/api/reservas/${reserva.id}/cancelar`)
        .set('Authorization', `Bearer ${tokenAdmin()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELADA');
    });

    it('retorna 403 quando ALUNO tenta cancelar reserva de outro aluno', async () => {
      const { aluno: outroAluno, usuario: outroUsuario } = await criarAluno(academiaId);
      await prisma.plano.findFirst().then(async (plano) => {
        if (plano) {
          await prisma.matricula.create({
            data: { alunoId: outroAluno.id, academiaId, planoId: plano.id, valorFinal: 100, diaVencimento: 10, status: 'ATIVA' },
          });
        }
      });

      const reservaOutro = await prisma.reserva.create({
        data: { aulaId, alunoId: outroAluno.id, status: 'CONFIRMADA' },
      });

      // alunoUsuarioId tenta cancelar reserva de outroAluno
      const res = await request(app)
        .patch(`/api/reservas/${reservaOutro.id}/cancelar`)
        .set('Authorization', `Bearer ${tokenAluno(alunoUsuarioId)}`);

      expect(res.status).toBe(403);
    });
  });
});
