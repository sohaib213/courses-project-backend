import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Post,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { FindEnrollmentDto } from './dto/create-enrollment.dto';
import { AuthGuard } from 'src/common/guards/authentication.guard';
import { RoleGuard } from 'src/common/guards/Role.guard';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  create(@Body() body: { course_id: string; student_id?: string }) {
    return this.enrollmentsService.create(body.course_id, body.student_id);
  }
  @UseGuards(AuthGuard)
  @Get()
  findMyEnrollments(@Req() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.enrollmentsService.findMyEnrollments(req.currentUser.id);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Get('course/:course_id')
  findEnrollmentsInCourse(@Param() param: FindEnrollmentDto, @Req() req) {
    return this.enrollmentsService.findEnrollmentsInCourse(
      param.course_id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      req.currentUser.id,
    );
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.enrollmentsService.findOne(id, req.currentUser.id);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.enrollmentsService.remove(id, req.currentUser.id);
  }
}
