import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export enum UserType {
  STUDENT = 'Student',
  TEACHER = 'Teacher',
}

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => {
    // Convert any type to string
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'string') {
      return value;
    }
    // Handle null, undefined, objects, etc.
    return String(value);
  })
  password: string;
}
