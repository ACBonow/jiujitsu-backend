import { prisma } from '@/config/database';
import { ApiError } from '@/shared/utils/api-error';
import { PaginationParams, getPaginationParams } from '@/shared/utils/pagination';
import { startOfDay, endOfDay } from 'date-fns';
import { CreatePresencaInput, RegistrarPresencasEmLoteInput } from './presencas.schemas';
import { PresencaResponse, PresencaListResponse } from './presencas.types';

interface PresencaFilters extends PaginationParams {
  aulaId?: string;
  alunoId?: string;
  academiaId?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

export class PresencasService {
  async findAll(
    params: PresencaFilters
  ): Promise<{ data: PresencaResponse[]; total: number }> {
    const { skip, take } = getPaginationParams(params);

    const where: any = {};

    if (params.aulaId) where.aulaId = params.aulaId;
    if (params.alunoId) where.alunoId = params.alunoId;
    if (params.academiaId) {
      where.aula = { academiaId: params.academiaId };
    }

    if (params.dataInicio || params.dataFim) {
      where.dataRegistro = {};
      if (params.dataInicio) where.dataRegistro.gte = startOfDay(params.dataInicio);
      if (params.dataFim) where.dataRegistro.lte = endOfDay(params.dataFim);
    }

    const [presencas, total] = await Promise.all([
      prisma.presenca.findMany({
        where,
        skip,
        take,
        orderBy: { dataRegistro: 'desc' },
        include: {
          aula: {
            select: {
              id: true,
              dataHora: true,
              categoria: true,
              modalidade: true,
              academia: { select: { id: true, nome: true } },
            },
          },
          aluno: {
            select: {
              id: true,
              pessoa: { select: { nome: true } },
            },
          },
          registradoPor: {
            select: {
              id: true,
              pessoa: { select: { nome: true } },
            },
          },
        },
      }),
      prisma.presenca.count({ where }),
    ]);

    return { data: presencas as unknown as PresencaResponse[], total };
  }

  async findByAula(aulaId: string): Promise<PresencaListResponse[]> {
    const aula = await prisma.aula.findUnique({ where: { id: aulaId } });
    if (!aula) throw ApiError.notFound('Aula não encontrada');

    const presencas = await prisma.presenca.findMany({
      where: { aulaId },
      orderBy: { aluno: { pessoa: { nome: 'asc' } } },
      select: {
        id: true,
        dataRegistro: true,
        aluno: {
          select: {
            id: true,
            pessoa: { select: { nome: true } },
          },
        },
      },
    });

    return presencas;
  }

  async findById(id: string): Promise<PresencaResponse> {
    const presenca = await prisma.presenca.findUnique({
      where: { id },
      include: {
        aula: {
          select: {
            id: true,
            dataHora: true,
            categoria: true,
            modalidade: true,
            academia: { select: { id: true, nome: true } },
          },
        },
        aluno: {
          select: {
            id: true,
            pessoa: { select: { nome: true } },
          },
        },
        registradoPor: {
          select: {
            id: true,
            pessoa: { select: { nome: true } },
          },
        },
      },
    });

    if (!presenca) {
      throw ApiError.notFound('Presença não encontrada');
    }

    return presenca as unknown as PresencaResponse;
  }

