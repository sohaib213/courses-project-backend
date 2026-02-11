import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PageLimitDto } from '../../common/dtos/page-limit-dto';

export class FindCoursesQueryDto extends PageLimitDto {
  @IsOptional()
  @IsUUID()
  teacher_id?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsString()
  title_description_search?: string;
}
