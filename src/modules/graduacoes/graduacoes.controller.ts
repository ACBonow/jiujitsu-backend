import { Request, Response, NextFunction } from 'express';
import { graduacoesService } from './graduacoes.service';
import { success, paginated } from '@/shared/utils/api-response';
import { CreateGraduacaoInput, GraduacaoQueryInput } from './graduacoes.schemas';

export class GraduacoesController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const params = req.query as unknown as GraduacaoQueryInput;

      const result = await graduacoesService.findAll({
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

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const graduacao = await graduacoesService.findById(id);
      res.json(success(graduacao));
    } catch (error) {
      next(error);
    }
  }

  async findByAluno(req: Request, res: Response, next: NextFunction) {
    try {
      const { alunoId } = req.params;
      const graduacoes = await graduacoesService.findByAluno(alunoId);
      res.json(success(graduacoes));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateGraduacaoInput;

      const graduacao = await graduacoesService.create(data);

      res.status(201).json(success(graduacao, 'Promoção registrada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await graduacoesService.delete(id);

      res.json(success(null, 'Graduação removida e aluno revertido ao estado anterior'));
    } catch (error) {
      next(error);
    }
  }
}

export const graduacoesController = new GraduacoesController();
