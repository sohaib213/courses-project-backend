import { PartialType, PickType } from '@nestjs/mapped-types';
import { AddOptionDto } from './add-option.dto';

export class UpdateOptionDto extends PartialType(
  PickType(AddOptionDto, ['option_text'] as const),
) {}
