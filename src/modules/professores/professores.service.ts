import { prisma } from '@/config/database';
import { ApiError } from '@/shared/utils/api-error';
import { PaginationParams, getPaginationParams } from '@/shared/utils/pagination';
import { Modalidade } from '@prisma/client';
import { CreateProfessorInput, UpdateProfessorInput } from './professores.schemas';
import { ProfessorResponse, ProfessorListResponse, ProfessorWithAcademias } from './professores.types';

interface ProfessorFilters extends PaginationParams {
  ativo?: boolean;
  modalidade?: Modalidade;
  academiaId?: string;
  search?: string;
}

export class ProfessoresService {
  async findAll(
    params: ProfessorFilters
  ): Promise<{ data: ProfessorListResponse[]; total: number }> {
    const { skip, take } = getPaginationParams(params);

    const where: any = {};

    if (params.ativo !== undefined) {
      where.ativo = params.ativo;
    }

    if (params.modalidade) {
      where.modalidades = {
        has: params.modalidade,
      };
    }

    if (params.search) {
      where.pessoa = {
        OR: [
          { nome: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } },
        ],
      };
    }

    if (params.academiaId) {
      where.academias = {
        some: {
          academiaId: params.academiaId,
          ativo: true,
        },
      };
    }

    const [professores, total] = await Promise.all([
      prisma.professor.findMany({
        where,
        skip,
        take,
        orderBy: { pessoa: { nome: 'asc' } },
        select: {
          id: true,
          modalidades: true,
          ativo: true,
          pessoa: {
            select: {
              nome: true,
              telefone: true,
            },
          },
          aluno: {
            select: {
              faixa: true,
              graus: true,
            },
          },
          _count: {
            select: {
              academias: true,
              aulasComoProfessor: true,
            },
          },
        },
      }),
      prisma.professor.count({ where }),
    ]);

    return { data: professores, total };
  }

  async findById(id: string): Promise<ProfessorWithAcademias> {
    const professor = await prisma.professor.findUnique({
      where: { id },
      include: {
        pessoa: true,
        aluno: {
          select: {
            id: true,
            faixa: true,
            graus: true,
          },
        },
        academias: {
          include: {
            academia: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
    });

    if (!professor) {
      throw ApiError.notFound('Professor não encontrado');
    }

    return professor as unknown as ProfessorWithAcademias;
  }

  async create(data: CreateProfessorInput): Promise<ProfessorResponse> {
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

    // Se for vincular a um aluno, verificar se existe e se já não é professor
    if (data.alunoId) {
      const aluno = await prisma.aluno.findUnique({
        where: { id: data.alunoId },
        include: { professor: true },
      });

      if (!aluno) {
        throw ApiError.notFound('Aluno não encontrado');
      }

      if (aluno.professor) {
        throw ApiError.conflict('Este aluno já está vinculado a um professor');
      }
    }

    // Criar pessoa e professor em uma transação
    const professor = await prisma.$transaction(async (tx) => {
      const pessoa = await tx.pessoa.create({
        data: {
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          cpf: data.cpf,
          dataNascimento: data.dataNascimento,
          sexo: data.sexo,
        },
      });

      return tx.professor.create({
        data: {
          pessoaId: pessoa.id,
          modalidades: data.modalidades,
          alunoId: data.alunoId,
        },
        include: {
          pessoa: true,
          aluno: {
            select: {
              id: true,
              faixa: true,
              graus: true,
            },
          },
        },
      });
    });

    return professor as unknown as ProfessorResponse;
  }

  async update(id: string, data: UpdateProfessorInput): Promise<ProfessorResponse> {
    const existing = await prisma.professor.findUnique({
      where: { id },
      include: { pessoa: true },
    });

    if (!existing) {
      throw ApiError.notFound('Professor não encontrado');
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

    // Atualizar pessoa e professor em uma transação
    const professor = await prisma.$transaction(async (tx) => {
      await tx.pessoa.update({
        where: { id: existing.pessoaId },
        data: {
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          cpf: data.cpf,
          dataNascimento: data.dataNascimento,
          sexo: data.sexo,
        },
      });

      return tx.professor.update({
        where: { id },
        data: {
          modalidades: data.modalidades,
          ativo: data.ativo,
          alunoId: data.alunoId,
        },
        include: {
          pessoa: true,
          aluno: {
            select: {
              id: true,
              faixa: true,
              graus: true,
            },
          },
        },
      });
    });

    return professor as unknown as ProfessorResponse;
  }

  async delete(id: string): Promise<void> {
    const existing = await prisma.professor.findUnique({
      where: { id },
      include: {
        pessoa: true,
        _count: {
          select: {
            aulasComoProfessor: true,
            academias: true,
          },
        },
      },
    });

    if (!existing) {
      throw ApiError.notFound('Professor não encontrado');
    }

    // Verificar se há dependências
    if (existing._count.aulasComoProfessor > 0) {
      throw ApiError.conflict(
        'Professor possui aulas vinculadas. Desative-o em vez de excluir.'
      );
    }

    // Excluir professor e pessoa em uma transação
    await prisma.$transaction(async (tx) => {
      // Remover vínculos com academias
      await tx.professorAcademia.deleteMany({
        where: { professorId: id },
      });
      await tx.professor.delete({ where: { id } });
      await tx.pessoa.delete({ where: { id: existing.pessoaId } });
    });
  }

  async vincularAcademia(professorId: string, academiaId: string): Promise<void> {
    const professor = await prisma.professor.findUnique({
      where: { id: professorId },
    });

    if (!professor) {
      throw ApiError.notFound('Professor não encontrado');
    }

    const academia = await prisma.academia.findUnique({
      where: { id: academiaId },
    });

    if (!academia) {
      throw ApiError.notFound('Academia não encontrada');
    }

    // Verificar se já existe vínculo
    const vinculoExistente = await prisma.professorAcademia.findUnique({
      where: {
        professorId_academiaId: {
          professorId,
          academiaId,
        },
      },
    });

    if (vinculoExistente) {
      // Se já existe mas está inativo, reativar
      if (!vinculoExistente.ativo) {
        await prisma.professorAcademia.update({
          where: {
            professorId_academiaId: { professorId, academiaId },
          },
          data: { ativo: true },
        });
        return;
      }
      throw ApiError.conflict('Professor já está vinculado a esta academia');
    }

    await prisma.professorAcademia.create({
      data: {
        professorId,
        academiaId,
      },
    });
  }

  async desvincularAcademia(professorId: string, academiaId: string): Promise<void> {
    const vinculo = await prisma.professorAcademia.findUnique({
      where: {
        professorId_academiaId: {
          professorId,
          academiaId,
        },
      },
    });

    if (!vinculo) {
      throw ApiError.notFound('Vínculo não encontrado');
    }

    await prisma.professorAcademia.update({
      where: {
        professorId_academiaId: { professorId, academiaId },
      },
      data: { ativo: false },
    });
  }

  async toggleStatus(id: string): Promise<ProfessorResponse> {
    const existing = await prisma.professor.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Professor não encontrado');
    }

    const professor = await prisma.professor.update({
      where: { id },
      data: { ativo: !existing.ativo },
      include: {
        pessoa: true,
        aluno: {
          select: {
            id: true,
            faixa: true,
            graus: true,
          },
        },
      },
    });

    return professor as unknown as ProfessorResponse;
  }
}

export const professoresService = new ProfessoresService();
