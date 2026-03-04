import {
  Controller,
  Get,
  Param,
  Delete,
  UseGuards,
  Req,
  Patch,
  Post,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { FindEnrollmentDto } from './dto/create-enrollment.dto';
import { AuthGuard } from 'src/common/guards/authentication.guard';
import { RoleGuard } from 'src/common/guards/Role.guard';
import type { ReqWithUser } from 'src/common/interfaces/reqWithUser';
import { IdParamDto } from 'src/common/dtos/idParam.dto';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @UseGuards(AuthGuard)
  @Get()
  findMyEnrollments(@Req() req: ReqWithUser) {
    return this.enrollmentsService.findMyEnrollments(req.currentUser.id);
  }

  @UseGuards(AuthGuard)
  @Post('course/:id')
  enrollInFreeCourse(@Param() { id }: IdParamDto, @Req() req: ReqWithUser) {
    return this.enrollmentsService.enrollInFreeCourse(id, req.currentUser.id);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Get('course/:course_id')
  findEnrollmentsInCourse(
    @Param() param: FindEnrollmentDto,
    @Req() req: ReqWithUser,
  ) {
    return this.enrollmentsService.findEnrollmentsInCourse(
      param.course_id,
      req.currentUser.id,
    );
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param() { id }: IdParamDto, @Req() req: ReqWithUser) {
    return this.enrollmentsService.findOne(id, req.currentUser.id);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param() { id }: IdParamDto, @Req() req: ReqWithUser) {
    return this.enrollmentsService.remove(id, req.currentUser.id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  finishLesson(@Param() { id }: IdParamDto, @Req() req: ReqWithUser) {
    return this.enrollmentsService.finishLesson(id, req.currentUser.id);
  }
}
