import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateQuestionDto } from './create-question.dto';

export class UpdateQuestionDto extends PartialType(
  PickType(CreateQuestionDto, [
    'question_text',
    'model_answer',
    'question_grade',
  ] as const),
) {}
