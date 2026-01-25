import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { user_type } from '@prisma/client';
import { ReqWithUser } from '../interfaces/reqWithUser';

@Injectable()
export class RoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: ReqWithUser = context.switchToHttp().getRequest();
    if (request.currentUser.type !== user_type.Teacher) {
      throw new ForbiddenException('Access denied');
    }
    return true;
  }
}
