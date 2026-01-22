import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    const apiKey = request.headers['x-api-key'];
    const validApiKey = process.env.API_KEY;

    if (!apiKey || !validApiKey) {
      return false;
    }
    return apiKey === validApiKey;
  }
}
