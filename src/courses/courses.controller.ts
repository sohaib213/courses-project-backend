import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Query,
  Req,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AuthGuard } from 'src/common/guards/authentication.guard';
import { RoleGuard } from 'src/common/guards/Role.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageFilePipe } from 'src/common/pipes/image-file.pipe';
import { ApiKeyGuard } from 'src/common/guards/api-key.guard.ts.guard';
import type { ReqWithUser } from 'src/common/interfaces/reqWithUser';
import { FindCoursesQueryDto } from './dto/find-corse-query.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @UseGuards(AuthGuard, RoleGuard)
  @Post()
  @UseInterceptors(FileInterceptor('thumbnailPic'))
  create(
    @Body() createCourseDto: CreateCourseDto,
    @Req() req: ReqWithUser,
    @UploadedFile(new ImageFilePipe(false))
    file?: Express.Multer.File,
  ) {
    return this.coursesService.create(
      createCourseDto,
      req.currentUser.id,
      file,
    );
  }

  @Get()
  findAll(@Query() querry: FindCoursesQueryDto) {
    return this.coursesService.findAll(querry);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Get('teacher')
  findTeacherCorses(
    @Query() querry: FindCoursesQueryDto,
    @Req() req: ReqWithUser,
  ) {
    return this.coursesService.findTeacherCourses(querry, req.currentUser.id);
  }

  @UseGuards(ApiKeyGuard)
  @Get('admin/ready')
  getPendingCourses(@Query() querry: FindCoursesQueryDto) {
    return this.coursesService.getCreatedReadyPendingCourses(querry);
  }

  @UseGuards(ApiKeyGuard)
  @Get('admin')
  getAllCourses(@Query() querry: FindCoursesQueryDto) {
    return this.coursesService.getAllCourses(querry);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @UseInterceptors(FileInterceptor('thumbnailPic'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Req() req: ReqWithUser,
    @UploadedFile(new ImageFilePipe(false))
    file?: Express.Multer.File,
  ) {
    return this.coursesService.update(
      id,
      updateCourseDto,
      req.currentUser.id,
      file,
    );
  }

  @UseGuards(ApiKeyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }

  @UseGuards(ApiKeyGuard)
  @Patch(':id/status/:status')
  updateCourseStatus(@Param() params: UpdateStatusDto) {
    return this.coursesService.updateCourseStatus(params.id, params.status);
  }
}
