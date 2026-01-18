import { Request, Response, NextFunction } from 'express';
import { planosService, matriculasService, mensalidadesService } from './financeiro.service';
import { success, paginated } from '../../shared/utils/api-response';
import {
  CreatePlanoInput,
  UpdatePlanoInput,
  CreateMatriculaInput,
  UpdateMatriculaInput,
  RegistrarPagamentoInput,
  GerarMensalidadesInput,
  PlanoQueryInput,
  MatriculaQueryInput,
  MensalidadeQueryInput,
} from './financeiro.schemas';

// ==================== PLANOS CONTROLLER ====================

export class PlanosController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const params = req.query as unknown as PlanoQueryInput;
      const result = await planosService.findAll({
        ...params,
        page: params.page ? Number(params.page) : undefined,
        limit: params.limit ? Number(params.limit) : undefined,
      });
      res.json(paginated(result.data, result.total, Number(params.page) || 1, Number(params.limit) || 10));
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const plano = await planosService.findById(id);
      res.json(success(plano));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreatePlanoInput;
      const plano = await planosService.create(data);
      res.status(201).json(success(plano, 'Plano criado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body as UpdatePlanoInput;
      const plano = await planosService.update(id, data);
      res.json(success(plano, 'Plano atualizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await planosService.delete(id);
      res.json(success(null, 'Plano excluído com sucesso'));
    } catch (error) {
      next(error);
    }
  }
}

// ==================== MATRICULAS CONTROLLER ====================

export class MatriculasController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const params = req.query as unknown as MatriculaQueryInput;
      const result = await matriculasService.findAll({
        ...params,
        page: params.page ? Number(params.page) : undefined,
        limit: params.limit ? Number(params.limit) : undefined,
      });
      res.json(paginated(result.data, result.total, Number(params.page) || 1, Number(params.limit) || 10));
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const matricula = await matriculasService.findById(id);
      res.json(success(matricula));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateMatriculaInput;
      const matricula = await matriculasService.create(data);
      res.status(201).json(success(matricula, 'Matrícula criada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body as UpdateMatriculaInput;
      const matricula = await matriculasService.update(id, data);
      res.json(success(matricula, 'Matrícula atualizada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async cancelar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const matricula = await matriculasService.cancelar(id);
      res.json(success(matricula, 'Matrícula cancelada com sucesso'));
    } catch (error) {
      next(error);
    }
  }
}

// ==================== MENSALIDADES CONTROLLER ====================

export class MensalidadesController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const params = req.query as unknown as MensalidadeQueryInput;
      const result = await mensalidadesService.findAll({
        ...params,
        page: params.page ? Number(params.page) : undefined,
        limit: params.limit ? Number(params.limit) : undefined,
      });
      res.json(paginated(result.data, result.total, Number(params.page) || 1, Number(params.limit) || 10));
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const mensalidade = await mensalidadesService.findById(id);
      res.json(success(mensalidade));
    } catch (error) {
      next(error);
    }
  }

  async registrarPagamento(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body as RegistrarPagamentoInput;
      const mensalidade = await mensalidadesService.registrarPagamento(id, data);
      res.json(success(mensalidade, 'Pagamento registrado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async gerarMensalidades(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as GerarMensalidadesInput;
      const result = await mensalidadesService.gerarMensalidades(data);
      res.json(success(result, `${result.geradas} mensalidade(s) gerada(s)`));
    } catch (error) {
      next(error);
    }
  }
}

export const planosController = new PlanosController();
export const matriculasController = new MatriculasController();
export const mensalidadesController = new MensalidadesController();
