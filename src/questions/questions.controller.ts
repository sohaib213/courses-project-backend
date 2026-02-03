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
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { RoleGuard } from 'src/common/guards/Role.guard';
import { AuthGuard } from 'src/common/guards/authentication.guard';
import type { ReqWithUser } from 'src/common/interfaces/reqWithUser';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @UseGuards(AuthGuard, RoleGuard)
  @Post()
  async create(
    @Body() createQuestionDto: CreateQuestionDto,
    @Req() req: ReqWithUser,
  ) {
    return await this.questionsService.create(
      createQuestionDto,
      req.currentUser.id,
    );
  }

  @UseGuards(AuthGuard)
  @Get('lesson/:lesson_id')
  findAll(@Req() req: ReqWithUser, @Param('lesson_id') lesson_id: string) {
    return this.questionsService.findAll(lesson_id, req.currentUser);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@Req() req: ReqWithUser, @Param('id') id: string) {
    return this.questionsService.findOne(id, req.currentUser);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Patch(':id')
  async update(
    @Req() req: ReqWithUser,
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    console.log('update dto: ', updateQuestionDto);
    return await this.questionsService.update(
      id,
      updateQuestionDto,
      req.currentUser.id,
    );
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: ReqWithUser) {
    return await this.questionsService.remove(id, req.currentUser.id);
  }
}
