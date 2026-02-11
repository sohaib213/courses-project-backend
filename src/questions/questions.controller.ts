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
import { AddOptionDto } from './dto/add-option.dto';
import { assertHasUpdatePayload } from 'src/common/utils/checkDataToUpdate';
import { UpdateOptionDto } from './dto/update-option.dto';
import { ChangeCorrectOptionDto } from './dto/ChangeCorrectOptionDto';
import { IdParamDto } from 'src/common/dtos/idParam.dto';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @UseGuards(AuthGuard, RoleGuard)
  @Post()
  async create(
    @Body() createQuestionDto: CreateQuestionDto,
    @Req() req: ReqWithUser,
  ) {
    return await this.questionsService.createQuestion(
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
  findOne(@Req() req: ReqWithUser, @Param() { id }: IdParamDto) {
    return this.questionsService.findOne(id, req.currentUser);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Patch(':id')
  async update(
    @Req() req: ReqWithUser,
    @Param() { id }: IdParamDto,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    assertHasUpdatePayload(updateQuestionDto);

    return await this.questionsService.update(
      id,
      updateQuestionDto,
      req.currentUser.id,
    );
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Delete(':id')
  async remove(@Param() { id }: IdParamDto, @Req() req: ReqWithUser) {
    return await this.questionsService.removeQuestion(id, req.currentUser.id);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Post(':question_id/options')
  async addNewOption(
    @Param('question_id') question_id: string,
    @Body() body: AddOptionDto,
    @Req() req: ReqWithUser,
  ) {
    return await this.questionsService.addOption(
      question_id,
      body,
      req.currentUser.id,
    );
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Delete('options/:id')
  async deleteOption(@Param() { id }: IdParamDto, @Req() req: ReqWithUser) {
    return await this.questionsService.deleteOption(id, req.currentUser.id);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Patch('options/:id')
  async updateOption(
    @Param() { id }: IdParamDto,
    @Req() req: ReqWithUser,
    @Body() body: UpdateOptionDto,
  ) {
    assertHasUpdatePayload(body);

    return await this.questionsService.updateOption(
      id,
      req.currentUser.id,
      body,
    );
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Patch('options/:id/correct')
  async changeCorrectOption(
    @Param() { id }: IdParamDto,
    @Req() req: ReqWithUser,
    @Body() body: ChangeCorrectOptionDto,
  ) {
    return await this.questionsService.changeCorrectOption(
      id,
      req.currentUser.id,
      body.new_correct_option_id,
    );
  }
}
