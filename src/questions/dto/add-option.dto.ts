import { Transform } from 'class-transformer';
import { IsBoolean, IsString } from 'class-validator';

export class AddOptionDto {
  @IsString()
  option_text: string;

  @Transform(({ value }: { value: string | boolean }): string | boolean => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'is_correct must be a boolean value' })
  is_correct: boolean;
}
