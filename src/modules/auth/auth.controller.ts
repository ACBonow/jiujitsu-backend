import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { success } from '@/shared/utils/api-response';
import { LoginInput, RefreshTokenInput, ChangePasswordInput } from './auth.schemas';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, senha } = req.body as LoginInput;

      const result = await authService.login(email, senha);

      res.json(success(result, 'Login realizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Não autorizado' });
      }

      await authService.logout(req.user.id);

      res.json(success(null, 'Logout realizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body as RefreshTokenInput;

      const tokens = await authService.refresh(refreshToken);

      res.json(success(tokens, 'Tokens renovados com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Não autorizado' });
      }

      const usuario = await authService.me(req.user.id);

      res.json(success(usuario));
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Não autorizado' });
      }

      const { senhaAtual, senhaNova } = req.body as ChangePasswordInput;

      await authService.changePassword(req.user.id, senhaAtual, senhaNova);

      res.json(success(null, 'Senha alterada com sucesso'));
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
