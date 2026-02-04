import { IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EssayAnswerDto } from './essayAnswer.dto';
import { McqTfAnswerDto } from './mcqTfAnswer.dto';

export class AnswerDto {
  @IsUUID()
  question_id: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EssayAnswerDto)
  essay_answer?: EssayAnswerDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => McqTfAnswerDto)
  mcq_tf_answer?: McqTfAnswerDto;
}
