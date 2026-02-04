import { IsUUID } from 'class-validator';

export class McqTfAnswerDto {
  @IsUUID()
  selected_option_id: string;
}
