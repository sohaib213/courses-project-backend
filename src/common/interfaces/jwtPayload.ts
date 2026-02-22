import { user_type } from '@prisma/client';

export interface JwtPayload {
  id: string;
  username: string;
  type: user_type;
}
