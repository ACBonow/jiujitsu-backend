import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../config/database';

vi.mock('../../../config/database', () => ({
  prisma: {
    aula: { findUnique: vi.fn() },
    aluno: { findUnique: vi.fn() },
    matricula: { findFirst: vi.fn() },
    presenca: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
    reserva: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const { presencasService } = await import('../../../modules/presencas/presencas.service');

const aulaEmAndamento = { id: 'aula-1', status: 'EM_ANDAMENTO', academiaId: 'academia-1' };
const aulaConcluida = { id: 'aula-2', status: 'CONCLUIDA', academiaId: 'academia-1' };
const aulaAgendada = { id: 'aula-3', status: 'AGENDADA', academiaId: 'academia-1' };
const aulaCancelada = { id: 'aula-4', status: 'CANCELADA', academiaId: 'academia-1' };

const presencaCriada = {
  id: 'presenca-1',
  dataRegistro: new Date(),
  aula: aulaEmAndamento,
  aluno: { id: 'aluno-1', pessoa: { nome: 'João' } },
  registradoPor: { id: 'user-1', pessoa: { nome: 'Prof' } },
};

function setupDefaultTx(txOverrides = {}) {
  vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) =>
    cb({
      presenca: {
        create: vi.fn().mockResolvedValue(presencaCriada),
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      aluno: { update: vi.fn().mockResolvedValue({}), updateMany: vi.fn() },
      reserva: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      ...txOverrides,
    })
  );
}

describe('PresencasService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.aluno.findUnique).mockResolvedValue({ id: 'aluno-1' } as any);
    vi.mocked(prisma.matricula.findFirst).mockResolvedValue({ id: 'mat-1' } as any);
    vi.mocked(prisma.presenca.findUnique).mockResolvedValue(null);
    setupDefaultTx();
  });

  it('registra presença em aula EM_ANDAMENTO', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue(aulaEmAndamento as any);

    const result = await presencasService.create(
      { aulaId: 'aula-1', alunoId: 'aluno-1' },
      'user-1'
    );

    expect(result).toBeDefined();
    expect(vi.mocked(prisma.$transaction)).toHaveBeenCalled();
  });

  it('registra presença em aula CONCLUIDA', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue(aulaConcluida as any);

    await expect(
      presencasService.create({ aulaId: 'aula-2', alunoId: 'aluno-1' }, 'user-1')
    ).resolves.toBeDefined();
  });

  it('lança 422 quando aula está AGENDADA', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue(aulaAgendada as any);

    await expect(
      presencasService.create({ aulaId: 'aula-3', alunoId: 'aluno-1' }, 'user-1')
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('lança 422 quando aula está CANCELADA', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue(aulaCancelada as any);

    await expect(
      presencasService.create({ aulaId: 'aula-4', alunoId: 'aluno-1' }, 'user-1')
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('lança 404 quando aula não existe', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue(null);

    await expect(
      presencasService.create({ aulaId: 'xxx', alunoId: 'aluno-1' }, 'user-1')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lança 404 quando aluno não existe', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue(aulaEmAndamento as any);
    vi.mocked(prisma.aluno.findUnique).mockResolvedValue(null);

    await expect(
      presencasService.create({ aulaId: 'aula-1', alunoId: 'xxx' }, 'user-1')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lança 422 quando aluno não tem matrícula ativa na academia', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue(aulaEmAndamento as any);
    vi.mocked(prisma.matricula.findFirst).mockResolvedValue(null);

    await expect(
      presencasService.create({ aulaId: 'aula-1', alunoId: 'aluno-1' }, 'user-1')
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('lança 409 quando presença já existe para este aluno nesta aula', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue(aulaEmAndamento as any);
    vi.mocked(prisma.presenca.findUnique).mockResolvedValue({ id: 'presenca-existente' } as any);

    await expect(
      presencasService.create({ aulaId: 'aula-1', alunoId: 'aluno-1' }, 'user-1')
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('PresencasService.registrarEmLote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.matricula.findFirst).mockResolvedValue({ id: 'mat-1' } as any);
    vi.mocked(prisma.presenca.findMany).mockResolvedValue([]);
    setupDefaultTx();
  });

  it('lança 422 quando aula está AGENDADA', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue(aulaAgendada as any);

    await expect(
      presencasService.registrarEmLote(
        { aulaId: 'aula-3', alunoIds: ['aluno-1', 'aluno-2'] },
        'user-1'
      )
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('registra apenas alunos sem presença existente (idempotente)', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue(aulaEmAndamento as any);
    // aluno-1 já tem presença, aluno-2 não
    vi.mocked(prisma.presenca.findMany).mockResolvedValue([{ alunoId: 'aluno-1' }] as any);

    setupDefaultTx();

    const result = await presencasService.registrarEmLote(
      { aulaId: 'aula-1', alunoIds: ['aluno-1', 'aluno-2'] },
      'user-1'
    );

    expect(result.jaExistentes).toBe(1);
    expect(result.registradas).toBe(1);
  });

  it('retorna 0 registradas quando todos já têm presença', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue(aulaEmAndamento as any);
    vi.mocked(prisma.presenca.findMany).mockResolvedValue([
      { alunoId: 'aluno-1' },
      { alunoId: 'aluno-2' },
    ] as any);

    const result = await presencasService.registrarEmLote(
      { aulaId: 'aula-1', alunoIds: ['aluno-1', 'aluno-2'] },
      'user-1'
    );

    expect(result.registradas).toBe(0);
    expect(result.jaExistentes).toBe(2);
    expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled();
  });
});
