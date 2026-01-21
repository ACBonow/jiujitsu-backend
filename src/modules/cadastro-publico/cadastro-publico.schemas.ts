import { z } from 'zod';

// Validação de CPF
const validarCPF = (cpf: string): boolean => {
  cpf = cpf.replace(/\D/g, '');

  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;

  return true;
};

// Schema para cadastro público
export const cadastroPublicoSchema = z.object({
  nome: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .transform((val) => val.trim()),

  email: z
    .string()
    .email('Email inválido')
    .transform((val) => val.toLowerCase().trim()),

  cpf: z
    .string()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length === 11, 'CPF deve conter 11 dígitos')
    .refine(validarCPF, 'CPF inválido'),

  telefone: z
    .string()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length >= 10 && val.length <= 11, 'Telefone deve ter 10 ou 11 dígitos')
    .optional(),

  dataNascimento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .transform((val) => new Date(val + 'T00:00:00.000Z'))
    .refine((date) => date <= new Date(), 'Data de nascimento não pode ser no futuro')
    .refine((date) => {
      const idade = new Date().getFullYear() - date.getFullYear();
      return idade >= 3 && idade <= 120;
    }, 'Idade deve estar entre 3 e 120 anos'),

  sexo: z.enum(['MASCULINO', 'FEMININO'], {
    errorMap: () => ({ message: 'Sexo deve ser MASCULINO ou FEMININO' }),
  }),

  modalidades: z
    .array(
      z.enum(['JIUJITSU', 'MUAY_THAI', 'JUDO', 'MMA', 'WRESTLING', 'BOXE', 'KICKBOXING', 'NO_GI'], {
        errorMap: () => ({ message: 'Modalidade inválida' }),
      })
    )
    .min(1, 'Selecione pelo menos uma modalidade'),

  observacoes: z
    .string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional(),
});

// Schema para aprovar cadastro
export const aprovarCadastroSchema = z.object({
  papel: z.enum(['ALUNO', 'PROFESSOR'], {
    errorMap: () => ({ message: 'Papel deve ser ALUNO ou PROFESSOR' }),
  }),
  academiaId: z.string().cuid('ID de academia inválido').optional(),
});

// Schema para rejeitar cadastro
export const rejeitarCadastroSchema = z.object({
  motivo: z.string().max(500, 'Motivo deve ter no máximo 500 caracteres').optional(),
});

// Types inferidos dos schemas
export type CadastroPublicoInput = z.infer<typeof cadastroPublicoSchema>;
export type AprovarCadastroInput = z.infer<typeof aprovarCadastroSchema>;
export type RejeitarCadastroInput = z.infer<typeof rejeitarCadastroSchema>;
