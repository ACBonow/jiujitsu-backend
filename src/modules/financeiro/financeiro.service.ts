import { prisma } from '../../config/database';
import { ApiError } from '../../shared/utils/api-error';
import { PaginationInput, getPaginationParams } from '../../shared/utils/pagination';
import { Modalidade, StatusMatricula, StatusMensalidade } from '@prisma/client';
import { setDate, addMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import {
  CreatePlanoInput,
  UpdatePlanoInput,
  CreateMatriculaInput,
  UpdateMatriculaInput,
  RegistrarPagamentoInput,
  GerarMensalidadesInput,
} from './financeiro.schemas';
import {
  PlanoResponse,
  MatriculaResponse,
  MatriculaListResponse,
  MensalidadeResponse,
  MensalidadeListResponse,
} from './financeiro.types';

// ==================== PLANO SERVICE ====================

interface PlanoFilters extends PaginationInput {
  ativo?: boolean;
  modalidade?: Modalidade;
}

export class PlanosService {
  async findAll(
    params: PlanoFilters
  ): Promise<{ data: PlanoResponse[]; total: number }> {
    const { skip, take } = getPaginationParams(params);

    const where: any = {};
    if (params.ativo !== undefined) where.ativo = params.ativo;
    if (params.modalidade) where.modalidades = { has: params.modalidade };

    const [planos, total] = await Promise.all([
      prisma.plano.findMany({
        where,
        skip,
        take,
        orderBy: { nome: 'asc' },
      }),
      prisma.plano.count({ where }),
    ]);

    return {
      data: planos.map((p) => ({ ...p, valorBase: Number(p.valorBase) })),
      total,
    };
  }

  async findById(id: string): Promise<PlanoResponse> {
    const plano = await prisma.plano.findUnique({ where: { id } });
    if (!plano) throw ApiError.notFound('Plano não encontrado');
    return { ...plano, valorBase: Number(plano.valorBase) };
  }

  async create(data: CreatePlanoInput): Promise<PlanoResponse> {
    const plano = await prisma.plano.create({ data });
    return { ...plano, valorBase: Number(plano.valorBase) };
  }

  async update(id: string, data: UpdatePlanoInput): Promise<PlanoResponse> {
    const existing = await prisma.plano.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Plano não encontrado');

    const plano = await prisma.plano.update({ where: { id }, data });
    return { ...plano, valorBase: Number(plano.valorBase) };
  }

  async delete(id: string): Promise<void> {
    const existing = await prisma.plano.findUnique({
      where: { id },
      include: { _count: { select: { matriculas: true } } },
    });

    if (!existing) throw ApiError.notFound('Plano não encontrado');
    if (existing._count.matriculas > 0) {
      throw ApiError.conflict('Plano possui matrículas vinculadas. Desative-o em vez de excluir.');
    }

    await prisma.plano.delete({ where: { id } });
  }
}

// ==================== MATRICULA SERVICE ====================

interface MatriculaFilters extends PaginationInput {
  alunoId?: string;
  academiaId?: string;
  status?: StatusMatricula;
}

export class MatriculasService {
  async findAll(
    params: MatriculaFilters
  ): Promise<{ data: MatriculaListResponse[]; total: number }> {
    const { skip, take } = getPaginationParams(params);

    const where: any = {};
    if (params.alunoId) where.alunoId = params.alunoId;
    if (params.academiaId) where.academiaId = params.academiaId;
    if (params.status) where.status = params.status;

    const [matriculas, total] = await Promise.all([
      prisma.matricula.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          valorFinal: true,
          status: true,
          dataInicio: true,
          aluno: { select: { pessoa: { select: { nome: true } } } },
          plano: { select: { nome: true } },
        },
      }),
      prisma.matricula.count({ where }),
    ]);

    return {
      data: matriculas.map((m) => ({ ...m, valorFinal: Number(m.valorFinal) })),
      total,
    };
  }

  async findById(id: string): Promise<MatriculaResponse> {
    const matricula = await prisma.matricula.findUnique({
      where: { id },
      include: {
        aluno: { select: { id: true, pessoa: { select: { nome: true } } } },
        academia: { select: { id: true, nome: true } },
        plano: { select: { id: true, nome: true, modalidades: true } },
      },
    });

    if (!matricula) throw ApiError.notFound('Matrícula não encontrada');

    return {
      ...matricula,
      valorFinal: Number(matricula.valorFinal),
      desconto: matricula.desconto ? Number(matricula.desconto) : null,
    } as MatriculaResponse;
  }

  async create(data: CreateMatriculaInput): Promise<MatriculaResponse> {
    // Verificar se aluno existe
    const aluno = await prisma.aluno.findUnique({ where: { id: data.alunoId } });
    if (!aluno) throw ApiError.notFound('Aluno não encontrado');

    // Verificar se academia existe
    const academia = await prisma.academia.findUnique({ where: { id: data.academiaId } });
    if (!academia) throw ApiError.notFound('Academia não encontrada');

    // Verificar se plano existe
    const plano = await prisma.plano.findUnique({ where: { id: data.planoId } });
    if (!plano) throw ApiError.notFound('Plano não encontrado');

    // Verificar se já existe matrícula ativa para este aluno nesta academia
    const matriculaExistente = await prisma.matricula.findFirst({
      where: {
        alunoId: data.alunoId,
        academiaId: data.academiaId,
        status: 'ATIVA',
      },
    });

    if (matriculaExistente) {
      throw ApiError.conflict('Aluno já possui matrícula ativa nesta academia');
    }

    // Calcular valor final
    const valorBase = Number(plano.valorBase);
    const desconto = data.desconto || 0;
    const valorFinal = data.valorFinal || valorBase - desconto;

    const matricula = await prisma.matricula.create({
      data: {
        alunoId: data.alunoId,
        academiaId: data.academiaId,
        planoId: data.planoId,
        valorFinal,
        desconto: data.desconto,
        diaVencimento: data.diaVencimento,
        dataInicio: data.dataInicio || new Date(),
        dataFim: data.dataFim,
        observacoes: data.observacoes,
      },
      include: {
        aluno: { select: { id: true, pessoa: { select: { nome: true } } } },
        academia: { select: { id: true, nome: true } },
        plano: { select: { id: true, nome: true, modalidades: true } },
      },
    });

    return {
      ...matricula,
      valorFinal: Number(matricula.valorFinal),
      desconto: matricula.desconto ? Number(matricula.desconto) : null,
    } as MatriculaResponse;
  }

  async update(id: string, data: UpdateMatriculaInput): Promise<MatriculaResponse> {
    const existing = await prisma.matricula.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Matrícula não encontrada');

    const matricula = await prisma.matricula.update({
      where: { id },
      data,
      include: {
        aluno: { select: { id: true, pessoa: { select: { nome: true } } } },
        academia: { select: { id: true, nome: true } },
        plano: { select: { id: true, nome: true, modalidades: true } },
      },
    });

    return {
      ...matricula,
      valorFinal: Number(matricula.valorFinal),
      desconto: matricula.desconto ? Number(matricula.desconto) : null,
    } as MatriculaResponse;
  }

  async cancelar(id: string): Promise<MatriculaResponse> {
    const existing = await prisma.matricula.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Matrícula não encontrada');

    if (existing.status === 'CANCELADA') {
      throw ApiError.badRequest('Matrícula já está cancelada');
    }

    const matricula = await prisma.matricula.update({
      where: { id },
      data: { status: 'CANCELADA' },
      include: {
        aluno: { select: { id: true, pessoa: { select: { nome: true } } } },
        academia: { select: { id: true, nome: true } },
        plano: { select: { id: true, nome: true, modalidades: true } },
      },
    });

    return {
      ...matricula,
      valorFinal: Number(matricula.valorFinal),
      desconto: matricula.desconto ? Number(matricula.desconto) : null,
    } as MatriculaResponse;
  }
}

