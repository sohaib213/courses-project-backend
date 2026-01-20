import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserType } from './register.dto';
import { Type } from 'class-transformer';

export class CompleteProfileDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsEnum(UserType)
  type: UserType;

  @IsNotEmpty()
  @Type(() => Number)
  id: number;
}
