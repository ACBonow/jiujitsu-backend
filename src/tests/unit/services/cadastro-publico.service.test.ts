import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../config/database';
import { Perfil } from '@prisma/client';

vi.mock('../../../config/database', () => ({
  prisma: {
    cadastroPendente: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    pessoa: { findFirst: vi.fn(), findUnique: vi.fn() },
    professor: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../../shared/utils/password-hash', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-cpf'),
}));

const { cadastroPublicoService } = await import(
  '../../../modules/cadastro-publico/cadastro-publico.service'
);

const cadastroPendente = {
  id: 'cadastro-1',
  status: 'PENDENTE',
  nome: 'Pedro Oliveira',
  email: 'pedro@teste.com',
  cpf: '12345678901',
  telefone: '11999999999',
  dataNascimento: new Date('1995-01-01'),
  sexo: 'MASCULINO',
  modalidades: ['JIUJITSU'],
  observacoes: null,
  motivoRejeicao: null,
};

const aprovadorAdmin = { id: 'admin-1', perfil: Perfil.ADMIN, academiaId: undefined };
const aprovadorAdminVinculado = { id: 'admin-2', perfil: Perfil.ADMIN, academiaId: 'academia-1' };
const aprovadorProfessor = { id: 'prof-1', perfil: Perfil.PROFESSOR, academiaId: 'academia-1' };
const aprovadorRecepcionista = { id: 'recep-1', perfil: Perfil.RECEPCIONISTA, academiaId: 'academia-1' };

function setupAprovarMock() {
  vi.mocked(prisma.cadastroPendente.findUnique).mockResolvedValue(cadastroPendente as any);
  vi.mocked(prisma.pessoa.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) =>
    cb({
      pessoa: { create: vi.fn().mockResolvedValue({ ...cadastroPendente, id: 'pessoa-nova' }) },
      aluno: { create: vi.fn().mockResolvedValue({ id: 'aluno-novo', faixa: 'BRANCA', graus: 0 }) },
      professor: { create: vi.fn().mockResolvedValue({ id: 'prof-novo' }) },
      usuario: { create: vi.fn().mockResolvedValue({ id: 'user-novo', email: cadastroPendente.email, perfil: 'ALUNO' }) },
      cadastroPendente: {
        update: vi.fn().mockResolvedValue({ ...cadastroPendente, status: 'APROVADO' }),
      },
    })
  );
}

describe('CadastroPublicoService.aprovar — controle de privilégio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAprovarMock();
  });

  it('ADMIN global pode criar outro ADMIN', async () => {
    await expect(
      cadastroPublicoService.aprovar('cadastro-1', { papel: 'ADMIN' }, aprovadorAdmin)
    ).resolves.toBeDefined();
  });

  it('lança 403 quando PROFESSOR tenta criar ADMIN', async () => {
    await expect(
      cadastroPublicoService.aprovar('cadastro-1', { papel: 'ADMIN' }, aprovadorProfessor)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('lança 403 quando RECEPCIONISTA tenta criar ADMIN', async () => {
    await expect(
      cadastroPublicoService.aprovar('cadastro-1', { papel: 'ADMIN' }, aprovadorRecepcionista)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('lança 403 quando RECEPCIONISTA tenta criar PROFESSOR', async () => {
    await expect(
      cadastroPublicoService.aprovar('cadastro-1', { papel: 'PROFESSOR' }, aprovadorRecepcionista)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('lança 403 quando RECEPCIONISTA tenta criar RECEPCIONISTA', async () => {
    await expect(
      cadastroPublicoService.aprovar('cadastro-1', { papel: 'RECEPCIONISTA' }, aprovadorRecepcionista)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('PROFESSOR pode criar ALUNO', async () => {
    await expect(
      cadastroPublicoService.aprovar('cadastro-1', { papel: 'ALUNO' }, aprovadorProfessor)
    ).resolves.toBeDefined();
  });

  it('ADMIN pode criar PROFESSOR', async () => {
    await expect(
      cadastroPublicoService.aprovar('cadastro-1', { papel: 'PROFESSOR', academiaId: 'academia-1' }, aprovadorAdmin)
    ).resolves.toBeDefined();
  });
});

describe('CadastroPublicoService.aprovar — isolamento de academia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAprovarMock();
  });

  it('lança 403 quando não-admin tenta criar usuário em outra academia', async () => {
    await expect(
      cadastroPublicoService.aprovar(
        'cadastro-1',
        { papel: 'ALUNO', academiaId: 'academia-OUTRA' },
        aprovadorProfessor // está vinculado a academia-1
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('PROFESSOR pode criar ALUNO na sua própria academia', async () => {
    await expect(
      cadastroPublicoService.aprovar(
        'cadastro-1',
        { papel: 'ALUNO', academiaId: 'academia-1' },
        aprovadorProfessor
      )
    ).resolves.toBeDefined();
  });
});

describe('CadastroPublicoService.aprovar — faixa sempre BRANCA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.cadastroPendente.findUnique).mockResolvedValue(cadastroPendente as any);
    vi.mocked(prisma.pessoa.findUnique).mockResolvedValue(null);
  });

  it('novo aluno sempre é criado com faixa BRANCA e 0 graus independente do input', async () => {
    let alunoCreatedWith: any;
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) =>
      cb({
        pessoa: { create: vi.fn().mockResolvedValue({ id: 'p-1' }) },
        aluno: {
          create: vi.fn().mockImplementation((args: any) => {
            alunoCreatedWith = args.data;
            return Promise.resolve({ id: 'aluno-novo', ...args.data });
          }),
        },
        usuario: { create: vi.fn().mockResolvedValue({ id: 'u-1' }) },
        cadastroPendente: { update: vi.fn().mockResolvedValue({}) },
      })
    );

    await cadastroPublicoService.aprovar('cadastro-1', { papel: 'ALUNO' }, aprovadorAdmin);

    expect(alunoCreatedWith.faixa).toBe('BRANCA');
    expect(alunoCreatedWith.graus).toBe(0);
  });
});

describe('CadastroPublicoService.rejeitar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.cadastroPendente.findUnique).mockResolvedValue(cadastroPendente as any);
    vi.mocked(prisma.cadastroPendente.update).mockResolvedValue({
      ...cadastroPendente,
      status: 'REJEITADO',
    } as any);
  });

  it('rejeita cadastro PENDENTE com motivo', async () => {
    const resultado = await cadastroPublicoService.rejeitar(
      'cadastro-1',
      'Turmas encerradas para a modalidade',
      'admin-1'
    );

    expect(vi.mocked(prisma.cadastroPendente.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REJEITADO' }),
      })
    );
  });

  it('lança erro quando cadastro não está PENDENTE', async () => {
    vi.mocked(prisma.cadastroPendente.findUnique).mockResolvedValue({
      ...cadastroPendente,
      status: 'APROVADO',
    } as any);

    await expect(
      cadastroPublicoService.rejeitar('cadastro-1', 'motivo', 'admin-1')
    ).rejects.toThrow('Este cadastro já foi processado');
  });
});
