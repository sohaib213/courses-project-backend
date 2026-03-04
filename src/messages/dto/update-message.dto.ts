import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateMessageDto } from './create-message.dto';

export class UpdateMessageDto extends PartialType(
  PickType(CreateMessageDto, ['content']),
) {}
