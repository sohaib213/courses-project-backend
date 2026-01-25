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
import { course_status } from '@prisma/client';
import { ApiKeyGuard } from 'src/common/guards/api-key.guard.ts.guard';
import type { FindCoursesQuery } from 'src/common/interfaces/findCoursesQuerry';
import type { ReqWithUser } from 'src/common/interfaces/reqWithUser';

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
  findAll(@Query() querry: FindCoursesQuery) {
    console.log('querry', querry);
    if (querry.page) querry.page = Number(querry.page);
    if (querry.limit) querry.limit = Number(querry.limit);
    return this.coursesService.findAll(querry);
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

  @UseGuards(ApiKeyGuard, RoleGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }

  @UseGuards(ApiKeyGuard)
  @Patch(':id/status/:status')
  updateCourseStatus(
    @Param('id') id: string,
    @Param('status') status: course_status,
  ) {
    return this.coursesService.updateCourseStatus(id, status);
  }
}
