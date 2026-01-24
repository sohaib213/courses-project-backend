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
  Query,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ImageFilePipe } from 'src/common/pipes/image-file.pipe';
import { VideoFilePipe } from 'src/common/pipes/video-fle.pipe';
import { RoleGuard } from 'src/common/guards/Role.guard';
import { AuthGuard } from 'src/common/guards/authentication.guard';

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
    @Req() req,
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      req['currentUser'].id,
      files.video?.[0],
      files.thumbnailPic?.[0],
    );
  }

  @Get()
  findAll(@Query() query: { courseId?: string }) {
    return this.lessonsService.findAll(query.courseId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lessonsService.findOne(+id);
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
    @Req() req,
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      req['currentUser'].id,
      video,
      thumbnailPic,
    );
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.lessonsService.remove(id, req['currentUser'].id);
  }
}
