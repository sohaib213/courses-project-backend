import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  MinLength,
  MaxLength,
  Min,
  IsUUID,
} from 'class-validator';
import { course_difficulty } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateCourseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsUUID()
  category_id: string;

  @IsEnum(course_difficulty)
  difficulty: course_difficulty;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  estimated_duration?: number;
}
