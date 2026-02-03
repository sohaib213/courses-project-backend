import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { AuthenticationModule } from 'src/authentication/authentication.module';
import { LessonsModule } from 'src/lessons/lessons.module';

@Module({
  imports: [AuthenticationModule, LessonsModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
