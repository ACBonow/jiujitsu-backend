import { prisma } from '../../config/database';
import { ApiError } from '../../shared/utils/api-error';
import { PaginationParams, getPaginationParams } from '../../shared/utils/pagination';
import { Faixa } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';
import { CreateGraduacaoInput } from './graduacoes.schemas';
import { GraduacaoResponse, GraduacaoListResponse } from './graduacoes.types';

// Ordem das faixas para validação de progressão
const ordemFaixas: Faixa[] = [
  'BRANCA',
  'CINZA',
  'AMARELA',
  'LARANJA',
  'VERDE',
  'AZUL',
  'ROXA',
  'MARROM',
  'PRETA',
  'CORAL_PRETA_VERMELHA',
  'CORAL_BRANCA_VERMELHA',
  'VERMELHA',
];

interface GraduacaoFilters extends PaginationParams {
  alunoId?: string;
  faixa?: Faixa;
  dataInicio?: Date;
  dataFim?: Date;
}

export class GraduacoesService {
  async findAll(
    params: GraduacaoFilters
  ): Promise<{ data: GraduacaoResponse[]; total: number }> {
    const { skip, take } = getPaginationParams(params);

    const where: any = {};

    if (params.alunoId) where.alunoId = params.alunoId;
    if (params.faixa) where.faixaNova = params.faixa;

    if (params.dataInicio || params.dataFim) {
      where.dataPromocao = {};
      if (params.dataInicio) where.dataPromocao.gte = startOfDay(params.dataInicio);
      if (params.dataFim) where.dataPromocao.lte = endOfDay(params.dataFim);
    }

    const [graduacoes, total] = await Promise.all([
      prisma.graduacao.findMany({
        where,
        skip,
        take,
        orderBy: { dataPromocao: 'desc' },
        include: {
          aluno: {
            select: {
              id: true,
              pessoa: { select: { nome: true } },
            },
          },
        },
      }),
      prisma.graduacao.count({ where }),
    ]);

    return { data: graduacoes as unknown as GraduacaoResponse[], total };
  }

  async findById(id: string): Promise<GraduacaoResponse> {
    const graduacao = await prisma.graduacao.findUnique({
      where: { id },
      include: {
        aluno: {
          select: {
            id: true,
            pessoa: { select: { nome: true } },
          },
        },
      },
    });

    if (!graduacao) {
      throw ApiError.notFound('Graduação não encontrada');
    }

    return graduacao as unknown as GraduacaoResponse;
  }

  async findByAluno(alunoId: string): Promise<GraduacaoListResponse[]> {
    const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } });
    if (!aluno) throw ApiError.notFound('Aluno não encontrado');

    const graduacoes = await prisma.graduacao.findMany({
      where: { alunoId },
      orderBy: { dataPromocao: 'desc' },
      select: {
        id: true,
        faixaAnterior: true,
        faixaNova: true,
        grausAnteriores: true,
        grausNovos: true,
        dataPromocao: true,
      },
    });

    return graduacoes;
  }

  async create(data: CreateGraduacaoInput): Promise<GraduacaoResponse> {
    // Verificar se aluno existe
    const aluno = await prisma.aluno.findUnique({ where: { id: data.alunoId } });
    if (!aluno) throw ApiError.notFound('Aluno não encontrado');

    // Validar progressão de faixa
    const indiceFaixaAtual = ordemFaixas.indexOf(aluno.faixa);
    const indiceFaixaNova = ordemFaixas.indexOf(data.faixaNova);

    // Permitir promoção de grau na mesma faixa ou promoção para próxima faixa
    const mesmaFaixa = aluno.faixa === data.faixaNova;
    const promocaoValida = indiceFaixaNova >= indiceFaixaAtual;

    if (!promocaoValida) {
      throw ApiError.badRequest('Não é possível regredir de faixa');
    }

    if (mesmaFaixa && data.grausNovos <= aluno.graus) {
      throw ApiError.badRequest('Não é possível regredir de grau na mesma faixa');
    }

    // Validar número de graus conforme a faixa
    const maxGraus = data.faixaNova === 'PRETA' ? 6 : 4;
    if (data.grausNovos > maxGraus) {
      throw ApiError.badRequest(
        `Faixa ${data.faixaNova} permite no máximo ${maxGraus} graus`
      );
    }

    // Criar graduação e atualizar aluno em transação
    const graduacao = await prisma.$transaction(async (tx) => {
      // Criar registro de graduação
      const novaGraduacao = await tx.graduacao.create({
        data: {
          alunoId: data.alunoId,
          faixaAnterior: aluno.faixa,
          faixaNova: data.faixaNova,
          grausAnteriores: aluno.graus,
          grausNovos: data.grausNovos,
          dataPromocao: data.dataPromocao || new Date(),
          observacao: data.observacao,
        },
        include: {
          aluno: {
            select: {
              id: true,
              pessoa: { select: { nome: true } },
            },
          },
        },
      });

      // Atualizar aluno
      await tx.aluno.update({
        where: { id: data.alunoId },
        data: {
          faixa: data.faixaNova,
          graus: data.grausNovos,
          dataUltimaPromocao: data.dataPromocao || new Date(),
          aulasDesdePromocao: 0, // Resetar contador
        },
      });

      return novaGraduacao;
    });

    return graduacao as unknown as GraduacaoResponse;
  }

  async delete(id: string): Promise<void> {
    const graduacao = await prisma.graduacao.findUnique({ where: { id } });

    if (!graduacao) {
      throw ApiError.notFound('Graduação não encontrada');
    }

    // Verificar se é a última graduação do aluno
    const ultimaGraduacao = await prisma.graduacao.findFirst({
      where: { alunoId: graduacao.alunoId },
      orderBy: { dataPromocao: 'desc' },
    });

    if (ultimaGraduacao?.id !== id) {
      throw ApiError.badRequest(
        'Apenas a última graduação do aluno pode ser removida'
      );
    }

    // Reverter graduação e atualizar aluno
    await prisma.$transaction(async (tx) => {
      await tx.graduacao.delete({ where: { id } });

      // Reverter aluno para estado anterior
      await tx.aluno.update({
        where: { id: graduacao.alunoId },
        data: {
          faixa: graduacao.faixaAnterior,
          graus: graduacao.grausAnteriores,
          dataUltimaPromocao: null, // Poderia buscar a data da graduação anterior
        },
      });
    });
  }
}

export const graduacoesService = new GraduacoesService();
