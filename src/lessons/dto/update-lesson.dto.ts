import { IsString } from 'class-validator';

export class UpdateLessonDto {
  @IsString()
  title: string;
}
