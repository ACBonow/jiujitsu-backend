import { Request, Response, NextFunction } from 'express';
import { cadastroPublicoService } from './cadastro-publico.service';
import { success, paginated, error } from '../../shared/utils/api-response';

export class CadastroPublicoController {
  /**
   * POST /api/public/cadastro
   * Endpoint público para pré-cadastro
   */
  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      const resultado = await cadastroPublicoService.criar(req.body);

      return res.status(201).json(
        success(
          {
            id: resultado.id,
            nome: resultado.nome,
            email: resultado.email,
            status: resultado.status,
          },
          'Cadastro realizado com sucesso! Aguarde a aprovação de um administrador.'
        )
      );
    } catch (err: any) {
      return res.status(400).json(error(err.message));
    }
  }

  /**
   * GET /api/public/cadastro/status?email=xxx
   * Verificar status do cadastro por email (público)
   */
  async verificarStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        return res.status(400).json(error('Email é obrigatório'));
      }

      const resultado = await cadastroPublicoService.verificarStatus(email);
      return res.json(success(resultado));
    } catch (err: any) {
      return res.status(500).json(error(err.message));
    }
  }

  /**
   * GET /api/admin/cadastros-pendentes
   * Listar cadastros pendentes (admin)
   */
  async listarPendentes(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const resultado = await cadastroPublicoService.listarPendentes(page, limit);

      return res.json(
        paginated(resultado.cadastros, resultado.total, resultado.page, resultado.limit)
      );
    } catch (err: any) {
      return res.status(500).json(error(err.message));
    }
  }

  /**
   * GET /api/admin/cadastros
   * Listar todos os cadastros com filtro opcional (admin)
   */
  async listarTodos(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as 'PENDENTE' | 'APROVADO' | 'REJEITADO' | undefined;

      const resultado = await cadastroPublicoService.listarTodos(status, page, limit);

      return res.json(
        paginated(resultado.cadastros, resultado.total, resultado.page, resultado.limit)
      );
    } catch (err: any) {
      return res.status(500).json(error(err.message));
    }
  }

  /**
   * GET /api/admin/cadastros/:id
   * Buscar cadastro por ID (admin)
   */
  async buscarPorId(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const cadastro = await cadastroPublicoService.buscarPorId(id);

      if (!cadastro) {
        return res.status(404).json(error('Cadastro não encontrado'));
      }

      return res.json(success(cadastro));
    } catch (err: any) {
      return res.status(500).json(error(err.message));
    }
  }

  /**
   * POST /api/admin/cadastros/:id/aprovar
   * Aprovar cadastro e definir papel (admin)
   */
  async aprovar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id; // Pegar do token JWT

      const resultado = await cadastroPublicoService.aprovar(id, req.body, userId);

      return res.json(
        success(
          resultado,
          `Cadastro aprovado com sucesso! ${resultado.pessoa.nome} foi cadastrado como ${resultado.papel}.`
        )
      );
    } catch (err: any) {
      return res.status(400).json(error(err.message));
    }
  }

  /**
   * POST /api/admin/cadastros/:id/rejeitar
   * Rejeitar cadastro (admin)
   */
  async rejeitar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const userId = req.user?.id;

      const resultado = await cadastroPublicoService.rejeitar(id, motivo, userId);

      return res.json(success(resultado, 'Cadastro rejeitado.'));
    } catch (err: any) {
      return res.status(400).json(error(err.message));
    }
  }
}

export const cadastroPublicoController = new CadastroPublicoController();
