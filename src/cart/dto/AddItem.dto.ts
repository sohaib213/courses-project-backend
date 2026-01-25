import { IsString, IsUUID } from 'class-validator';

export class AddItemDto {
  @IsString()
  @IsUUID()
  course_id: string;
}
