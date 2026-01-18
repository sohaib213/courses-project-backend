import { Module } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { EmailService } from './email.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AuthGuard } from './authentication.guard';

@Module({
  imports: [CloudinaryModule], // ← Add this line
  controllers: [AuthenticationController],
  providers: [AuthenticationService, EmailService, AuthGuard],
})
export class AuthenticationModule {}
