import { Request } from 'express';
import { JwtPayload } from './jwtPayload';

export interface ReqWithUser extends Request {
  currentUser: JwtPayload;
}