// ==================== MENSALIDADE SERVICE ====================

interface MensalidadeFilters extends PaginationInput {
  matriculaId?: string;
  alunoId?: string;
  academiaId?: string;
  status?: StatusMensalidade;
  mesReferencia?: string;
}

export class MensalidadesService {
  async findAll(
    params: MensalidadeFilters
  ): Promise<{ data: MensalidadeListResponse[]; total: number }> {
    const { skip, take } = getPaginationParams(params);

    const where: any = {};
    if (params.matriculaId) where.matriculaId = params.matriculaId;
    if (params.status) where.status = params.status;
    if (params.mesReferencia) where.mesReferencia = params.mesReferencia;
    if (params.alunoId) where.matricula = { alunoId: params.alunoId };
    if (params.academiaId) where.matricula = { ...where.matricula, academiaId: params.academiaId };

    const [mensalidades, total] = await Promise.all([
      prisma.mensalidade.findMany({
        where,
        skip,
        take,
        orderBy: [{ dataVencimento: 'desc' }],
        select: {
          id: true,
          mesReferencia: true,
          valor: true,
          dataVencimento: true,
          status: true,
          matricula: {
            select: {
              aluno: { select: { pessoa: { select: { nome: true } } } },
            },
          },
        },
      }),
      prisma.mensalidade.count({ where }),
    ]);

    return {
      data: mensalidades.map((m) => ({ ...m, valor: Number(m.valor) })),
      total,
    };
  }

