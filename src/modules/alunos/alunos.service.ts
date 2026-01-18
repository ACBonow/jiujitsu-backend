import { prisma } from '@/config/database';
import { ApiError } from '@/shared/utils/api-error';
import { PaginationParams, getPaginationParams } from '@/shared/utils/pagination';
import { Faixa, StatusAluno } from '@prisma/client';
import { CreateAlunoInput, UpdateAlunoInput } from './alunos.schemas';
import { AlunoResponse, AlunoListResponse, AlunoWithMatriculas } from './alunos.types';

interface AlunoFilters extends PaginationParams {
  status?: StatusAluno;
  faixa?: Faixa;
  academiaId?: string;
  search?: string;
}

export class AlunosService {
  async findAll(
    params: AlunoFilters
  ): Promise<{ data: AlunoListResponse[]; total: number }> {
    const { skip, take } = getPaginationParams(params);

    const where: any = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.faixa) {
      where.faixa = params.faixa;
    }

    if (params.search) {
      where.pessoa = {
        OR: [
          { nome: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } },
          { cpf: { contains: params.search } },
        ],
      };
    }

    if (params.academiaId) {
      where.matriculas = {
        some: {
          academiaId: params.academiaId,
          status: 'ATIVA',
        },
      };
    }

    const [alunos, total] = await Promise.all([
      prisma.aluno.findMany({
        where,
        skip,
        take,
        orderBy: { pessoa: { nome: 'asc' } },
        select: {
          id: true,
          faixa: true,
          graus: true,
          status: true,
          pessoa: {
            select: {
              nome: true,
              telefone: true,
            },
          },
          _count: {
            select: {
              presencas: true,
              matriculas: true,
            },
          },
        },
      }),
      prisma.aluno.count({ where }),
    ]);

    return { data: alunos, total };
  }

  async findById(id: string): Promise<AlunoWithMatriculas> {
    const aluno = await prisma.aluno.findUnique({
      where: { id },
      include: {
        pessoa: true,
        matriculas: {
          include: {
            plano: {
              select: { nome: true },
            },
            academia: {
              select: { id: true, nome: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!aluno) {
      throw ApiError.notFound('Aluno não encontrado');
    }

    return aluno as unknown as AlunoWithMatriculas;
  }

  async create(data: CreateAlunoInput): Promise<AlunoResponse> {
    // Verificar se CPF já existe (se fornecido)
    if (data.cpf) {
      const existingCpf = await prisma.pessoa.findUnique({
        where: { cpf: data.cpf },
      });

      if (existingCpf) {
        throw ApiError.conflict('CPF já cadastrado');
      }
    }

    // Verificar se email já existe (se fornecido)
    if (data.email) {
      const existingEmail = await prisma.pessoa.findUnique({
        where: { email: data.email },
      });

      if (existingEmail) {
        throw ApiError.conflict('Email já cadastrado');
      }
    }

    // Criar pessoa e aluno em uma transação
    const aluno = await prisma.$transaction(async (tx) => {
      const pessoa = await tx.pessoa.create({
        data: {
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          cpf: data.cpf,
          dataNascimento: data.dataNascimento,
          sexo: data.sexo,
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          cep: data.cep,
        },
      });

      return tx.aluno.create({
        data: {
          pessoaId: pessoa.id,
          faixa: data.faixa || 'BRANCA',
          graus: data.graus || 0,
          peso: data.peso,
          categoriaIdade: data.categoriaIdade,
          categoriaPeso: data.categoriaPeso,
          nomeResponsavel: data.nomeResponsavel,
          telefoneResponsavel: data.telefoneResponsavel,
          observacoes: data.observacoes,
        },
        include: {
          pessoa: true,
        },
      });
    });

    return aluno as unknown as AlunoResponse;
  }

  async update(id: string, data: UpdateAlunoInput): Promise<AlunoResponse> {
    const existing = await prisma.aluno.findUnique({
      where: { id },
      include: { pessoa: true },
    });

    if (!existing) {
      throw ApiError.notFound('Aluno não encontrado');
    }

    // Verificar se CPF já existe em outra pessoa (se fornecido)
    if (data.cpf && data.cpf !== existing.pessoa.cpf) {
      const existingCpf = await prisma.pessoa.findUnique({
        where: { cpf: data.cpf },
      });

      if (existingCpf) {
        throw ApiError.conflict('CPF já cadastrado');
      }
    }

    // Verificar se email já existe em outra pessoa (se fornecido)
    if (data.email && data.email !== existing.pessoa.email) {
      const existingEmail = await prisma.pessoa.findUnique({
        where: { email: data.email },
      });

      if (existingEmail) {
        throw ApiError.conflict('Email já cadastrado');
      }
    }

    // Atualizar pessoa e aluno em uma transação
    const aluno = await prisma.$transaction(async (tx) => {
      await tx.pessoa.update({
        where: { id: existing.pessoaId },
        data: {
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          cpf: data.cpf,
          dataNascimento: data.dataNascimento,
          sexo: data.sexo,
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          cep: data.cep,
        },
      });

      return tx.aluno.update({
        where: { id },
        data: {
          faixa: data.faixa,
          graus: data.graus,
          status: data.status,
          peso: data.peso,
          categoriaIdade: data.categoriaIdade,
          categoriaPeso: data.categoriaPeso,
          nomeResponsavel: data.nomeResponsavel,
          telefoneResponsavel: data.telefoneResponsavel,
          observacoes: data.observacoes,
        },
        include: {
          pessoa: true,
        },
      });
    });

    return aluno as unknown as AlunoResponse;
  }

  async delete(id: string): Promise<void> {
    const existing = await prisma.aluno.findUnique({
      where: { id },
      include: {
        pessoa: true,
        _count: {
          select: {
            matriculas: true,
            presencas: true,
          },
        },
      },
    });

    if (!existing) {
      throw ApiError.notFound('Aluno não encontrado');
    }

    // Verificar se há dependências
    if (existing._count.matriculas > 0 || existing._count.presencas > 0) {
      throw ApiError.conflict(
        'Aluno possui matrículas ou presenças vinculadas. Altere o status para INATIVO.'
      );
    }

    // Excluir aluno e pessoa em uma transação
    await prisma.$transaction(async (tx) => {
      await tx.aluno.delete({ where: { id } });
      await tx.pessoa.delete({ where: { id: existing.pessoaId } });
    });
  }

  async updateStatus(id: string, status: StatusAluno): Promise<AlunoResponse> {
    const existing = await prisma.aluno.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Aluno não encontrado');
    }

    const aluno = await prisma.aluno.update({
      where: { id },
      data: { status },
      include: { pessoa: true },
    });

    return aluno as unknown as AlunoResponse;
  }

  async getPresencas(
    alunoId: string,
    params: PaginationParams
  ): Promise<{ data: any[]; total: number }> {
    const { skip, take } = getPaginationParams(params);

    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoId },
    });

    if (!aluno) {
      throw ApiError.notFound('Aluno não encontrado');
    }

    const [presencas, total] = await Promise.all([
      prisma.presenca.findMany({
        where: { alunoId },
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
              academia: {
                select: { nome: true },
              },
            },
          },
        },
      }),
      prisma.presenca.count({ where: { alunoId } }),
    ]);

    return { data: presencas, total };
  }

  async getGraduacoes(alunoId: string): Promise<any[]> {
    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoId },
    });

    if (!aluno) {
      throw ApiError.notFound('Aluno não encontrado');
    }

    const graduacoes = await prisma.graduacao.findMany({
      where: { alunoId },
      orderBy: { dataPromocao: 'desc' },
    });

    return graduacoes;
  }
}

export const alunosService = new AlunosService();
