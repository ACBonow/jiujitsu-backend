/**
 * Testes de integração — Financeiro (regra de pagamento e pagamentos)
 * Requer banco de teste. Ver docs/SETUP.md seção 8.
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import app from '../../app';
import { prisma } from '../../config/database';
import {
  limparBanco,
  criarAcademia,
  criarUsuarioAdmin,
  criarAluno,
  criarPlano,
  criarMatricula,
  criarMensalidade,
} from '../helpers/db.helper';
import { tokenAdmin, tokenRecepcionista } from '../helpers/auth.helper';

describe('Financeiro — Regra de Pagamento e Pagamentos (integração)', () => {
  let academiaId: string;
  let planoId: string;

  beforeAll(async () => {
    await limparBanco();
    const academia = await criarAcademia();
    academiaId = academia.id;
    await criarUsuarioAdmin(academiaId);
    const plano = await criarPlano({ valorBase: 200 });
    planoId = plano.id;
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.mensalidade.deleteMany();
    await prisma.pagamentoLote.deleteMany();
    await prisma.regraPagamentoAcademia.deleteMany();
    await prisma.matricula.deleteMany();
    await prisma.usuario.deleteMany({ where: { perfil: 'ALUNO' } });
    await prisma.aluno.deleteMany();
    await prisma.pessoa.deleteMany({ where: { email: { not: 'admin@teste.com' } } });
  });

  describe('GET/PUT /api/financeiro/academias/:academiaId/regra-pagamento', () => {
    it('retorna null quando a academia ainda não tem regra configurada', async () => {
      const res = await request(app)
        .get(`/api/financeiro/academias/${academiaId}/regra-pagamento`)
        .set('Authorization', `Bearer ${tokenAdmin()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });

    it('ADMIN cria a regra de pagamento da academia', async () => {
      const res = await request(app)
        .put(`/api/financeiro/academias/${academiaId}/regra-pagamento`)
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({
          descontoAntecipadoPercentual: 5,
          diaLimiteAntecipado: 10,
          descontoPagamentoImediatoPercentual: 3,
          formasPagamentoComDesconto: ['DINHEIRO', 'PIX'],
          descontosAcumulativos: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.descontoAntecipadoPercentual).toBe(5);
      expect(res.body.data.formasPagamentoComDesconto).toEqual(['DINHEIRO', 'PIX']);
    });

    it('RECEPCIONISTA não pode alterar a regra (apenas ADMIN)', async () => {
      const res = await request(app)
        .put(`/api/financeiro/academias/${academiaId}/regra-pagamento`)
        .set('Authorization', `Bearer ${tokenRecepcionista('user-recep', academiaId)}`)
        .send({ descontoAntecipadoPercentual: 5 });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/financeiro/pagamentos/preview e POST /api/financeiro/pagamentos', () => {
    it('calcula o desconto no preview e registra o pagamento combinado de duas mensalidades', async () => {
      await request(app)
        .put(`/api/financeiro/academias/${academiaId}/regra-pagamento`)
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({
          descontoAntecipadoPercentual: 5,
          diaLimiteAntecipado: 10,
          descontoPagamentoImediatoPercentual: 3,
          formasPagamentoComDesconto: ['DINHEIRO', 'PIX'],
          descontosAcumulativos: true,
        });

      const pai = await criarAluno(academiaId);
      const filho = await criarAluno(academiaId);
      const matriculaPai = await criarMatricula(pai.aluno.id, academiaId, planoId, { valorFinal: 200 });
      const matriculaFilho = await criarMatricula(filho.aluno.id, academiaId, planoId, { valorFinal: 150 });
      const mensalidadePai = await criarMensalidade(matriculaPai.id, { valorOriginal: 200 });
      const mensalidadeFilho = await criarMensalidade(matriculaFilho.id, { valorOriginal: 150 });

      const preview = await request(app)
        .post('/api/financeiro/pagamentos/preview')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({
          mensalidadeIds: [mensalidadePai.id, mensalidadeFilho.id],
          formaPagamento: 'PIX',
          dataPagamento: '2026-05-01',
        });

      expect(preview.status).toBe(200);
      expect(preview.body.data.itens).toHaveLength(2);
      // 5% (antecipado) + 3% (pix) = 8% sobre 350 = 28
      expect(preview.body.data.descontoTotal).toBe(28);
      expect(preview.body.data.valorTotal).toBe(322);

      const registro = await request(app)
        .post('/api/financeiro/pagamentos')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({
          itens: preview.body.data.itens.map((i: any) => ({
            mensalidadeId: i.mensalidadeId,
            valorPago: i.valorFinal,
          })),
          formaPagamento: 'PIX',
          dataPagamento: '2026-05-01',
        });

      expect(registro.status).toBe(201);
      expect(registro.body.data.mensalidades).toHaveLength(2);
      expect(registro.body.data.valorTotal).toBe(322);

      const mensalidadesAtualizadas = await prisma.mensalidade.findMany({
        where: { id: { in: [mensalidadePai.id, mensalidadeFilho.id] } },
      });
      expect(mensalidadesAtualizadas.every((m) => m.status === 'PAGO')).toBe(true);
      expect(mensalidadesAtualizadas.every((m) => m.pagamentoLoteId === registro.body.data.id)).toBe(true);
    });

    it('rejeita pagamento de mensalidade já paga', async () => {
      const aluno = await criarAluno(academiaId);
      const matricula = await criarMatricula(aluno.aluno.id, academiaId, planoId);
      const mensalidade = await criarMensalidade(matricula.id, { status: 'PAGO' as any });

      const res = await request(app)
        .post('/api/financeiro/pagamentos')
        .set('Authorization', `Bearer ${tokenAdmin()}`)
        .send({
          itens: [{ mensalidadeId: mensalidade.id, valorPago: 200 }],
          formaPagamento: 'DINHEIRO',
        });

      expect(res.status).toBe(400);
    });
  });
});
