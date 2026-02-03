import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ImageFilePipe } from 'src/common/pipes/image-file.pipe';
import { VideoFilePipe } from 'src/common/pipes/video-fle.pipe';
import { RoleGuard } from 'src/common/guards/Role.guard';
import { AuthGuard } from 'src/common/guards/authentication.guard';
import type { ReqWithUser } from 'src/common/interfaces/reqWithUser';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @UseGuards(AuthGuard, RoleGuard)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnailPic', maxCount: 1 },
    ]),
  )
  async create(
    @Body() createLessonDto: CreateLessonDto,
    @Req() req: ReqWithUser,
    @UploadedFiles()
    files: {
      video?: Express.Multer.File[];
      thumbnailPic?: Express.Multer.File[];
    },
  ) {
    const video = files?.video?.[0];
    const thumbnailPic = files?.thumbnailPic?.[0];

    if (video) {
      const videoPipe = new VideoFilePipe(true);
      try {
        await videoPipe.transform(video);
      } catch {
        throw new BadRequestException('Invalid video file');
      }
    }

    if (thumbnailPic) {
      const imagePipe = new ImageFilePipe(true);
      try {
        await imagePipe.transform(thumbnailPic);
      } catch {
        throw new BadRequestException('Invalid thumbnail file');
      }
    }
    return this.lessonsService.create(
      createLessonDto,
      req.currentUser.id,
      files.video?.[0],
      files.thumbnailPic?.[0],
    );
  }

  @UseGuards(AuthGuard)
  @Get('course/:id')
  findAll(@Param('id') courseId: string, @Req() req: ReqWithUser) {
    return this.lessonsService.findAll(courseId, req.currentUser);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: ReqWithUser) {
    return this.lessonsService.findOne(id, req.currentUser);
  }

  @Get('titles/course/:id')
  getLessonsTitle(@Param('id') courseId: string) {
    return this.lessonsService.getLessonsTitle(courseId);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnailPic', maxCount: 1 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @Req() req: ReqWithUser,
    @UploadedFiles()
    files: {
      video?: Express.Multer.File[];
      thumbnailPic?: Express.Multer.File[];
    },
  ) {
    const video = files?.video?.[0];
    const thumbnailPic = files?.thumbnailPic?.[0];

    if (video) {
      const videoPipe = new VideoFilePipe(false);
      try {
        await videoPipe.transform(video);
      } catch {
        throw new BadRequestException('Invalid video file');
      }
    }

    if (thumbnailPic) {
      const imagePipe = new ImageFilePipe(false);
      try {
        await imagePipe.transform(thumbnailPic);
      } catch {
        throw new BadRequestException('Invalid thumbnail file');
      }
    }

    return this.lessonsService.update(
      id,
      updateLessonDto,
      req.currentUser.id,
      video,
      thumbnailPic,
    );
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: ReqWithUser) {
    return this.lessonsService.remove(id, req.currentUser.id);
  }
}
