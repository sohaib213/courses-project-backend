import { Module } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { EmailService } from './email.service';

@Module({
  controllers: [AuthenticationController],
  providers: [AuthenticationService, EmailService],
})
export class AuthenticationModule {}
