import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Get,
} from '@nestjs/common';
import { QuizSubmissionsService } from './submission.service';
import { SubmitDto } from './dto/submit.dto';
import { AuthGuard } from 'src/common/guards/authentication.guard';
import type { ReqWithUser } from 'src/common/interfaces/reqWithUser';

@Controller('submissions')
export class QuizSubmissionsController {
  constructor(private readonly submissionService: QuizSubmissionsService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createSubmissionDto: SubmitDto, @Req() req: ReqWithUser) {
    return this.submissionService.submitQuiz(
      createSubmissionDto,
      req.currentUser,
    );
  }

  @UseGuards(AuthGuard)
  @Get('lesson/:lessonId')
  get(@Req() req: ReqWithUser, @Param('lessonId') lessonId: string) {
    return this.submissionService.getQuizSubmission(lessonId, req.currentUser);
  }
}
