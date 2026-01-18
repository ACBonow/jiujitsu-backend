import { Request, Response, NextFunction } from 'express';
import { reservasService } from './reservas.service';
import { success, paginated } from '@/shared/utils/api-response';
import { CreateReservaInput, ReservaQueryInput } from './reservas.schemas';

export class ReservasController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const params = req.query as unknown as ReservaQueryInput;

      const result = await reservasService.findAll({
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
      const reservas = await reservasService.findByAula(aulaId);
      res.json(success(reservas));
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const reserva = await reservasService.findById(id);
      res.json(success(reserva));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateReservaInput;

      const reserva = await reservasService.create(data);

      const message =
        reserva.status === 'CONFIRMADA'
          ? 'Reserva confirmada com sucesso'
          : 'Reserva adicionada à lista de espera';

      res.status(201).json(success(reserva, message));
    } catch (error) {
      next(error);
    }
  }

  async cancelar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const reserva = await reservasService.cancelar(id);

      res.json(success(reserva, 'Reserva cancelada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async confirmar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const reserva = await reservasService.confirmarReserva(id);

      res.json(success(reserva, 'Reserva confirmada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await reservasService.delete(id);

      res.json(success(null, 'Reserva excluída com sucesso'));
    } catch (error) {
      next(error);
    }
  }
}

export const reservasController = new ReservasController();
