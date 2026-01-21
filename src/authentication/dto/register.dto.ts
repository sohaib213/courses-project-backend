import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum UserType {
  STUDENT = 'Student',
  TEACHER = 'Teacher',
}

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsEnum(UserType)
  type: UserType;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  confirm_password: string;
}
