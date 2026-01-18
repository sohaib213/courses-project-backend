import { Module } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { EmailService } from './email.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule], // ← Add this line
  controllers: [AuthenticationController],
  providers: [AuthenticationService, EmailService],
})
export class AuthenticationModule {}
