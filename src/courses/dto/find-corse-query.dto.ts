import { IsOptional, IsUUID } from 'class-validator';
import { PageLimitDto } from '../../common/dtos/page-limit-dto';

export class FindCoursesQueryDto extends PageLimitDto {
  @IsOptional()
  @IsUUID()
  teacher_id?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;
}
