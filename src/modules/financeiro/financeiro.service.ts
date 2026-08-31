import { prisma } from '../../config/database';
import { ApiError } from '../../shared/utils/api-error';
import { assertAcademiaAccess } from '../../shared/utils/academia-scope';
import { PaginationInput, getPaginationParams } from '../../shared/utils/pagination';
import { Modalidade, StatusMatricula, StatusMensalidade, FormaPagamento, Perfil } from '@prisma/client';
import { setDate, endOfMonth } from 'date-fns';
import {
  CreatePlanoInput,
  UpdatePlanoInput,
  CreateMatriculaInput,
  UpdateMatriculaInput,
  RegraPagamentoInput,
  PreviewPagamentoInput,
  RegistrarPagamentoLoteInput,
  GerarMensalidadesInput,
} from './financeiro.schemas';
import {
  PlanoResponse,
  MatriculaResponse,
  MatriculaListResponse,
  MensalidadeResponse,
  MensalidadeListResponse,
  RegraPagamentoResponse,
  PreviewPagamentoResponse,
  PreviewPagamentoItem,
  PagamentoLoteResponse,
} from './financeiro.types';

interface AuthUser {
  id: string;
  perfil: Perfil;
  academiaId?: string;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ==================== CÁLCULO DE DESCONTO ====================

interface RegraCalc {
  descontoAntecipadoPercentual: number | null;
  diaLimiteAntecipado: number | null;
  descontoPagamentoImediatoPercentual: number | null;
  formasPagamentoComDesconto: FormaPagamento[];
  descontosAcumulativos: boolean;
}

interface CalcularDescontoParams {
  valorOriginal: number;
  formaPagamento: FormaPagamento;
  dataPagamento: Date;
  regra: RegraCalc | null;
}

interface DescontoResult {
  percentualAplicado: number;
  descontoValor: number;
  valorFinal: number;
}

export function calcularDesconto({
  valorOriginal,
  formaPagamento,
  dataPagamento,
  regra,
}: CalcularDescontoParams): DescontoResult {
  if (!regra) {
    return { percentualAplicado: 0, descontoValor: 0, valorFinal: round2(valorOriginal) };
  }

  // Usa o dia em UTC: dataPagamento chega como data ISO ("YYYY-MM-DD") coagida pelo Zod,
  // que sempre representa meia-noite UTC — ler em horário local causaria off-by-one
  // dependendo do fuso horário do servidor.
  const antecipadoPercentual = regra.descontoAntecipadoPercentual ?? 0;
  const aplicaAntecipado =
    antecipadoPercentual > 0 &&
    regra.diaLimiteAntecipado != null &&
    dataPagamento.getUTCDate() <= regra.diaLimiteAntecipado;

  const imediatoPercentual = regra.descontoPagamentoImediatoPercentual ?? 0;
  const aplicaImediato =
    imediatoPercentual > 0 && regra.formasPagamentoComDesconto.includes(formaPagamento);

  let percentualAplicado: number;
  if (regra.descontosAcumulativos) {
    percentualAplicado = (aplicaAntecipado ? antecipadoPercentual : 0) + (aplicaImediato ? imediatoPercentual : 0);
  } else {
    percentualAplicado = Math.max(aplicaAntecipado ? antecipadoPercentual : 0, aplicaImediato ? imediatoPercentual : 0);
  }
  percentualAplicado = Math.min(percentualAplicado, 100);

  const descontoValor = round2((valorOriginal * percentualAplicado) / 100);
  const valorFinal = round2(valorOriginal - descontoValor);

  return { percentualAplicado, descontoValor, valorFinal };
}

function toRegraCalc(
  regra: {
    descontoAntecipadoPercentual: unknown;
    diaLimiteAntecipado: number | null;
    descontoPagamentoImediatoPercentual: unknown;
    formasPagamentoComDesconto: FormaPagamento[];
    descontosAcumulativos: boolean;
  } | null
): RegraCalc | null {
  if (!regra) return null;
  return {
    descontoAntecipadoPercentual:
      regra.descontoAntecipadoPercentual != null ? Number(regra.descontoAntecipadoPercentual) : null,
    diaLimiteAntecipado: regra.diaLimiteAntecipado,
    descontoPagamentoImediatoPercentual:
      regra.descontoPagamentoImediatoPercentual != null ? Number(regra.descontoPagamentoImediatoPercentual) : null,
    formasPagamentoComDesconto: regra.formasPagamentoComDesconto,
    descontosAcumulativos: regra.descontosAcumulativos,
  };
}

function mapRegraPagamento(regra: {
  id: string;
  academiaId: string;
  descontoAntecipadoPercentual: unknown;
  diaLimiteAntecipado: number | null;
  descontoPagamentoImediatoPercentual: unknown;
  formasPagamentoComDesconto: FormaPagamento[];
  descontosAcumulativos: boolean;
  createdAt: Date;
  updatedAt: Date;
}): RegraPagamentoResponse {
  return {
    id: regra.id,
    academiaId: regra.academiaId,
    descontoAntecipadoPercentual:
      regra.descontoAntecipadoPercentual != null ? Number(regra.descontoAntecipadoPercentual) : null,
    diaLimiteAntecipado: regra.diaLimiteAntecipado,
    descontoPagamentoImediatoPercentual:
      regra.descontoPagamentoImediatoPercentual != null ? Number(regra.descontoPagamentoImediatoPercentual) : null,
    formasPagamentoComDesconto: regra.formasPagamentoComDesconto,
    descontosAcumulativos: regra.descontosAcumulativos,
    createdAt: regra.createdAt,
    updatedAt: regra.updatedAt,
  };
}

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
  status?: StatusMensalidade | StatusMensalidade[];
  mesReferencia?: string;
}

