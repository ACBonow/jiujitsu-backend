import { prisma } from '../../config/database';
import { ApiError } from '../../shared/utils/api-error';
import { PaginationInput, getPaginationParams } from '../../shared/utils/pagination';
import { StatusReserva } from '@prisma/client';
import { addMinutes, startOfDay, endOfDay } from 'date-fns';
import { CreateReservaInput } from './reservas.schemas';
import { ReservaResponse, ReservaListResponse } from './reservas.types';

const TEMPO_EXPIRACAO_MINUTOS = 15;

interface ReservaFilters extends PaginationInput {
  aulaId?: string;
  alunoId?: string;
  status?: StatusReserva;
  dataInicio?: Date;
  dataFim?: Date;
}

export class ReservasService {
  /**
   * Lazy check: verifica e expira reservas vencidas de uma aula específica.
   * Chamado automaticamente antes de operações de leitura/escrita.
   */
  private async verificarReservasExpiradas(aulaId: string): Promise<void> {
    const agora = new Date();

    // Buscar reservas expiradas desta aula
    const reservasExpiradas = await prisma.reserva.findMany({
      where: {
        aulaId,
        status: 'CONFIRMADA',
        dataExpiracao: { lt: agora, not: null },
      },
    });

    if (reservasExpiradas.length === 0) return;

    // Expirar e promover próximos da fila em transação
    await prisma.$transaction(async (tx) => {
      // Marcar como expiradas
      await tx.reserva.updateMany({
        where: {
          id: { in: reservasExpiradas.map((r) => r.id) },
        },
        data: { status: 'EXPIRADA' },
      });

      // Promover próximos da fila (um para cada vaga liberada)
      for (let i = 0; i < reservasExpiradas.length; i++) {
        const proximoDaFila = await tx.reserva.findFirst({
          where: {
            aulaId,
            status: 'ESPERA',
          },
          orderBy: { posicaoFila: 'asc' },
        });

        if (proximoDaFila) {
          await tx.reserva.update({
            where: { id: proximoDaFila.id },
            data: {
              status: 'CONFIRMADA',
              posicaoFila: null,
              dataConfirmacao: new Date(),
              dataExpiracao: addMinutes(new Date(), TEMPO_EXPIRACAO_MINUTOS),
            },
          });
        }
      }

      // Reorganizar posições na fila
      const reservasEmEspera = await tx.reserva.findMany({
        where: { aulaId, status: 'ESPERA' },
        orderBy: { posicaoFila: 'asc' },
      });

      for (let i = 0; i < reservasEmEspera.length; i++) {
        await tx.reserva.update({
          where: { id: reservasEmEspera[i].id },
          data: { posicaoFila: i + 1 },
        });
      }
    });
  }

  async findAll(
    params: ReservaFilters
  ): Promise<{ data: ReservaResponse[]; total: number }> {
    // Verificação lazy: se filtrar por aulaId, verifica expiradas primeiro
    if (params.aulaId) {
      await this.verificarReservasExpiradas(params.aulaId);
    }

    const { skip, take } = getPaginationParams(params);

    const where: any = {};

    if (params.aulaId) where.aulaId = params.aulaId;
    if (params.alunoId) where.alunoId = params.alunoId;
    if (params.status) where.status = params.status;

    if (params.dataInicio || params.dataFim) {
      where.aula = {
        dataHora: {},
      };
      if (params.dataInicio) where.aula.dataHora.gte = startOfDay(params.dataInicio);
      if (params.dataFim) where.aula.dataHora.lte = endOfDay(params.dataFim);
    }

    const [reservas, total] = await Promise.all([
      prisma.reserva.findMany({
        where,
        skip,
        take,
        orderBy: [{ aula: { dataHora: 'asc' } }, { posicaoFila: 'asc' }],
        include: {
          aula: {
            select: {
              id: true,
              dataHora: true,
              categoria: true,
              modalidade: true,
              limiteAlunos: true,
              academia: { select: { id: true, nome: true } },
              professor: { select: { pessoa: { select: { nome: true } } } },
            },
          },
          aluno: {
            select: {
              id: true,
              pessoa: { select: { nome: true } },
            },
          },
        },
      }),
      prisma.reserva.count({ where }),
    ]);

    return { data: reservas as unknown as ReservaResponse[], total };
  }

