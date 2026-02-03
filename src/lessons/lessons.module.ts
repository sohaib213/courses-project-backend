import { Module } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { AuthenticationModule } from 'src/authentication/authentication.module';

@Module({
  imports: [AuthenticationModule, CloudinaryModule],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
