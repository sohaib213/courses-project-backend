import { IsString, IsUUID } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsUUID()
  course_id: string;
  @IsString()
  content: string;
}
