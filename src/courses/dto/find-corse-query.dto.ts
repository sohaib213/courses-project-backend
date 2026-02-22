import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { PageLimitDto } from '../../common/dtos/page-limit-dto';
import { Type } from 'class-transformer';

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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  min_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  max_price?: number;
}
