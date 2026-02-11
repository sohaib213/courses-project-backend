import { IsString } from 'class-validator';

export class AddOptionDto {
  @IsString()
  option_text: string;
}