  async findById(id: string): Promise<MensalidadeResponse> {
    const mensalidade = await prisma.mensalidade.findUnique({
      where: { id },
      include: {
        matricula: {
          select: {
            id: true,
            aluno: { select: { id: true, pessoa: { select: { nome: true } } } },
            academia: { select: { id: true, nome: true } },
          },
        },
      },
    });

    if (!mensalidade) throw ApiError.notFound('Mensalidade não encontrada');

    return {
      ...mensalidade,
      valor: Number(mensalidade.valor),
    } as MensalidadeResponse;
  }

  async registrarPagamento(
    id: string,
    data: RegistrarPagamentoInput
  ): Promise<MensalidadeResponse> {
    const existing = await prisma.mensalidade.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Mensalidade não encontrada');

    if (existing.status === 'PAGO') {
      throw ApiError.badRequest('Mensalidade já está paga');
    }

    const mensalidade = await prisma.mensalidade.update({
      where: { id },
      data: {
        dataPagamento: data.dataPagamento || new Date(),
        formaPagamento: data.formaPagamento,
        status: 'PAGO',
        observacoes: data.observacoes,
      },
      include: {
        matricula: {
          select: {
            id: true,
            aluno: { select: { id: true, pessoa: { select: { nome: true } } } },
            academia: { select: { id: true, nome: true } },
          },
        },
      },
    });

    return {
      ...mensalidade,
      valor: Number(mensalidade.valor),
    } as MensalidadeResponse;
  }

  async gerarMensalidades(data: GerarMensalidadesInput): Promise<{ geradas: number }> {
    const { mesReferencia, academiaId } = data;
    const [ano, mes] = mesReferencia.split('-').map(Number);

    // Buscar matrículas ativas
    const where: any = { status: 'ATIVA' };
    if (academiaId) where.academiaId = academiaId;

    const matriculas = await prisma.matricula.findMany({
      where,
      select: {
        id: true,
        valorFinal: true,
        diaVencimento: true,
      },
    });

    let geradas = 0;

    for (const matricula of matriculas) {
      // Verificar se já existe mensalidade para este mês
      const existente = await prisma.mensalidade.findUnique({
        where: {
          matriculaId_mesReferencia: {
            matriculaId: matricula.id,
            mesReferencia,
          },
        },
      });

      if (existente) continue;

      // Calcular data de vencimento
      const dataBase = new Date(ano, mes - 1, 1);
      let dataVencimento = setDate(dataBase, matricula.diaVencimento);

      // Ajustar para último dia do mês se necessário
      const ultimoDiaMes = endOfMonth(dataBase).getDate();
      if (matricula.diaVencimento > ultimoDiaMes) {
        dataVencimento = endOfMonth(dataBase);
      }

      await prisma.mensalidade.create({
        data: {
          matriculaId: matricula.id,
          mesReferencia,
          valor: matricula.valorFinal,
          dataVencimento,
          status: 'PENDENTE',
        },
      });

      geradas++;
    }

    return { geradas };
  }

  async atualizarMensalidadesAtrasadas(): Promise<number> {
    const hoje = new Date();

    const result = await prisma.mensalidade.updateMany({
      where: {
        status: 'PENDENTE',
        dataVencimento: { lt: hoje },
      },
      data: { status: 'ATRASADO' },
    });

    return result.count;
  }
}

export const planosService = new PlanosService();
export const matriculasService = new MatriculasService();
export const mensalidadesService = new MensalidadesService();
