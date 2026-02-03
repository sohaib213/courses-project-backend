import { question_type } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateQuestionDto {
  @IsUUID()
  lesson_id: string;

  @IsString()
  question_text: string;

  @IsEnum(question_type)
  question_type: question_type;

  @IsOptional()
  model_answer?: string;
}
