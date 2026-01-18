import { Request, Response, NextFunction } from 'express';
import { academiasService } from './academias.service';
import { success, paginated } from '@/shared/utils/api-response';
import { CreateAcademiaInput, UpdateAcademiaInput } from './academias.schemas';

export class AcademiasController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, ativo } = req.query;

      const result = await academiasService.findAll({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        ativo: ativo !== undefined ? ativo === 'true' : undefined,
      });

      res.json(
        paginated(
          result.data,
          result.total,
          Number(page) || 1,
          Number(limit) || 10
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const academia = await academiasService.findById(id);

      res.json(success(academia));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateAcademiaInput;

      const academia = await academiasService.create(data);

      res.status(201).json(success(academia, 'Academia criada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body as UpdateAcademiaInput;

      const academia = await academiasService.update(id, data);

      res.json(success(academia, 'Academia atualizada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await academiasService.delete(id);

      res.json(success(null, 'Academia excluída com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const academia = await academiasService.toggleStatus(id);

      const statusText = academia.ativo ? 'ativada' : 'desativada';
      res.json(success(academia, `Academia ${statusText} com sucesso`));
    } catch (error) {
      next(error);
    }
  }
}

export const academiasController = new AcademiasController();
