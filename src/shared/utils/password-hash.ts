import bcrypt from 'bcryptjs';
import { CONSTANTS } from '../../config/constants';

export const hashPassword = async (senha: string): Promise<string> => {
  return bcrypt.hash(senha, CONSTANTS.SALT_ROUNDS_BCRYPT);
};

export const comparePassword = async (senha: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(senha, hash);
};
