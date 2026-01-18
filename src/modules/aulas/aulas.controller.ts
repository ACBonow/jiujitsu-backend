import { Request, Response, NextFunction } from 'express';
import { aulasService } from './aulas.service';
import { success, paginated } from '../../shared/utils/api-response';
import {
  CreateTemplateAulaInput,
  UpdateTemplateAulaInput,
  CreateAulaInput,
  UpdateAulaInput,
  AulaQueryInput,
  TemplateAulaQueryInput,
  GerarAulasInput,
} from './aulas.schemas';

export class AulasController {
  // ==================== TEMPLATE DE AULA ====================

  async findAllTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const params = req.query as unknown as TemplateAulaQueryInput;

      const result = await aulasService.findAllTemplates({
        ...params,
        page: params.page ? Number(params.page) : undefined,
        limit: params.limit ? Number(params.limit) : undefined,
      });

      res.json(
        paginated(
          result.data,
          result.total,
          Number(params.page) || 1,
          Number(params.limit) || 10
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async findTemplateById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const template = await aulasService.findTemplateById(id);
      res.json(success(template));
    } catch (error) {
      next(error);
    }
  }

  async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateTemplateAulaInput;
      const template = await aulasService.createTemplate(data);
      res.status(201).json(success(template, 'Template de aula criado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body as UpdateTemplateAulaInput;
      const template = await aulasService.updateTemplate(id, data);
      res.json(success(template, 'Template de aula atualizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async deleteTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await aulasService.deleteTemplate(id);
      res.json(success(null, 'Template de aula excluído com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // ==================== AULA ====================

  async findAllAulas(req: Request, res: Response, next: NextFunction) {
    try {
      const params = req.query as unknown as AulaQueryInput;

      const result = await aulasService.findAllAulas({
        ...params,
        page: params.page ? Number(params.page) : undefined,
        limit: params.limit ? Number(params.limit) : undefined,
      });

      res.json(
        paginated(
          result.data,
          result.total,
          Number(params.page) || 1,
          Number(params.limit) || 10
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async findAulaById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const aula = await aulasService.findAulaById(id);
      res.json(success(aula));
    } catch (error) {
      next(error);
    }
  }

  async createAula(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateAulaInput;
      const aula = await aulasService.createAula(data);
      res.status(201).json(success(aula, 'Aula criada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async updateAula(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body as UpdateAulaInput;
      const aula = await aulasService.updateAula(id, data);
      res.json(success(aula, 'Aula atualizada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async deleteAula(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await aulasService.deleteAula(id);
      res.json(success(null, 'Aula excluída com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async cancelarAula(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const aula = await aulasService.cancelarAula(id);
      res.json(success(aula, 'Aula cancelada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async iniciarAula(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const aula = await aulasService.iniciarAula(id);
      res.json(success(aula, 'Aula iniciada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async concluirAula(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const aula = await aulasService.concluirAula(id);
      res.json(success(aula, 'Aula concluída com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async gerarAulas(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as GerarAulasInput;
      const result = await aulasService.gerarAulas(data);
      res.json(success(result, `${result.created} aulas geradas com sucesso`));
    } catch (error) {
      next(error);
    }
  }
}

export const aulasController = new AulasController();
