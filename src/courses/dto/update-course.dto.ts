import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  MinLength,
  MaxLength,
  Min,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { course_difficulty } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsEnum(course_difficulty)
  difficulty?: course_difficulty;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  estimated_duration?: number;

  @IsOptional()
  @Transform(({ value }: { value: string | boolean }): string | boolean => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'isReady must be a boolean value' })
  isReady?: boolean;
}
