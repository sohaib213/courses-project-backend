import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { AuthGuard } from 'src/common/guards/authentication.guard';
import type { ReqWithUser } from 'src/common/interfaces/reqWithUser';
import { IdParamDto } from 'src/common/dtos/idParam.dto';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createMessageDto: CreateMessageDto, @Req() req: ReqWithUser) {
    return this.messagesService.create(createMessageDto, req.currentUser.id);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.messagesService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async update(
    @Param() { id }: IdParamDto,
    @Body() updateMessageDto: UpdateMessageDto,
    @Req() req: ReqWithUser,
  ) {
    return this.messagesService.update(
      id,
      updateMessageDto,
      req.currentUser.id,
    );
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Param() { id }: IdParamDto, @Req() req: ReqWithUser) {
    return this.messagesService.remove(id, req.currentUser.id);
  }
}