  async create(data: CreatePresencaInput, usuarioId: string): Promise<PresencaResponse> {
    // Verificar se aula existe
    const aula = await prisma.aula.findUnique({ where: { id: data.aulaId } });
    if (!aula) throw ApiError.notFound('Aula não encontrada');

    // Verificar se a aula não está cancelada
    if (aula.status === 'CANCELADA') {
      throw ApiError.badRequest('Não é possível registrar presença em aula cancelada');
    }

    // Verificar se aluno existe
    const aluno = await prisma.aluno.findUnique({ where: { id: data.alunoId } });
    if (!aluno) throw ApiError.notFound('Aluno não encontrado');

    // Verificar se já existe presença para este aluno nesta aula
    const existingPresenca = await prisma.presenca.findUnique({
      where: {
        aulaId_alunoId: {
          aulaId: data.aulaId,
          alunoId: data.alunoId,
        },
      },
    });

    if (existingPresenca) {
      throw ApiError.conflict('Presença já registrada para este aluno nesta aula');
    }

    // Registrar presença e incrementar contador de aulas desde promoção
    const presenca = await prisma.$transaction(async (tx) => {
      // Criar presença
      const novaPresenca = await tx.presenca.create({
        data: {
          aulaId: data.aulaId,
          alunoId: data.alunoId,
          registradoPorId: usuarioId,
        },
        include: {
          aula: {
            select: {
              id: true,
              dataHora: true,
              categoria: true,
              modalidade: true,
              academia: { select: { id: true, nome: true } },
            },
          },
          aluno: {
            select: {
              id: true,
              pessoa: { select: { nome: true } },
            },
          },
          registradoPor: {
            select: {
              id: true,
              pessoa: { select: { nome: true } },
            },
          },
        },
      });

      // Incrementar contador de aulas desde promoção
      await tx.aluno.update({
        where: { id: data.alunoId },
        data: {
          aulasDesdePromocao: { increment: 1 },
        },
      });

      // Se o aluno tinha reserva confirmada, atualizar status da reserva
      await tx.reserva.updateMany({
        where: {
          aulaId: data.aulaId,
          alunoId: data.alunoId,
          status: 'CONFIRMADA',
        },
        data: { status: 'CONFIRMADA' }, // Mantém confirmada (presença registrada)
      });

      return novaPresenca;
    });

    return presenca as unknown as PresencaResponse;
  }

  async registrarEmLote(
    data: RegistrarPresencasEmLoteInput,
    usuarioId: string
  ): Promise<{ registradas: number; jaExistentes: number }> {
    // Verificar se aula existe
    const aula = await prisma.aula.findUnique({ where: { id: data.aulaId } });
    if (!aula) throw ApiError.notFound('Aula não encontrada');

    if (aula.status === 'CANCELADA') {
      throw ApiError.badRequest('Não é possível registrar presença em aula cancelada');
    }

    // Verificar presenças já existentes
    const presencasExistentes = await prisma.presenca.findMany({
      where: {
        aulaId: data.aulaId,
        alunoId: { in: data.alunoIds },
      },
      select: { alunoId: true },
    });

    const alunosJaComPresenca = new Set(presencasExistentes.map((p) => p.alunoId));
    const alunosParaRegistrar = data.alunoIds.filter((id) => !alunosJaComPresenca.has(id));

    if (alunosParaRegistrar.length === 0) {
      return {
        registradas: 0,
        jaExistentes: presencasExistentes.length,
      };
    }

    // Registrar presenças em lote
    await prisma.$transaction(async (tx) => {
      // Criar presenças
      await tx.presenca.createMany({
        data: alunosParaRegistrar.map((alunoId) => ({
          aulaId: data.aulaId,
          alunoId,
          registradoPorId: usuarioId,
        })),
      });

      // Incrementar contador de aulas para cada aluno
      await tx.aluno.updateMany({
        where: { id: { in: alunosParaRegistrar } },
        data: {
          aulasDesdePromocao: { increment: 1 },
        },
      });

      // Atualizar reservas confirmadas
      await tx.reserva.updateMany({
        where: {
          aulaId: data.aulaId,
          alunoId: { in: alunosParaRegistrar },
          status: 'CONFIRMADA',
        },
        data: { status: 'CONFIRMADA' },
      });
    });

    return {
      registradas: alunosParaRegistrar.length,
      jaExistentes: presencasExistentes.length,
    };
  }

  async delete(id: string): Promise<void> {
    const presenca = await prisma.presenca.findUnique({
      where: { id },
      include: { aula: true },
    });

    if (!presenca) {
      throw ApiError.notFound('Presença não encontrada');
    }

    // Se a aula já foi concluída, não permitir excluir presença
    if (presenca.aula.status === 'CONCLUIDA') {
      throw ApiError.badRequest('Não é possível remover presença de aula já concluída');
    }

    // Excluir presença e decrementar contador
    await prisma.$transaction(async (tx) => {
      await tx.presenca.delete({ where: { id } });

      await tx.aluno.update({
        where: { id: presenca.alunoId },
        data: {
          aulasDesdePromocao: { decrement: 1 },
        },
      });
    });
  }
}

export const presencasService = new PresencasService();
