import { prisma } from '@/config/database';
import { ApiError } from '@/shared/utils/api-error';
import { PaginationParams, getPaginationParams } from '@/shared/utils/pagination';
import { DiaSemana, CategoriaTurma, Modalidade, StatusAula } from '@prisma/client';
import {
  addDays,
  startOfDay,
  endOfDay,
  getDay,
  parse,
  setHours,
  setMinutes,
} from 'date-fns';
import {
  CreateTemplateAulaInput,
  UpdateTemplateAulaInput,
  CreateAulaInput,
  UpdateAulaInput,
  GerarAulasInput,
} from './aulas.schemas';
import {
  TemplateAulaResponse,
  AulaResponse,
  AulaListResponse,
  AulaWithCounts,
} from './aulas.types';

// Mapeamento de DiaSemana para número do dia (0 = domingo)
const diaSemanaMap: Record<DiaSemana, number> = {
  DOMINGO: 0,
  SEGUNDA: 1,
  TERCA: 2,
  QUARTA: 3,
  QUINTA: 4,
  SEXTA: 5,
  SABADO: 6,
};

interface TemplateFilters extends PaginationParams {
  academiaId?: string;
  professorId?: string;
  diaSemana?: DiaSemana;
  categoria?: CategoriaTurma;
  ativo?: boolean;
}

interface AulaFilters extends PaginationParams {
  academiaId?: string;
  professorId?: string;
  categoria?: CategoriaTurma;
  modalidade?: Modalidade;
  status?: StatusAula;
  dataInicio?: Date;
  dataFim?: Date;
}

export class AulasService {
  // ==================== TEMPLATE DE AULA ====================

  async findAllTemplates(
    params: TemplateFilters
  ): Promise<{ data: TemplateAulaResponse[]; total: number }> {
    const { skip, take } = getPaginationParams(params);

    const where: any = {};

    if (params.academiaId) where.academiaId = params.academiaId;
    if (params.professorId) where.professorId = params.professorId;
    if (params.diaSemana) where.diaSemana = params.diaSemana;
    if (params.categoria) where.categoria = params.categoria;
    if (params.ativo !== undefined) where.ativo = params.ativo;

    const [templates, total] = await Promise.all([
      prisma.templateAula.findMany({
        where,
        skip,
        take,
        orderBy: [{ diaSemana: 'asc' }, { horarioInicio: 'asc' }],
        include: {
          academia: { select: { id: true, nome: true } },
          professor: { select: { id: true, pessoa: { select: { nome: true } } } },
        },
      }),
      prisma.templateAula.count({ where }),
    ]);

    return { data: templates as unknown as TemplateAulaResponse[], total };
  }

  async findTemplateById(id: string): Promise<TemplateAulaResponse> {
    const template = await prisma.templateAula.findUnique({
      where: { id },
      include: {
        academia: { select: { id: true, nome: true } },
        professor: { select: { id: true, pessoa: { select: { nome: true } } } },
      },
    });

    if (!template) {
      throw ApiError.notFound('Template de aula não encontrado');
    }

    return template as unknown as TemplateAulaResponse;
  }

  async createTemplate(data: CreateTemplateAulaInput): Promise<TemplateAulaResponse> {
    // Verificar se academia existe
    const academia = await prisma.academia.findUnique({
      where: { id: data.academiaId },
    });
    if (!academia) throw ApiError.notFound('Academia não encontrada');

    // Verificar se professor existe e está vinculado à academia
    const professorAcademia = await prisma.professorAcademia.findUnique({
      where: {
        professorId_academiaId: {
          professorId: data.professorId,
          academiaId: data.academiaId,
        },
      },
    });
    if (!professorAcademia || !professorAcademia.ativo) {
      throw ApiError.badRequest('Professor não está vinculado a esta academia');
    }

    const template = await prisma.templateAula.create({
      data: {
        academiaId: data.academiaId,
        professorId: data.professorId,
        diaSemana: data.diaSemana,
        horarioInicio: data.horarioInicio,
        duracao: data.duracao || 60,
        categoria: data.categoria,
        modalidade: data.modalidade || 'JIUJITSU',
        limiteAlunos: data.limiteAlunos,
      },
      include: {
        academia: { select: { id: true, nome: true } },
        professor: { select: { id: true, pessoa: { select: { nome: true } } } },
      },
    });

    return template as unknown as TemplateAulaResponse;
  }

