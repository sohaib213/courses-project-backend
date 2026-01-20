import { user_type } from '@prisma/client';

export interface JwtPayload {
  id: number;
  email: string;
  username: string;
  type: user_type;
}
