import { Module } from '@nestjs/common';
import { QuizSubmissionsController } from './submission.controller';
import { QuizSubmissionsService } from './submission.service';
import { LessonsModule } from 'src/lessons/lessons.module';
import { AuthenticationModule } from 'src/authentication/authentication.module';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [LessonsModule, AuthenticationModule, AiModule],
  controllers: [QuizSubmissionsController],
  providers: [QuizSubmissionsService],
})
export class QuizSubmissionsModule {}