  async updateTemplate(
    id: string,
    data: UpdateTemplateAulaInput
  ): Promise<TemplateAulaResponse> {
    const existing = await prisma.templateAula.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Template de aula não encontrado');

    // Se mudar o professor, verificar se está vinculado à academia
    if (data.professorId && data.professorId !== existing.professorId) {
      const professorAcademia = await prisma.professorAcademia.findUnique({
        where: {
          professorId_academiaId: {
            professorId: data.professorId,
            academiaId: existing.academiaId,
          },
        },
      });
      if (!professorAcademia || !professorAcademia.ativo) {
        throw ApiError.badRequest('Professor não está vinculado a esta academia');
      }
    }

    const template = await prisma.templateAula.update({
      where: { id },
      data,
      include: {
        academia: { select: { id: true, nome: true } },
        professor: { select: { id: true, pessoa: { select: { nome: true } } } },
      },
    });

    return template as unknown as TemplateAulaResponse;
  }

  async deleteTemplate(id: string): Promise<void> {
    const existing = await prisma.templateAula.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Template de aula não encontrado');

    await prisma.templateAula.delete({ where: { id } });
  }

  // ==================== AULA ====================

  async findAllAulas(
    params: AulaFilters
  ): Promise<{ data: AulaListResponse[]; total: number }> {
    const { skip, take } = getPaginationParams(params);

    const where: any = {};

    if (params.academiaId) where.academiaId = params.academiaId;
    if (params.professorId) where.professorId = params.professorId;
    if (params.categoria) where.categoria = params.categoria;
    if (params.modalidade) where.modalidade = params.modalidade;
    if (params.status) where.status = params.status;

    if (params.dataInicio || params.dataFim) {
      where.dataHora = {};
      if (params.dataInicio) where.dataHora.gte = startOfDay(params.dataInicio);
      if (params.dataFim) where.dataHora.lte = endOfDay(params.dataFim);
    }

    const [aulas, total] = await Promise.all([
      prisma.aula.findMany({
        where,
        skip,
        take,
        orderBy: { dataHora: 'asc' },
        select: {
          id: true,
          dataHora: true,
          categoria: true,
          modalidade: true,
          status: true,
          professor: { select: { pessoa: { select: { nome: true } } } },
          _count: { select: { presencas: true, reservas: true } },
        },
      }),
      prisma.aula.count({ where }),
    ]);

    return { data: aulas, total };
  }

  async findAulaById(id: string): Promise<AulaWithCounts> {
    const aula = await prisma.aula.findUnique({
      where: { id },
      include: {
        academia: { select: { id: true, nome: true } },
        professor: { select: { id: true, pessoa: { select: { nome: true } } } },
        professorSubstituto: { select: { id: true, pessoa: { select: { nome: true } } } },
        _count: { select: { presencas: true, reservas: true } },
      },
    });

    if (!aula) {
      throw ApiError.notFound('Aula não encontrada');
    }

    return aula as unknown as AulaWithCounts;
  }

  async createAula(data: CreateAulaInput): Promise<AulaResponse> {
    // Verificar se academia existe
    const academia = await prisma.academia.findUnique({
      where: { id: data.academiaId },
    });
    if (!academia) throw ApiError.notFound('Academia não encontrada');

    // Verificar se professor existe
    const professor = await prisma.professor.findUnique({
      where: { id: data.professorId },
    });
    if (!professor) throw ApiError.notFound('Professor não encontrado');

    const aula = await prisma.aula.create({
      data: {
        academiaId: data.academiaId,
        professorId: data.professorId,
        dataHora: data.dataHora,
        duracao: data.duracao || 60,
        categoria: data.categoria,
        modalidade: data.modalidade || 'JIUJITSU',
        tipoAula: data.tipoAula || 'PADRAO',
        limiteAlunos: data.limiteAlunos,
        observacoes: data.observacoes,
      },
      include: {
        academia: { select: { id: true, nome: true } },
        professor: { select: { id: true, pessoa: { select: { nome: true } } } },
      },
    });

    return aula as unknown as AulaResponse;
  }

  async updateAula(id: string, data: UpdateAulaInput): Promise<AulaResponse> {
    const existing = await prisma.aula.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Aula não encontrada');

    // Se a aula já foi concluída ou cancelada, não permitir edição
    if (existing.status === 'CONCLUIDA' || existing.status === 'CANCELADA') {
      throw ApiError.badRequest('Não é possível editar uma aula concluída ou cancelada');
    }

    const aula = await prisma.aula.update({
      where: { id },
      data,
      include: {
        academia: { select: { id: true, nome: true } },
        professor: { select: { id: true, pessoa: { select: { nome: true } } } },
        professorSubstituto: { select: { id: true, pessoa: { select: { nome: true } } } },
      },
    });

    return aula as unknown as AulaResponse;
  }

