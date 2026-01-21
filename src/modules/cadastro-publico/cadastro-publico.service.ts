import { prisma } from '../../config/database';
import { CadastroPublicoInput, AprovarCadastroInput } from './cadastro-publico.schemas';
import { Prisma } from '@prisma/client';

export class CadastroPublicoService {
  /**
   * Criar um novo cadastro pendente (público)
   */
  async criar(data: CadastroPublicoInput) {
    // Verificar se já existe cadastro pendente com mesmo email ou CPF
    const cadastroPendente = await prisma.cadastroPendente.findFirst({
      where: {
        OR: [{ email: data.email }, { cpf: data.cpf }],
        status: 'PENDENTE',
      },
    });

    if (cadastroPendente) {
      throw new Error('Já existe um cadastro pendente com este email ou CPF. Aguarde a aprovação.');
    }

    // Verificar se já existe pessoa cadastrada com mesmo email ou CPF
    const pessoaExistente = await prisma.pessoa.findFirst({
      where: {
        OR: [
          { email: data.email },
          { cpf: data.cpf },
        ],
      },
    });

    if (pessoaExistente) {
      throw new Error('Este email ou CPF já está cadastrado no sistema.');
    }

    // Criar cadastro pendente
    return prisma.cadastroPendente.create({
      data: {
        nome: data.nome,
        email: data.email,
        cpf: data.cpf,
        telefone: data.telefone,
        dataNascimento: data.dataNascimento,
        sexo: data.sexo,
        modalidades: data.modalidades,
        observacoes: data.observacoes,
      },
    });
  }

  /**
   * Listar todos os cadastros pendentes
   */
  async listarPendentes(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [cadastros, total] = await Promise.all([
      prisma.cadastroPendente.findMany({
        where: { status: 'PENDENTE' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.cadastroPendente.count({
        where: { status: 'PENDENTE' },
      }),
    ]);

    return { cadastros, total, page, limit };
  }

  /**
   * Listar todos os cadastros (com filtro opcional por status)
   */
  async listarTodos(
    status?: 'PENDENTE' | 'APROVADO' | 'REJEITADO',
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.CadastroPendenteWhereInput = status ? { status } : {};

    const [cadastros, total] = await Promise.all([
      prisma.cadastroPendente.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.cadastroPendente.count({ where }),
    ]);

    return { cadastros, total, page, limit };
  }

  /**
   * Buscar cadastro por ID
   */
  async buscarPorId(id: string) {
    return prisma.cadastroPendente.findUnique({
      where: { id },
    });
  }

  /**
   * Aprovar cadastro e criar Pessoa + Aluno ou Professor
   */
  async aprovar(id: string, data: AprovarCadastroInput, aprovadoPorId: string) {
    const cadastro = await prisma.cadastroPendente.findUnique({
      where: { id },
    });

    if (!cadastro) {
      throw new Error('Cadastro não encontrado');
    }

    if (cadastro.status !== 'PENDENTE') {
      throw new Error('Este cadastro já foi processado');
    }

    // Usar transação para garantir consistência
    return prisma.$transaction(async (tx) => {
      // 1. Criar Pessoa
      const pessoa = await tx.pessoa.create({
        data: {
          nome: cadastro.nome,
          email: cadastro.email,
          cpf: cadastro.cpf,
          telefone: cadastro.telefone,
          dataNascimento: cadastro.dataNascimento,
          sexo: cadastro.sexo,
        },
      });

      // 2. Criar Aluno ou Professor baseado no papel
      if (data.papel === 'ALUNO') {
        await tx.aluno.create({
          data: {
            pessoaId: pessoa.id,
            faixa: 'BRANCA',
            graus: 0,
            status: 'ATIVO',
            observacoes: cadastro.observacoes,
          },
        });
      } else {
        await tx.professor.create({
          data: {
            pessoaId: pessoa.id,
            modalidades: cadastro.modalidades,
            ativo: true,
          },
        });
      }

      // 3. Atualizar status do cadastro pendente
      const cadastroAtualizado = await tx.cadastroPendente.update({
        where: { id },
        data: {
          status: 'APROVADO',
          aprovadoPorId,
          aprovadoEm: new Date(),
        },
      });

      return {
        cadastro: cadastroAtualizado,
        pessoa,
        papel: data.papel,
      };
    });
  }

  /**
   * Rejeitar cadastro
   */
  async rejeitar(id: string, motivo?: string, rejeitadoPorId?: string) {
    const cadastro = await prisma.cadastroPendente.findUnique({
      where: { id },
    });

    if (!cadastro) {
      throw new Error('Cadastro não encontrado');
    }

    if (cadastro.status !== 'PENDENTE') {
      throw new Error('Este cadastro já foi processado');
    }

    return prisma.cadastroPendente.update({
      where: { id },
      data: {
        status: 'REJEITADO',
        motivoRejeicao: motivo,
        aprovadoPorId: rejeitadoPorId, // Usamos o mesmo campo para quem rejeitou
        aprovadoEm: new Date(),
      },
    });
  }

  /**
   * Verificar status do cadastro por email
   */
  async verificarStatus(email: string) {
    const cadastro = await prisma.cadastroPendente.findUnique({
      where: { email },
      select: {
        id: true,
        nome: true,
        status: true,
        createdAt: true,
        motivoRejeicao: true,
      },
    });

    if (!cadastro) {
      // Verificar se já é pessoa cadastrada
      const pessoa = await prisma.pessoa.findUnique({
        where: { email },
        select: { id: true, nome: true },
      });

      if (pessoa) {
        return {
          encontrado: true,
          status: 'JA_CADASTRADO',
          mensagem: 'Você já está cadastrado no sistema.',
        };
      }

      return {
        encontrado: false,
        status: null,
        mensagem: 'Nenhum cadastro encontrado com este email.',
      };
    }

    const mensagens = {
      PENDENTE: 'Seu cadastro está aguardando aprovação.',
      APROVADO: 'Seu cadastro foi aprovado! Em breve você receberá mais informações.',
      REJEITADO: cadastro.motivoRejeicao
        ? `Seu cadastro foi rejeitado. Motivo: ${cadastro.motivoRejeicao}`
        : 'Seu cadastro foi rejeitado.',
    };

    return {
      encontrado: true,
      status: cadastro.status,
      mensagem: mensagens[cadastro.status],
      dataCadastro: cadastro.createdAt,
    };
  }
}

export const cadastroPublicoService = new CadastroPublicoService();
