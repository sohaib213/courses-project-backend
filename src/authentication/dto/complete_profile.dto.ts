import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserType } from './register.dto';

export class CompleteProfileDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsEnum(UserType)
  type: UserType;

  @IsString()
  @IsNotEmpty()
  id: string;
}