  async deleteAula(id: string): Promise<void> {
    const existing = await prisma.aula.findUnique({
      where: { id },
      include: { _count: { select: { presencas: true, reservas: true } } },
    });

    if (!existing) throw ApiError.notFound('Aula não encontrada');

    if (existing._count.presencas > 0) {
      throw ApiError.conflict('Aula possui presenças registradas. Cancele-a em vez de excluir.');
    }

    // Excluir reservas e a aula
    await prisma.$transaction([
      prisma.reserva.deleteMany({ where: { aulaId: id } }),
      prisma.aula.delete({ where: { id } }),
    ]);
  }

  async cancelarAula(id: string): Promise<AulaResponse> {
    const existing = await prisma.aula.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Aula não encontrada');

    if (existing.status === 'CONCLUIDA') {
      throw ApiError.badRequest('Não é possível cancelar uma aula já concluída');
    }

    const aula = await prisma.$transaction(async (tx) => {
      // Cancelar todas as reservas
      await tx.reserva.updateMany({
        where: { aulaId: id, status: { in: ['CONFIRMADA', 'ESPERA'] } },
        data: { status: 'CANCELADA' },
      });

      return tx.aula.update({
        where: { id },
        data: { status: 'CANCELADA' },
        include: {
          academia: { select: { id: true, nome: true } },
          professor: { select: { id: true, pessoa: { select: { nome: true } } } },
        },
      });
    });

    return aula as unknown as AulaResponse;
  }

  async iniciarAula(id: string): Promise<AulaResponse> {
    const existing = await prisma.aula.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Aula não encontrada');

    if (existing.status !== 'AGENDADA') {
      throw ApiError.badRequest('Apenas aulas agendadas podem ser iniciadas');
    }

    const aula = await prisma.aula.update({
      where: { id },
      data: { status: 'EM_ANDAMENTO' },
      include: {
        academia: { select: { id: true, nome: true } },
        professor: { select: { id: true, pessoa: { select: { nome: true } } } },
      },
    });

    return aula as unknown as AulaResponse;
  }

  async concluirAula(id: string): Promise<AulaResponse> {
    const existing = await prisma.aula.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Aula não encontrada');

    if (existing.status !== 'EM_ANDAMENTO' && existing.status !== 'AGENDADA') {
      throw ApiError.badRequest('Apenas aulas agendadas ou em andamento podem ser concluídas');
    }

    const aula = await prisma.$transaction(async (tx) => {
      // Marcar reservas confirmadas que não viraram presença como FALTOU
      await tx.reserva.updateMany({
        where: {
          aulaId: id,
          status: 'CONFIRMADA',
        },
        data: { status: 'FALTOU' },
      });

      return tx.aula.update({
        where: { id },
        data: { status: 'CONCLUIDA' },
        include: {
          academia: { select: { id: true, nome: true } },
          professor: { select: { id: true, pessoa: { select: { nome: true } } } },
        },
      });
    });

    return aula as unknown as AulaResponse;
  }

  // Gerar aulas a partir dos templates para um período
  async gerarAulas(data: GerarAulasInput): Promise<{ created: number }> {
    const { academiaId, dataInicio, dataFim } = data;

    // Buscar templates ativos da academia
    const templates = await prisma.templateAula.findMany({
      where: { academiaId, ativo: true },
    });

    if (templates.length === 0) {
      throw ApiError.badRequest('Nenhum template de aula ativo encontrado para esta academia');
    }

    const aulasParaCriar: any[] = [];
    let currentDate = startOfDay(dataInicio);
    const endDate = endOfDay(dataFim);

    while (currentDate <= endDate) {
      const diaSemana = getDay(currentDate);

      for (const template of templates) {
        if (diaSemanaMap[template.diaSemana] === diaSemana) {
          // Parsear horário
          const [hora, minuto] = template.horarioInicio.split(':').map(Number);
          const dataHora = setMinutes(setHours(currentDate, hora), minuto);

          // Verificar se já existe aula neste horário
          const existingAula = await prisma.aula.findFirst({
            where: {
              academiaId,
              dataHora,
            },
          });

          if (!existingAula) {
            aulasParaCriar.push({
              academiaId: template.academiaId,
              professorId: template.professorId,
              dataHora,
              duracao: template.duracao,
              categoria: template.categoria,
              modalidade: template.modalidade,
              limiteAlunos: template.limiteAlunos,
            });
          }
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    if (aulasParaCriar.length > 0) {
      await prisma.aula.createMany({ data: aulasParaCriar });
    }

    return { created: aulasParaCriar.length };
  }
}

export const aulasService = new AulasService();
