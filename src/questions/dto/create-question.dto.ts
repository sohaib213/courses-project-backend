import { question_type } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateQuestionDto {
  @IsUUID()
  lesson_id: string;

  @IsString()
  question_text: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  question_grade: number;

  @IsEnum(question_type)
  question_type: question_type;

  @IsOptional()
  model_answer?: string;
}
