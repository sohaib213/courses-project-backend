import { IsUUID, IsString, MinLength } from 'class-validator';

export class CourseMessageDto {
  @IsUUID()
  courseId: string;

  @IsString()
  @MinLength(1)
  content: string;
}
