import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../config/database';
import { ApiError } from '../../../shared/utils/api-error';
import { CONSTANTS } from '../../../config/constants';

vi.mock('../../../config/database', () => ({
  prisma: {
    reserva: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    aula: { findUnique: vi.fn() },
    aluno: { findUnique: vi.fn() },
    matricula: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// Importar após o mock
const { reservasService } = await import('../../../modules/reservas/reservas.service');

// Dados de apoio reutilizáveis
const aulaBase = {
  id: 'aula-1',
  status: 'AGENDADA',
  dataHora: new Date(Date.now() + 3600_000), // 1h no futuro
  academiaId: 'academia-1',
  limiteAlunos: 20,
};

const alunoBase = {
  id: 'aluno-1',
  faltasReservas: 0,
  pessoa: { usuario: { id: 'usuario-aluno-1', academiaId: 'academia-1' } },
};

const userAdmin = { id: 'user-admin', perfil: 'ADMIN' as const, academiaId: undefined };
const userAluno = { id: 'usuario-aluno-1', perfil: 'ALUNO' as const, academiaId: 'academia-1' };
const userProfessor = { id: 'user-prof', perfil: 'PROFESSOR' as const, academiaId: 'academia-1' };
const userOutraAcademia = { id: 'user-ext', perfil: 'PROFESSOR' as const, academiaId: 'academia-2' };

function setupDefaultMocks() {
  vi.mocked(prisma.reserva.findMany).mockResolvedValue([]); // sem reservas expiradas
  vi.mocked(prisma.aula.findUnique).mockResolvedValue(aulaBase as any);
  vi.mocked(prisma.aluno.findUnique).mockResolvedValue(alunoBase as any);
  vi.mocked(prisma.matricula.findFirst).mockResolvedValue({ id: 'mat-1' } as any);
  vi.mocked(prisma.reserva.findUnique).mockResolvedValue(null); // sem reserva existente
  vi.mocked(prisma.reserva.count).mockResolvedValue(5); // 5 confirmadas (< 20)
  vi.mocked(prisma.reserva.findFirst).mockResolvedValue(null); // fila vazia
  vi.mocked(prisma.reserva.create).mockResolvedValue({
    id: 'reserva-nova',
    status: 'CONFIRMADA',
    dataExpiracao: new Date(),
    aula: aulaBase,
    aluno: { id: 'aluno-1', pessoa: { nome: 'João' } },
  } as any);
  vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) =>
    cb({
      reserva: {
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      aluno: { update: vi.fn().mockResolvedValue({}) },
    })
  );
}

describe('ReservasService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('cria reserva CONFIRMADA com dataExpiracao quando há vaga', async () => {
    const result = await reservasService.create(
      { aulaId: 'aula-1', alunoId: 'aluno-1' },
      userAdmin
    );

    expect(result.status).toBe('CONFIRMADA');
    expect(vi.mocked(prisma.reserva.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CONFIRMADA',
          dataExpiracao: expect.any(Date),
        }),
      })
    );
  });

  it('cria reserva CONFIRMADA quando limiteAlunos é null (sem limite)', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue({
      ...aulaBase,
      limiteAlunos: null,
    } as any);

    await reservasService.create({ aulaId: 'aula-1', alunoId: 'aluno-1' }, userAdmin);

    // O count é chamado, mas o resultado é ignorado quando limiteAlunos é null
    // (condição: `if (aula.limiteAlunos && count >= limite)` → falsy quando null)
    expect(vi.mocked(prisma.reserva.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CONFIRMADA' }),
      })
    );
  });

  it('cria reserva ESPERA quando aula está lotada', async () => {
    vi.mocked(prisma.reserva.count).mockResolvedValue(20); // limite atingido
    vi.mocked(prisma.reserva.create).mockResolvedValue({
      id: 'reserva-espera',
      status: 'ESPERA',
      posicaoFila: 1,
      aula: aulaBase,
      aluno: { id: 'aluno-1', pessoa: { nome: 'João' } },
    } as any);

    const result = await reservasService.create(
      { aulaId: 'aula-1', alunoId: 'aluno-1' },
      userAdmin
    );

    expect(result.status).toBe('ESPERA');
    expect(vi.mocked(prisma.reserva.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ESPERA',
          dataExpiracao: null,
        }),
      })
    );
  });

  it('lança 422 quando aluno atingiu limite de faltas', async () => {
    vi.mocked(prisma.aluno.findUnique).mockResolvedValue({
      ...alunoBase,
      faltasReservas: CONSTANTS.LIMITE_FALTAS_RESERVA,
    } as any);

    await expect(
      reservasService.create({ aulaId: 'aula-1', alunoId: 'aluno-1' }, userAdmin)
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('lança 422 quando aluno não tem matrícula ativa na academia', async () => {
    vi.mocked(prisma.matricula.findFirst).mockResolvedValue(null);

    await expect(
      reservasService.create({ aulaId: 'aula-1', alunoId: 'aluno-1' }, userAdmin)
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('lança 403 quando ALUNO tenta criar reserva para outro aluno', async () => {
    vi.mocked(prisma.aluno.findUnique).mockResolvedValue({
      ...alunoBase,
      pessoa: { usuario: { id: 'outro-usuario', academiaId: 'academia-1' } },
    } as any);

    await expect(
      reservasService.create({ aulaId: 'aula-1', alunoId: 'aluno-1' }, userAluno)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('permite ALUNO criar reserva para si mesmo', async () => {
    await expect(
      reservasService.create({ aulaId: 'aula-1', alunoId: 'aluno-1' }, userAluno)
    ).resolves.toBeDefined();
  });

  it('lança 403 quando PROFESSOR tenta criar reserva em outra academia', async () => {
    await expect(
      reservasService.create({ aulaId: 'aula-1', alunoId: 'aluno-1' }, userOutraAcademia)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('lança 404 quando aula não existe', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue(null);

    await expect(
      reservasService.create({ aulaId: 'aula-xxx', alunoId: 'aluno-1' }, userAdmin)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lança 404 quando aluno não existe', async () => {
    vi.mocked(prisma.aluno.findUnique).mockResolvedValue(null);

    await expect(
      reservasService.create({ aulaId: 'aula-1', alunoId: 'aluno-xxx' }, userAdmin)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lança 400 quando aula está CANCELADA', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue({
      ...aulaBase,
      status: 'CANCELADA',
    } as any);

    await expect(
      reservasService.create({ aulaId: 'aula-1', alunoId: 'aluno-1' }, userAdmin)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('lança 400 quando aula já passou', async () => {
    vi.mocked(prisma.aula.findUnique).mockResolvedValue({
      ...aulaBase,
      dataHora: new Date(Date.now() - 3600_000), // 1h atrás
    } as any);

    await expect(
      reservasService.create({ aulaId: 'aula-1', alunoId: 'aluno-1' }, userAdmin)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('lança 409 quando reserva já existe para este aluno nesta aula', async () => {
    vi.mocked(prisma.reserva.findUnique).mockResolvedValue({ id: 'reserva-existente' } as any);

    await expect(
      reservasService.create({ aulaId: 'aula-1', alunoId: 'aluno-1' }, userAdmin)
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('ReservasService.cancelar', () => {
  const reservaConfirmadaBase = {
    id: 'reserva-1',
    status: 'CONFIRMADA',
    aulaId: 'aula-1',
    alunoId: 'aluno-1',
    aula: { ...aulaBase, dataHora: new Date(Date.now() + 3600_000) },
    aluno: { id: 'aluno-1', pessoa: { usuario: { id: 'usuario-aluno-1' } } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.reserva.findUnique).mockResolvedValue(reservaConfirmadaBase as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) =>
      cb({
        reserva: {
          update: vi.fn().mockResolvedValue({ ...reservaConfirmadaBase, status: 'CANCELADA' }),
          findFirst: vi.fn().mockResolvedValue(null),
        },
      })
    );
  });

  it('ALUNO pode cancelar sua própria reserva', async () => {
    await expect(reservasService.cancelar('reserva-1', userAluno)).resolves.toBeDefined();
  });

  it('lança 403 quando ALUNO tenta cancelar reserva de outro aluno', async () => {
    const userOutroAluno = { id: 'outro-usuario', perfil: 'ALUNO' as const, academiaId: 'academia-1' };

    await expect(reservasService.cancelar('reserva-1', userOutroAluno)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('PROFESSOR pode cancelar reserva de qualquer aluno da sua academia', async () => {
    await expect(reservasService.cancelar('reserva-1', userProfessor)).resolves.toBeDefined();
  });

  it('lança 403 quando PROFESSOR tenta cancelar reserva de outra academia', async () => {
    await expect(
      reservasService.cancelar('reserva-1', userOutraAcademia)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('lança 404 quando reserva não existe', async () => {
    vi.mocked(prisma.reserva.findUnique).mockResolvedValue(null);

    await expect(reservasService.cancelar('reserva-xxx', userAdmin)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('lança 400 quando a aula já passou', async () => {
    vi.mocked(prisma.reserva.findUnique).mockResolvedValue({
      ...reservaConfirmadaBase,
      aula: { ...aulaBase, dataHora: new Date(Date.now() - 3600_000) },
    } as any);

    await expect(reservasService.cancelar('reserva-1', userAdmin)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
