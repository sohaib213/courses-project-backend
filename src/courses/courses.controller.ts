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
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AuthGuard } from 'src/authentication/gurards/authentication.guard';
import { RoleGuard } from 'src/authentication/gurards/Role.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageFilePipe } from 'src/common/pipes/image-file.pipe';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @UseGuards(AuthGuard, RoleGuard)
  @Post()
  @UseInterceptors(FileInterceptor('thumbnailPic'))
  create(
    @Body() createCourseDto: CreateCourseDto,
    @Request() req,
    @UploadedFile(new ImageFilePipe(false))
    file?: Express.Multer.File,
  ) {
    return this.coursesService.create(
      createCourseDto,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      req.currentUser.id,
      file,
    );
  }

  @Get()
  findAll() {
    return this.coursesService.findAll();
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
    @Request() req,
    @UploadedFile(new ImageFilePipe(false))
    file?: Express.Multer.File,
  ) {
    return this.coursesService.update(
      id,
      updateCourseDto,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      req.currentUser.id,
      file,
    );
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }
}
