import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    return {
      prompt: 'select_account', // ✅ Force account selection
      // You can also use:
      // prompt: 'consent' - Show consent screen every time
      // prompt: 'select_account consent' - Both account selection and consent
    };
  }
}
