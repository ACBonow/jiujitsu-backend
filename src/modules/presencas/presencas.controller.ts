import { Request, Response, NextFunction } from 'express';
import { presencasService } from './presencas.service';
import { success, paginated } from '../../shared/utils/api-response';
import {
  CreatePresencaInput,
  RegistrarPresencasEmLoteInput,
  PresencaQueryInput,
} from './presencas.schemas';

export class PresencasController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const params = req.query as unknown as PresencaQueryInput;

      const result = await presencasService.findAll({
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

  async findByAula(req: Request, res: Response, next: NextFunction) {
    try {
      const { aulaId } = req.params;
      const presencas = await presencasService.findByAula(aulaId);
      res.json(success(presencas));
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const presenca = await presencasService.findById(id);
      res.json(success(presenca));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreatePresencaInput;
      const usuarioId = req.user!.id;

      const presenca = await presencasService.create(data, usuarioId);

      res.status(201).json(success(presenca, 'Presença registrada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async registrarEmLote(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as RegistrarPresencasEmLoteInput;
      const usuarioId = req.user!.id;

      const result = await presencasService.registrarEmLote(data, usuarioId);

      let message = `${result.registradas} presença(s) registrada(s)`;
      if (result.jaExistentes > 0) {
        message += `. ${result.jaExistentes} já existente(s).`;
      }

      res.status(201).json(success(result, message));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await presencasService.delete(id);

      res.json(success(null, 'Presença removida com sucesso'));
    } catch (error) {
      next(error);
    }
  }
}

export const presencasController = new PresencasController();