export class MensalidadesService {
  async findAll(
    params: MensalidadeFilters
  ): Promise<{ data: MensalidadeListResponse[]; total: number }> {
    const { skip, take } = getPaginationParams(params);

    const where: any = {};
    if (params.matriculaId) where.matriculaId = params.matriculaId;
    if (params.status) where.status = Array.isArray(params.status) ? { in: params.status } : params.status;
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
          valorOriginal: true,
          valorPago: true,
          dataVencimento: true,
          status: true,
          matricula: {
            select: {
              aluno: { select: { pessoa: { select: { nome: true } } } },
              academia: { select: { id: true, nome: true } },
            },
          },
        },
      }),
      prisma.mensalidade.count({ where }),
    ]);

    return {
      data: mensalidades.map((m) => ({
        ...m,
        valorOriginal: Number(m.valorOriginal),
        valorPago: m.valorPago != null ? Number(m.valorPago) : null,
      })),
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
      valorOriginal: Number(mensalidade.valorOriginal),
      valorPago: mensalidade.valorPago != null ? Number(mensalidade.valorPago) : null,
      descontoAplicado: mensalidade.descontoAplicado != null ? Number(mensalidade.descontoAplicado) : null,
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
          valorOriginal: matricula.valorFinal,
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

// ==================== REGRA DE PAGAMENTO SERVICE ====================

export class RegraPagamentoService {
  async getByAcademia(academiaId: string): Promise<RegraPagamentoResponse | null> {
    const academia = await prisma.academia.findUnique({ where: { id: academiaId } });
    if (!academia) throw ApiError.notFound('Academia não encontrada');

    const regra = await prisma.regraPagamentoAcademia.findUnique({ where: { academiaId } });
    return regra ? mapRegraPagamento(regra) : null;
  }

  async upsert(academiaId: string, data: RegraPagamentoInput): Promise<RegraPagamentoResponse> {
    const academia = await prisma.academia.findUnique({ where: { id: academiaId } });
    if (!academia) throw ApiError.notFound('Academia não encontrada');

    const regra = await prisma.regraPagamentoAcademia.upsert({
      where: { academiaId },
      create: { academiaId, ...data },
      update: data,
    });

    return mapRegraPagamento(regra);
  }
}

// ==================== PAGAMENTO SERVICE (preview e registro em lote) ====================

type MensalidadeParaPagamento = {
  id: string;
  mesReferencia: string;
  valorOriginal: unknown;
  status: StatusMensalidade;
  matricula: {
    academiaId: string;
    aluno: { pessoa: { nome: string } };
  };
};

export class PagamentosService {
  async preview(data: PreviewPagamentoInput, currentUser: AuthUser): Promise<PreviewPagamentoResponse> {
    const mensalidades = await this.buscarMensalidadesValidas(data.mensalidadeIds, currentUser);
    const academiaId = mensalidades[0].matricula.academiaId;
    const dataPagamento = data.dataPagamento || new Date();

    const regra = await prisma.regraPagamentoAcademia.findUnique({ where: { academiaId } });
    const regraCalc = toRegraCalc(regra);

    const itens: PreviewPagamentoItem[] = mensalidades.map((m) => {
      const valorOriginal = Number(m.valorOriginal);
      const { percentualAplicado, descontoValor, valorFinal } = calcularDesconto({
        valorOriginal,
        formaPagamento: data.formaPagamento,
        dataPagamento,
        regra: regraCalc,
      });

      return {
        mensalidadeId: m.id,
        alunoNome: m.matricula.aluno.pessoa.nome,
        mesReferencia: m.mesReferencia,
        valorOriginal,
        percentualAplicado,
        descontoValor,
        valorFinal,
      };
    });

    return {
      itens,
      valorTotal: round2(itens.reduce((sum, i) => sum + i.valorFinal, 0)),
      descontoTotal: round2(itens.reduce((sum, i) => sum + i.descontoValor, 0)),
    };
  }

  async registrar(data: RegistrarPagamentoLoteInput, currentUser: AuthUser): Promise<PagamentoLoteResponse> {
    const mensalidadeIds = data.itens.map((i) => i.mensalidadeId);
    const mensalidades = await this.buscarMensalidadesValidas(mensalidadeIds, currentUser);
    const academiaId = mensalidades[0].matricula.academiaId;
    const dataPagamento = data.dataPagamento || new Date();
    const valorPagoPorId = new Map(data.itens.map((i) => [i.mensalidadeId, i.valorPago]));

    const valorTotal = round2(data.itens.reduce((sum, i) => sum + i.valorPago, 0));
    const descontoTotal = round2(
      mensalidades.reduce((sum, m) => {
        const valorPago = valorPagoPorId.get(m.id)!;
        return sum + Math.max(0, Number(m.valorOriginal) - valorPago);
      }, 0)
    );

    const loteId = await prisma.$transaction(async (tx) => {
      const novoLote = await tx.pagamentoLote.create({
        data: {
          academiaId,
          formaPagamento: data.formaPagamento,
          dataPagamento,
          valorTotal,
          descontoTotal,
          observacoes: data.observacoes,
          registradoPorId: currentUser.id,
        },
      });

      for (const m of mensalidades) {
        const valorPago = valorPagoPorId.get(m.id)!;
        await tx.mensalidade.update({
          where: { id: m.id },
          data: {
            status: 'PAGO',
            valorPago,
            descontoAplicado: round2(Number(m.valorOriginal) - valorPago),
            dataPagamento,
            formaPagamento: data.formaPagamento,
            pagamentoLoteId: novoLote.id,
          },
        });
      }

      return novoLote.id;
    });

    const lote = await prisma.pagamentoLote.findUniqueOrThrow({
      where: { id: loteId },
      include: {
        mensalidades: {
          select: {
            id: true,
            mesReferencia: true,
            valorOriginal: true,
            valorPago: true,
            matricula: { select: { aluno: { select: { pessoa: { select: { nome: true } } } } } },
          },
        },
      },
    });

    return {
      id: lote.id,
      academiaId: lote.academiaId,
      formaPagamento: lote.formaPagamento,
      dataPagamento: lote.dataPagamento,
      valorTotal: Number(lote.valorTotal),
      descontoTotal: Number(lote.descontoTotal),
      observacoes: lote.observacoes,
      createdAt: lote.createdAt,
      mensalidades: lote.mensalidades.map((m) => ({
        id: m.id,
        mesReferencia: m.mesReferencia,
        valorOriginal: Number(m.valorOriginal),
        valorPago: m.valorPago != null ? Number(m.valorPago) : null,
        aluno: { pessoa: { nome: m.matricula.aluno.pessoa.nome } },
      })),
    };
  }

  private async buscarMensalidadesValidas(
    mensalidadeIds: string[],
    currentUser: AuthUser
  ): Promise<MensalidadeParaPagamento[]> {
    const mensalidades = await prisma.mensalidade.findMany({
      where: { id: { in: mensalidadeIds } },
      include: {
        matricula: {
          select: {
            academiaId: true,
            aluno: { select: { pessoa: { select: { nome: true } } } },
          },
        },
      },
    });

    if (mensalidades.length !== mensalidadeIds.length) {
      throw ApiError.notFound('Uma ou mais mensalidades não foram encontradas');
    }

    const academiaIds = new Set(mensalidades.map((m) => m.matricula.academiaId));
    if (academiaIds.size > 1) {
      throw ApiError.badRequest('Todas as mensalidades selecionadas devem ser da mesma academia');
    }

    assertAcademiaAccess(currentUser, mensalidades[0].matricula.academiaId);

    if (mensalidades.some((m) => m.status === 'PAGO')) {
      throw ApiError.badRequest('Uma ou mais mensalidades já estão pagas');
    }

    return mensalidades;
  }
}

export const planosService = new PlanosService();
export const matriculasService = new MatriculasService();
export const mensalidadesService = new MensalidadesService();
export const regraPagamentoService = new RegraPagamentoService();
export const pagamentosService = new PagamentosService();
