import { question_type } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { AddOptionDto } from './add-option.dto';

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

  @IsOptional()
  @IsArray()
  @Type(() => Question_options)
  options: Question_options[];
}

class Question_options extends AddOptionDto {
  @Transform(({ value }: { value: string | boolean }): string | boolean => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'is_correct must be a boolean value' })
  is_correct: boolean;
}
