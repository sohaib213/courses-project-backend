import { Module } from '@nestjs/common';
import { QuizSubmissionsController } from './submission.controller';
import { QuizSubmissionsService } from './submission.service';
import { LessonsModule } from 'src/lessons/lessons.module';
import { AuthenticationModule } from 'src/authentication/authentication.module';

@Module({
  imports: [LessonsModule, AuthenticationModule],
  controllers: [QuizSubmissionsController],
  providers: [QuizSubmissionsService],
})
export class QuizSubmissionsModule {}
