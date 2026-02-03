import { user_type } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsEnum(user_type)
  type: user_type;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  confirm_password: string;
}
