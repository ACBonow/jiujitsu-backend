import { describe, it, expect } from 'vitest';
import { createAlunoSchema, updateAlunoSchema } from '../../../modules/alunos/alunos.schemas';

describe('createAlunoSchema', () => {
  const baseValido = {
    nome: 'João Silva',
    email: 'joao@teste.com',
    dataNascimento: new Date('2000-01-01'),
    sexo: 'MASCULINO',
  };

  it('aceita dados válidos de adulto', () => {
    const result = createAlunoSchema.safeParse(baseValido);
    expect(result.success).toBe(true);
  });

  it('rejeita quando nome está ausente', () => {
    const result = createAlunoSchema.safeParse({ email: 'joao@teste.com' });
    expect(result.success).toBe(false);
    const campos = result.error?.issues.map((i) => i.path[0]);
    expect(campos).toContain('nome');
  });

  it('rejeita quando nome tem menos de 2 caracteres', () => {
    const result = createAlunoSchema.safeParse({ ...baseValido, nome: 'J' });
    expect(result.success).toBe(false);
  });

  describe('validação de CPF', () => {
    it('aceita CPF com dígitos verificadores válidos', () => {
      const result = createAlunoSchema.safeParse({
        ...baseValido,
        cpf: '529.982.247-25', // CPF válido
      });
      expect(result.success).toBe(true);
    });

    it('rejeita CPF com dígitos verificadores inválidos', () => {
      const result = createAlunoSchema.safeParse({
        ...baseValido,
        cpf: '123.456.789-00', // CPF matematicamente inválido
      });
      expect(result.success).toBe(false);
      const msgs = result.error?.issues.map((i) => i.message);
      expect(msgs?.some((m) => m.includes('CPF inválido'))).toBe(true);
    });

    it('rejeita CPF com todos os dígitos iguais (ex: 111.111.111-11)', () => {
      const result = createAlunoSchema.safeParse({
        ...baseValido,
        cpf: '111.111.111-11',
      });
      expect(result.success).toBe(false);
    });

    it('aceita aluno sem CPF (campo opcional)', () => {
      const result = createAlunoSchema.safeParse(baseValido);
      expect(result.success).toBe(true);
    });
  });

  describe('faixa e graus não são mais aceitos', () => {
    it('dados sem faixa são válidos (campo removido do schema)', () => {
      const result = createAlunoSchema.safeParse(baseValido);
      expect(result.success).toBe(true);
      // faixa não deve estar nos dados parsed
      if (result.success) {
        expect((result.data as any).faixa).toBeUndefined();
      }
    });

    it('campos faixa/graus enviados são ignorados (stripped by Zod)', () => {
      const result = createAlunoSchema.safeParse({
        ...baseValido,
        faixa: 'PRETA',
        graus: 6,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).faixa).toBeUndefined();
        expect((result.data as any).graus).toBeUndefined();
      }
    });
  });

  it('aceita email inválido retornando erro', () => {
    const result = createAlunoSchema.safeParse({
      ...baseValido,
      email: 'nao-eh-email',
    });
    expect(result.success).toBe(false);
    const campos = result.error?.issues.map((i) => i.path[0]);
    expect(campos).toContain('email');
  });
});

describe('updateAlunoSchema', () => {
  it('não aceita o campo status (campo removido)', () => {
    const result = updateAlunoSchema.safeParse({ status: 'INATIVO' });
    // O campo deve ser ignorado (stripped) — o parsed object não deve conter status
    if (result.success) {
      expect((result.data as any).status).toBeUndefined();
    }
  });

  it('aceita atualização parcial (todos campos opcionais)', () => {
    const result = updateAlunoSchema.safeParse({ nome: 'Novo Nome' });
    expect(result.success).toBe(true);
  });

  it('aceita objeto vazio (atualização sem mudanças)', () => {
    const result = updateAlunoSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
