import { user_type } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CompleteProfileDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsEnum(user_type)
  type: user_type;

  @IsString()
  @IsNotEmpty()
  id: string;
}
