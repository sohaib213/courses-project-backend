import { course_status } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class UpdateStatusDto {
  @IsUUID()
  id: string;

  @IsEnum(course_status)
  status: course_status;
}
