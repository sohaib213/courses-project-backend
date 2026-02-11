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
import { assertHasUpdatePayload } from 'src/common/utils/checkDataToUpdate';
import { IdParamDto } from 'src/common/dtos/idParam.dto';

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
  findAll(@Param() { id: courseId }: IdParamDto, @Req() req: ReqWithUser) {
    return this.lessonsService.findAll(courseId, req.currentUser);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  async findOne(@Param() { id }: IdParamDto, @Req() req: ReqWithUser) {
    return (await this.lessonsService.findOne(id, req.currentUser)).lesson;
  }

  @Get('titles/course/:id')
  getLessonsTitle(@Param() { id: courseId }: IdParamDto) {
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
    @Param() { id }: IdParamDto,
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

    assertHasUpdatePayload(updateLessonDto, [video, thumbnailPic]);

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
  remove(@Param() { id }: IdParamDto, @Req() req: ReqWithUser) {
    return this.lessonsService.remove(id, req.currentUser.id);
  }
}
