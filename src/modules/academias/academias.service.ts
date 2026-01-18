import { prisma } from '../../config/database';
import { ApiError } from '../../shared/utils/api-error';
import { PaginationParams, getPaginationParams } from '../../shared/utils/pagination';
import { CreateAcademiaInput, UpdateAcademiaInput } from './academias.schemas';
import { AcademiaResponse, AcademiaWithStats } from './academias.types';

export class AcademiasService {
  async findAll(
    params: PaginationParams & { ativo?: boolean }
  ): Promise<{ data: AcademiaWithStats[]; total: number }> {
    const { skip, take, page, limit } = getPaginationParams(params);

    const where = params.ativo !== undefined ? { ativo: params.ativo } : {};

    const [academias, total] = await Promise.all([
      prisma.academia.findMany({
        where,
        skip,
        take,
        orderBy: { nome: 'asc' },
        include: {
          _count: {
            select: {
              usuarios: true,
              aulas: true,
              matriculas: true,
            },
          },
        },
      }),
      prisma.academia.count({ where }),
    ]);

    return { data: academias, total };
  }

  async findById(id: string): Promise<AcademiaWithStats> {
    const academia = await prisma.academia.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            usuarios: true,
            aulas: true,
            matriculas: true,
            professoresAcademia: true,
          },
        },
      },
    });

    if (!academia) {
      throw ApiError.notFound('Academia não encontrada');
    }

    return academia;
  }

  async create(data: CreateAcademiaInput): Promise<AcademiaResponse> {
    // Verificar se CNPJ já existe (se fornecido)
    if (data.cnpj) {
      const existingCnpj = await prisma.academia.findUnique({
        where: { cnpj: data.cnpj },
      });

      if (existingCnpj) {
        throw ApiError.conflict('CNPJ já cadastrado');
      }
    }

    const academia = await prisma.academia.create({
      data,
    });

    return academia;
  }

  async update(id: string, data: UpdateAcademiaInput): Promise<AcademiaResponse> {
    // Verificar se academia existe
    const existing = await prisma.academia.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Academia não encontrada');
    }

    // Verificar se CNPJ já existe em outra academia (se fornecido)
    if (data.cnpj && data.cnpj !== existing.cnpj) {
      const existingCnpj = await prisma.academia.findUnique({
        where: { cnpj: data.cnpj },
      });

      if (existingCnpj) {
        throw ApiError.conflict('CNPJ já cadastrado');
      }
    }

    const academia = await prisma.academia.update({
      where: { id },
      data,
    });

    return academia;
  }

  async delete(id: string): Promise<void> {
    const existing = await prisma.academia.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            usuarios: true,
            matriculas: true,
          },
        },
      },
    });

    if (!existing) {
      throw ApiError.notFound('Academia não encontrada');
    }

    // Verificar se há dependências
    if (existing._count.usuarios > 0 || existing._count.matriculas > 0) {
      throw ApiError.conflict(
        'Academia possui usuários ou matrículas vinculadas. Desative-a em vez de excluir.'
      );
    }

    await prisma.academia.delete({
      where: { id },
    });
  }

  async toggleStatus(id: string): Promise<AcademiaResponse> {
    const existing = await prisma.academia.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Academia não encontrada');
    }

    const academia = await prisma.academia.update({
      where: { id },
      data: { ativo: !existing.ativo },
    });

    return academia;
  }
}

export const academiasService = new AcademiasService();
