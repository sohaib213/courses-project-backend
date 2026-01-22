import { content_type } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  title: string;

  @IsString()
  courseId: string;

  @IsEnum(content_type)
  content: content_type;
}
