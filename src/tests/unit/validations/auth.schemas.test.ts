import { describe, it, expect } from 'vitest';
import { loginSchema, changePasswordSchema } from '../../../modules/auth/auth.schemas';

describe('loginSchema', () => {
  it('aceita email e senha válidos', () => {
    const result = loginSchema.safeParse({
      email: 'admin@teste.com',
      senha: 'Senha123',
    });
    expect(result.success).toBe(true);
  });

  it('rejeita email inválido', () => {
    const result = loginSchema.safeParse({ email: 'nao-eh-email', senha: 'Senha123' });
    expect(result.success).toBe(false);
  });

  it('rejeita senha muito curta', () => {
    const result = loginSchema.safeParse({ email: 'admin@teste.com', senha: '12345' });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  const senhaValida = 'Senha123';

  it('aceita senha com 8+ chars, maiúscula e número', () => {
    const result = changePasswordSchema.safeParse({
      senhaAtual: 'qualquer',
      senhaNova: senhaValida,
    });
    expect(result.success).toBe(true);
  });

  it('rejeita senha com menos de 8 caracteres', () => {
    const result = changePasswordSchema.safeParse({
      senhaAtual: 'qualquer',
      senhaNova: 'Abc123',
    });
    expect(result.success).toBe(false);
    const msgs = result.error?.issues.map((i) => i.message);
    expect(msgs?.some((m) => m.includes('8 caracteres'))).toBe(true);
  });

  it('rejeita senha sem letra maiúscula', () => {
    const result = changePasswordSchema.safeParse({
      senhaAtual: 'qualquer',
      senhaNova: 'senha1234',
    });
    expect(result.success).toBe(false);
    const msgs = result.error?.issues.map((i) => i.message);
    expect(msgs?.some((m) => m.includes('maiúscula'))).toBe(true);
  });

  it('rejeita senha sem número', () => {
    const result = changePasswordSchema.safeParse({
      senhaAtual: 'qualquer',
      senhaNova: 'SenhaSemNumero',
    });
    expect(result.success).toBe(false);
    const msgs = result.error?.issues.map((i) => i.message);
    expect(msgs?.some((m) => m.includes('número'))).toBe(true);
  });

  it('rejeita quando senhaAtual está vazia', () => {
    const result = changePasswordSchema.safeParse({
      senhaAtual: '',
      senhaNova: senhaValida,
    });
    expect(result.success).toBe(false);
  });

  it('aceita senhaAtual sem restrições (qualquer string não vazia)', () => {
    const result = changePasswordSchema.safeParse({
      senhaAtual: 'senhafraca',
      senhaNova: senhaValida,
    });
    expect(result.success).toBe(true);
  });
});
