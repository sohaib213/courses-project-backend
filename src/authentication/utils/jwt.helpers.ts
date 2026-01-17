import { sign, SignOptions } from 'jsonwebtoken';
import { users } from '@prisma/client';

export const generateToken = (user: Partial<users>): string => {
  const secret: string | undefined = process.env.JWT_SECRET_KEY;

  if (!secret) {
    throw new Error('JWT_SECRET_KEY is not defined in environment variables');
  }

  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    type: user.type,
  };

  const options: SignOptions = { expiresIn: '20m' };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return sign(payload, secret, options);
};
