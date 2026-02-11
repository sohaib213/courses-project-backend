import { IsUUID } from 'class-validator';

export class ChangeCorrectOptionDto {
  @IsUUID()
  new_correct_option_id: string;
}
