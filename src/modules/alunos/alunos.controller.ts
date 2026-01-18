import { Request, Response, NextFunction } from 'express';
import { alunosService } from './alunos.service';
import { success, paginated } from '../../shared/utils/api-response';
import { CreateAlunoInput, UpdateAlunoInput, AlunoQueryInput } from './alunos.schemas';
import { StatusAluno } from '@prisma/client';

export class AlunosController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, status, faixa, academiaId, search } = req.query as AlunoQueryInput;

      const result = await alunosService.findAll({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status,
        faixa,
        academiaId,
        search,
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

      const aluno = await alunosService.findById(id);

      res.json(success(aluno));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateAlunoInput;

      const aluno = await alunosService.create(data);

      res.status(201).json(success(aluno, 'Aluno cadastrado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body as UpdateAlunoInput;

      const aluno = await alunosService.update(id, data);

      res.json(success(aluno, 'Aluno atualizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await alunosService.delete(id);

      res.json(success(null, 'Aluno excluído com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: StatusAluno };

      const aluno = await alunosService.updateStatus(id, status);

      res.json(success(aluno, `Status do aluno atualizado para ${status}`));
    } catch (error) {
      next(error);
    }
  }

  async getPresencas(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { page, limit } = req.query;

      const result = await alunosService.getPresencas(id, {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
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

  async getGraduacoes(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const graduacoes = await alunosService.getGraduacoes(id);

      res.json(success(graduacoes));
    } catch (error) {
      next(error);
    }
  }
}

export const alunosController = new AlunosController();
