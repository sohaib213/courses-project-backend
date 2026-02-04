import { IsString } from 'class-validator';

export class EssayAnswerDto {
  @IsString()
  answer_text: string;
}
