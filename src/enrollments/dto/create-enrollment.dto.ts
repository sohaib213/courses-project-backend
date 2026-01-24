import { IsString, IsUUID } from 'class-validator';

export class FindEnrollmentDto {
  @IsString()
  @IsUUID()
  course_id: string;
}