  async findByAula(aulaId: string): Promise<ReservaListResponse[]> {
    const aula = await prisma.aula.findUnique({ where: { id: aulaId } });
    if (!aula) throw ApiError.notFound('Aula não encontrada');

    // Verificação lazy: expira reservas vencidas antes de listar
    await this.verificarReservasExpiradas(aulaId);

    const reservas = await prisma.reserva.findMany({
      where: { aulaId },
      orderBy: [{ status: 'asc' }, { posicaoFila: 'asc' }],
      select: {
        id: true,
        status: true,
        posicaoFila: true,
        dataReserva: true,
        aluno: {
          select: {
            id: true,
            pessoa: { select: { nome: true } },
          },
        },
      },
    });

    return reservas;
  }

  async findById(id: string): Promise<ReservaResponse> {
    const reserva = await prisma.reserva.findUnique({
      where: { id },
      include: {
        aula: {
          select: {
            id: true,
            dataHora: true,
            categoria: true,
            modalidade: true,
            limiteAlunos: true,
            academia: { select: { id: true, nome: true } },
            professor: { select: { pessoa: { select: { nome: true } } } },
          },
        },
        aluno: {
          select: {
            id: true,
            pessoa: { select: { nome: true } },
          },
        },
      },
    });

    if (!reserva) {
      throw ApiError.notFound('Reserva não encontrada');
    }

    // Verificação lazy: expira reservas vencidas da mesma aula
    await this.verificarReservasExpiradas(reserva.aulaId);

    // Buscar novamente caso a reserva tenha sido atualizada
    const reservaAtualizada = await prisma.reserva.findUnique({
      where: { id },
      include: {
        aula: {
          select: {
            id: true,
            dataHora: true,
            categoria: true,
            modalidade: true,
            limiteAlunos: true,
            academia: { select: { id: true, nome: true } },
            professor: { select: { pessoa: { select: { nome: true } } } },
          },
        },
        aluno: {
          select: {
            id: true,
            pessoa: { select: { nome: true } },
          },
        },
      },
    });

    return reservaAtualizada as unknown as ReservaResponse;
  }

  async create(data: CreateReservaInput): Promise<ReservaResponse> {
    // Verificar se aula existe
    const aula = await prisma.aula.findUnique({
      where: { id: data.aulaId },
      include: {
        _count: {
          select: {
            reservas: {
              where: { status: { in: ['CONFIRMADA', 'ESPERA'] } },
            },
          },
        },
      },
    });

    if (!aula) throw ApiError.notFound('Aula não encontrada');

    // Verificar se a aula não está cancelada
    if (aula.status === 'CANCELADA') {
      throw ApiError.badRequest('Não é possível fazer reserva em aula cancelada');
    }

    // Verificar se a aula não é passada
    if (aula.dataHora < new Date()) {
      throw ApiError.badRequest('Não é possível fazer reserva em aula passada');
    }

    // Verificar se aluno existe
    const aluno = await prisma.aluno.findUnique({ where: { id: data.alunoId } });
    if (!aluno) throw ApiError.notFound('Aluno não encontrado');

    // Verificar se já existe reserva para este aluno nesta aula
    const existingReserva = await prisma.reserva.findUnique({
      where: {
        aulaId_alunoId: {
          aulaId: data.aulaId,
          alunoId: data.alunoId,
        },
      },
    });

    if (existingReserva) {
      throw ApiError.conflict('Já existe uma reserva para este aluno nesta aula');
    }

    // Verificação lazy: expira reservas vencidas antes de contar vagas
    await this.verificarReservasExpiradas(data.aulaId);

    // Contar reservas confirmadas
    const reservasConfirmadas = await prisma.reserva.count({
      where: {
        aulaId: data.aulaId,
        status: 'CONFIRMADA',
      },
    });

    // Determinar status e posição
    let status: StatusReserva = 'CONFIRMADA';
    let posicaoFila: number | null = null;

    if (aula.limiteAlunos && reservasConfirmadas >= aula.limiteAlunos) {
      // Aula lotada, vai para lista de espera
      status = 'ESPERA';
      const ultimaPosicao = await prisma.reserva.findFirst({
        where: { aulaId: data.aulaId, status: 'ESPERA' },
        orderBy: { posicaoFila: 'desc' },
        select: { posicaoFila: true },
      });
      posicaoFila = (ultimaPosicao?.posicaoFila || 0) + 1;
    }

    const reserva = await prisma.reserva.create({
      data: {
        aulaId: data.aulaId,
        alunoId: data.alunoId,
        status,
        posicaoFila,
        dataConfirmacao: status === 'CONFIRMADA' ? new Date() : null,
      },
      include: {
        aula: {
          select: {
            id: true,
            dataHora: true,
            categoria: true,
            modalidade: true,
            limiteAlunos: true,
            academia: { select: { id: true, nome: true } },
            professor: { select: { pessoa: { select: { nome: true } } } },
          },
        },
        aluno: {
          select: {
            id: true,
            pessoa: { select: { nome: true } },
          },
        },
      },
    });

    return reserva as unknown as ReservaResponse;
  }

