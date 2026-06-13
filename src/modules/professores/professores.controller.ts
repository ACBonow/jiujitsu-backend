import { Request, Response, NextFunction } from 'express';
import { professoresService } from './professores.service';
import { success, paginated } from '../../shared/utils/api-response';
import { CreateProfessorInput, UpdateProfessorInput, professorQuerySchema } from './professores.schemas';

export class ProfessoresController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, ativo, modalidade, academiaId, search } = professorQuerySchema.parse(req.query);

      const result = await professoresService.findAll({
        page,
        limit,
        ativo,
        modalidade,
        academiaId,
        search,
      });

      res.json(
        paginated(
          result.data,
          result.total,
          page ?? 1,
          limit ?? 10
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const professor = await professoresService.findById(id);

      res.json(success(professor));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateProfessorInput;

      const professor = await professoresService.create(data);

      res.status(201).json(success(professor, 'Professor cadastrado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body as UpdateProfessorInput;

      const professor = await professoresService.update(id, data);

      res.json(success(professor, 'Professor atualizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await professoresService.delete(id);

      res.json(success(null, 'Professor excluído com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const professor = await professoresService.toggleStatus(id);

      const statusText = professor.ativo ? 'ativado' : 'desativado';
      res.json(success(professor, `Professor ${statusText} com sucesso`));
    } catch (error) {
      next(error);
    }
  }

  async vincularAcademia(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { academiaId } = req.body;

      await professoresService.vincularAcademia(id, academiaId);

      res.json(success(null, 'Professor vinculado à academia com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async desvincularAcademia(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, academiaId } = req.params;

      await professoresService.desvincularAcademia(id, academiaId);

      res.json(success(null, 'Professor desvinculado da academia com sucesso'));
    } catch (error) {
      next(error);
    }
  }
}

export const professoresController = new ProfessoresController();
