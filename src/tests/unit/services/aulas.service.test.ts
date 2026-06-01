import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../config/database';

vi.mock('../../../config/database', () => ({
  prisma: {
    aula: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    templateAula: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const { aulasService } = await import('../../../modules/aulas/aulas.service');

const aulaRetorno = {
  id: 'aula-1',
  status: 'CONCLUIDA',
  academia: { id: 'academia-1', nome: 'Academia Teste' },
  professor: { id: 'prof-1', pessoa: { nome: 'Prof Silva' } },
};

describe('AulasService.iniciarAula', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muda status de AGENDADA para EM_ANDAMENTO', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue({ id: 'aula-1', status: 'AGENDADA' } as any);
    vi.mocked(prisma.aula.update).mockResolvedValue({
      ...aulaRetorno,
      status: 'EM_ANDAMENTO',
    } as any);

    const result = await aulasService.iniciarAula('aula-1');
    expect(result.status).toBe('EM_ANDAMENTO');
    expect(vi.mocked(prisma.aula.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'EM_ANDAMENTO' } })
    );
  });

  it('lança 400 quando aula já está EM_ANDAMENTO', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue({
      id: 'aula-1',
      status: 'EM_ANDAMENTO',
    } as any);

    await expect(aulasService.iniciarAula('aula-1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('lança 400 quando aula está CONCLUIDA', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue({ id: 'aula-1', status: 'CONCLUIDA' } as any);

    await expect(aulasService.iniciarAula('aula-1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('lança 404 quando aula não existe', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue(null);

    await expect(aulasService.iniciarAula('aula-xxx')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('AulasService.concluirAula', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.aula.findUnique).mockResolvedValue({ id: 'aula-1', status: 'EM_ANDAMENTO' } as any);
  });

  it('conclui aula EM_ANDAMENTO com sucesso', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) =>
      cb({
        presenca: { findMany: vi.fn().mockResolvedValue([]) },
        reserva: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        aula: { update: vi.fn().mockResolvedValue(aulaRetorno) },
      })
    );

    const result = await aulasService.concluirAula('aula-1');
    expect(result.status).toBe('CONCLUIDA');
  });

  it('lança 422 quando aula está AGENDADA (não pode pular EM_ANDAMENTO)', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue({ id: 'aula-1', status: 'AGENDADA' } as any);

    await expect(aulasService.concluirAula('aula-1')).rejects.toMatchObject({ statusCode: 422 });
  });

  it('lança 422 quando aula já está CONCLUIDA', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue({ id: 'aula-1', status: 'CONCLUIDA' } as any);

    await expect(aulasService.concluirAula('aula-1')).rejects.toMatchObject({ statusCode: 422 });
  });

  it('marca FALTOU apenas para quem não compareceu', async () => {
    const mockUpdateMany = vi.fn().mockResolvedValue({ count: 1 });

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) =>
      cb({
        presenca: {
          findMany: vi.fn().mockResolvedValue([
            { alunoId: 'aluno-compareceu' },
          ]),
        },
        reserva: { updateMany: mockUpdateMany },
        aula: { update: vi.fn().mockResolvedValue(aulaRetorno) },
      })
    );

    await aulasService.concluirAula('aula-1');

    // Deve excluir aluno-compareceu do updateMany de FALTOU
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          alunoId: { notIn: ['aluno-compareceu'] },
        }),
        data: { status: 'FALTOU' },
      })
    );
  });

  it('não passa alunoId.notIn quando ninguém compareceu', async () => {
    const mockUpdateMany = vi.fn().mockResolvedValue({ count: 2 });

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) =>
      cb({
        presenca: { findMany: vi.fn().mockResolvedValue([]) }, // ninguém compareceu
        reserva: { updateMany: mockUpdateMany },
        aula: { update: vi.fn().mockResolvedValue(aulaRetorno) },
      })
    );

    await aulasService.concluirAula('aula-1');

    // Com idsComPresenca.length === 0, não deve adicionar notIn
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ alunoId: expect.anything() }),
      })
    );
  });

  it('lança 404 quando aula não existe', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue(null);

    await expect(aulasService.concluirAula('aula-xxx')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('AulasService.cancelarAula', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cancela aula AGENDADA', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue({ id: 'aula-1', status: 'AGENDADA' } as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) =>
      cb({
        reserva: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        aula: { update: vi.fn().mockResolvedValue({ ...aulaRetorno, status: 'CANCELADA' }) },
      })
    );

    const result = await aulasService.cancelarAula('aula-1');
    expect(result.status).toBe('CANCELADA');
  });

  it('lança 400 quando aula já está CONCLUIDA', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue({ id: 'aula-1', status: 'CONCLUIDA' } as any);

    await expect(aulasService.cancelarAula('aula-1')).rejects.toMatchObject({ statusCode: 400 });
  });
});
