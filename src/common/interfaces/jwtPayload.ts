import { user_type } from '@prisma/client';

export interface JwtPayload {
  id: string;
  email: string;
  username: string;
  type: user_type;
}
