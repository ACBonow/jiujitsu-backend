import { describe, it, expect } from 'vitest';
import { FormaPagamento } from '@prisma/client';
import { calcularDesconto } from '../../../modules/financeiro/financeiro.service';

const regraBase = {
  descontoAntecipadoPercentual: 5,
  diaLimiteAntecipado: 10,
  descontoPagamentoImediatoPercentual: 3,
  formasPagamentoComDesconto: [FormaPagamento.DINHEIRO, FormaPagamento.PIX],
  descontosAcumulativos: true,
};

describe('calcularDesconto', () => {
  it('sem regra configurada, não aplica desconto', () => {
    const resultado = calcularDesconto({
      valorOriginal: 200,
      formaPagamento: FormaPagamento.PIX,
      dataPagamento: new Date('2026-05-05'),
      regra: null,
    });

    expect(resultado).toEqual({ percentualAplicado: 0, descontoValor: 0, valorFinal: 200 });
  });

  it('aplica apenas o desconto por antecipação quando pago até o dia limite', () => {
    const resultado = calcularDesconto({
      valorOriginal: 200,
      formaPagamento: FormaPagamento.CARTAO_CREDITO,
      dataPagamento: new Date('2026-05-10'),
      regra: regraBase,
    });

    expect(resultado.percentualAplicado).toBe(5);
    expect(resultado.descontoValor).toBe(10);
    expect(resultado.valorFinal).toBe(190);
  });

  it('não aplica desconto por antecipação após o dia limite', () => {
    const resultado = calcularDesconto({
      valorOriginal: 200,
      formaPagamento: FormaPagamento.CARTAO_CREDITO,
      dataPagamento: new Date('2026-05-11'),
      regra: regraBase,
    });

    expect(resultado.percentualAplicado).toBe(0);
    expect(resultado.valorFinal).toBe(200);
  });

  it('aplica apenas o desconto por forma de pagamento imediata (dinheiro/pix)', () => {
    const resultado = calcularDesconto({
      valorOriginal: 200,
      formaPagamento: FormaPagamento.PIX,
      dataPagamento: new Date('2026-05-20'),
      regra: regraBase,
    });

    expect(resultado.percentualAplicado).toBe(3);
    expect(resultado.descontoValor).toBe(6);
    expect(resultado.valorFinal).toBe(194);
  });

  it('não aplica desconto de forma de pagamento para formas fora da lista configurada', () => {
    const resultado = calcularDesconto({
      valorOriginal: 200,
      formaPagamento: FormaPagamento.BOLETO,
      dataPagamento: new Date('2026-05-05'),
      regra: { ...regraBase, diaLimiteAntecipado: null, descontoAntecipadoPercentual: null },
    });

    expect(resultado.percentualAplicado).toBe(0);
  });

  it('soma os dois descontos quando acumulativos e ambas as condições são satisfeitas', () => {
    const resultado = calcularDesconto({
      valorOriginal: 200,
      formaPagamento: FormaPagamento.DINHEIRO,
      dataPagamento: new Date('2026-05-01'),
      regra: regraBase,
    });

    expect(resultado.percentualAplicado).toBe(8);
    expect(resultado.descontoValor).toBe(16);
    expect(resultado.valorFinal).toBe(184);
  });

  it('usa apenas o maior desconto quando não acumulativos', () => {
    const resultado = calcularDesconto({
      valorOriginal: 200,
      formaPagamento: FormaPagamento.DINHEIRO,
      dataPagamento: new Date('2026-05-01'),
      regra: { ...regraBase, descontosAcumulativos: false },
    });

    expect(resultado.percentualAplicado).toBe(5);
    expect(resultado.valorFinal).toBe(190);
  });

  it('limita o percentual aplicado a 100%', () => {
    const resultado = calcularDesconto({
      valorOriginal: 200,
      formaPagamento: FormaPagamento.PIX,
      dataPagamento: new Date('2026-05-01'),
      regra: {
        ...regraBase,
        descontoAntecipadoPercentual: 80,
        descontoPagamentoImediatoPercentual: 60,
      },
    });

    expect(resultado.percentualAplicado).toBe(100);
    expect(resultado.valorFinal).toBe(0);
  });
});