  async cancelar(id: string): Promise<ReservaResponse> {
    const reserva = await prisma.reserva.findUnique({
      where: { id },
      include: { aula: true },
    });

    if (!reserva) {
      throw ApiError.notFound('Reserva não encontrada');
    }

    if (reserva.status === 'CANCELADA') {
      throw ApiError.badRequest('Reserva já está cancelada');
    }

    // Se a aula já ocorreu, não pode cancelar
    if (reserva.aula.dataHora < new Date()) {
      throw ApiError.badRequest('Não é possível cancelar reserva de aula passada');
    }

    const reservaAtualizada = await prisma.$transaction(async (tx) => {
      // Cancelar reserva
      const updated = await tx.reserva.update({
        where: { id },
        data: { status: 'CANCELADA' },
        include: {
          aula: {
            select: {
              id: true,
              dataHora: true,
              categoria: true,
              modalidade: true,
              limiteAlunos: true,
              academia: { select: { id: true, nome: true } },
              professor: { select: { pessoa: { select: { nome: true } } } },
            },
          },
          aluno: {
            select: {
              id: true,
              pessoa: { select: { nome: true } },
            },
          },
        },
      });

      // Se era uma reserva confirmada, promover próximo da lista de espera
      if (reserva.status === 'CONFIRMADA') {
        const proximoDaFila = await tx.reserva.findFirst({
          where: {
            aulaId: reserva.aulaId,
            status: 'ESPERA',
          },
          orderBy: { posicaoFila: 'asc' },
        });

        if (proximoDaFila) {
          await tx.reserva.update({
            where: { id: proximoDaFila.id },
            data: {
              status: 'CONFIRMADA',
              posicaoFila: null,
              dataConfirmacao: new Date(),
              dataExpiracao: addMinutes(new Date(), TEMPO_EXPIRACAO_MINUTOS),
            },
          });

          // Reorganizar posições na fila
          await tx.$executeRaw`
            UPDATE reservas
            SET posicao_fila = posicao_fila - 1
            WHERE aula_id = ${reserva.aulaId}
            AND status = 'ESPERA'
            AND posicao_fila > ${proximoDaFila.posicaoFila}
          `;
        }
      }

      return updated;
    });

    return reservaAtualizada as unknown as ReservaResponse;
  }

  async confirmarReserva(id: string): Promise<ReservaResponse> {
    const reserva = await prisma.reserva.findUnique({
      where: { id },
    });

    if (!reserva) {
      throw ApiError.notFound('Reserva não encontrada');
    }

    if (reserva.status !== 'ESPERA') {
      throw ApiError.badRequest('Apenas reservas em espera podem ser confirmadas manualmente');
    }

    const reservaAtualizada = await prisma.reserva.update({
      where: { id },
      data: {
        status: 'CONFIRMADA',
        posicaoFila: null,
        dataConfirmacao: new Date(),
      },
      include: {
        aula: {
          select: {
            id: true,
            dataHora: true,
            categoria: true,
            modalidade: true,
            limiteAlunos: true,
            academia: { select: { id: true, nome: true } },
            professor: { select: { pessoa: { select: { nome: true } } } },
          },
        },
        aluno: {
          select: {
            id: true,
            pessoa: { select: { nome: true } },
          },
        },
      },
    });

    return reservaAtualizada as unknown as ReservaResponse;
  }

  async delete(id: string): Promise<void> {
    const reserva = await prisma.reserva.findUnique({ where: { id } });

    if (!reserva) {
      throw ApiError.notFound('Reserva não encontrada');
    }

    await prisma.reserva.delete({ where: { id } });
  }
}

export const reservasService = new ReservasService();
