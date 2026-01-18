import { IsEmail, IsString } from 'class-validator';

export enum UserType {
  STUDENT = 'Student',
  TEACHER = 'Teacher',
}

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsString()
  password: string;
}
