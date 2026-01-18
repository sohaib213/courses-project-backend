import { PartialType } from '@nestjs/mapped-types';
import { RegisterDto } from 'src/authentication/dto/register.dto';

export class UpdateUserDto extends PartialType(RegisterDto) {}
