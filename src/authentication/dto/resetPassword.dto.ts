import { IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  email: string;
  @IsString()
  new_password: string;
  @IsString()
  confirm_password: string;
  @IsNotEmpty()
  code: string | number;
}
