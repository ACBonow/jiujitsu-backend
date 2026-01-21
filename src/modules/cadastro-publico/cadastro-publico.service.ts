import { prisma } from '../../config/database';
import { CadastroPublicoInput, AprovarCadastroInput } from './cadastro-publico.schemas';
import { Prisma } from '@prisma/client';
import { hashPassword } from '../../shared/utils/password-hash';

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
   * Aprovar cadastro e criar Pessoa + Aluno/Professor/Usuário conforme o papel
   *
   * Lógica:
   * - ALUNO: cria Pessoa + Aluno (sem acesso ao sistema)
   * - PROFESSOR: cria Pessoa + Aluno (para graduação) + Professor + Usuário (senha = CPF)
   * - ADMIN: cria Pessoa + Usuário como ADMIN (senha = CPF)
   * - RECEPCIONISTA: cria Pessoa + Usuário como RECEPCIONISTA (senha = CPF)
   *
   * Permite editar dados do cadastro na aprovação via `dadosEditados`
   * Permite vincular professor responsável ao aluno via `professorResponsavelId`
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

    // Mesclar dados do cadastro com dados editados (se houver)
    const dadosFinais = {
      nome: data.dadosEditados?.nome || cadastro.nome,
      email: data.dadosEditados?.email || cadastro.email,
      cpf: data.dadosEditados?.cpf || cadastro.cpf,
      telefone: data.dadosEditados?.telefone || cadastro.telefone,
      dataNascimento: data.dadosEditados?.dataNascimento || cadastro.dataNascimento,
      sexo: data.dadosEditados?.sexo || cadastro.sexo,
      modalidades: data.dadosEditados?.modalidades || cadastro.modalidades,
      observacoes: data.dadosEditados?.observacoes ?? cadastro.observacoes,
      nomeResponsavel: data.dadosEditados?.nomeResponsavel,
      telefoneResponsavel: data.dadosEditados?.telefoneResponsavel,
    };

    // Verificar se email/cpf editados já existem
    if (data.dadosEditados?.email && data.dadosEditados.email !== cadastro.email) {
      const emailExiste = await prisma.pessoa.findUnique({ where: { email: data.dadosEditados.email } });
      if (emailExiste) {
        throw new Error('O email informado já está cadastrado no sistema');
      }
    }

    if (data.dadosEditados?.cpf && data.dadosEditados.cpf !== cadastro.cpf) {
      const cpfExiste = await prisma.pessoa.findUnique({ where: { cpf: data.dadosEditados.cpf } });
      if (cpfExiste) {
        throw new Error('O CPF informado já está cadastrado no sistema');
      }
    }

    // Validar professor responsável se informado
    if (data.professorResponsavelId) {
      const professorExiste = await prisma.professor.findUnique({
        where: { id: data.professorResponsavelId },
      });
      if (!professorExiste) {
        throw new Error('Professor responsável não encontrado');
      }
    }

    // Definir faixa e graus (padrão: BRANCA, 0 graus)
    const faixa = data.faixa || 'BRANCA';
    const graus = data.graus ?? 0;

    // Usar transação para garantir consistência
    return prisma.$transaction(async (tx) => {
      // 1. Criar Pessoa com dados finais (originais + editados)
      const pessoa = await tx.pessoa.create({
        data: {
          nome: dadosFinais.nome,
          email: dadosFinais.email,
          cpf: dadosFinais.cpf,
          telefone: dadosFinais.telefone,
          dataNascimento: dadosFinais.dataNascimento,
          sexo: dadosFinais.sexo,
        },
      });

      let aluno = null;
      let professor = null;
      let usuario = null;

      // 2. Criar registros baseado no papel
      switch (data.papel) {
        case 'ALUNO':
          // Apenas Aluno, sem acesso ao sistema
          aluno = await tx.aluno.create({
            data: {
              pessoaId: pessoa.id,
              faixa,
              graus,
              status: 'ATIVO',
              observacoes: dadosFinais.observacoes,
              nomeResponsavel: dadosFinais.nomeResponsavel,
              telefoneResponsavel: dadosFinais.telefoneResponsavel,
              professorResponsavelId: data.professorResponsavelId,
            },
          });
          break;

        case 'PROFESSOR':
          // Professor precisa ser Aluno também (para ter faixa/graduação)
          aluno = await tx.aluno.create({
            data: {
              pessoaId: pessoa.id,
              faixa,
              graus,
              status: 'ATIVO',
              observacoes: dadosFinais.observacoes,
            },
          });

          // Criar Professor vinculado ao Aluno
          professor = await tx.professor.create({
            data: {
              pessoaId: pessoa.id,
              alunoId: aluno.id,
              modalidades: dadosFinais.modalidades,
              ativo: true,
            },
          });

          // Criar Usuário com perfil PROFESSOR e senha = CPF
          const senhaProfessor = await hashPassword(dadosFinais.cpf);
          usuario = await tx.usuario.create({
            data: {
              email: dadosFinais.email,
              senha: senhaProfessor,
              perfil: 'PROFESSOR',
              pessoaId: pessoa.id,
              academiaId: data.academiaId,
              ativo: true,
            },
          });
          break;

        case 'ADMIN':
        case 'RECEPCIONISTA':
          // Criar Usuário com perfil correspondente e senha = CPF
          const senhaUsuario = await hashPassword(dadosFinais.cpf);
          usuario = await tx.usuario.create({
            data: {
              email: dadosFinais.email,
              senha: senhaUsuario,
              perfil: data.papel,
              pessoaId: pessoa.id,
              academiaId: data.academiaId,
              ativo: true,
            },
          });
          break;
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
        aluno,
        professor,
        usuario: usuario ? { id: usuario.id, email: usuario.email, perfil: usuario.perfil } : null,
        papel: data.papel,
        senhaInicial: usuario ? 'CPF (sem pontuação)' : null,
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
