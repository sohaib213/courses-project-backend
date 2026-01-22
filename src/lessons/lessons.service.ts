import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'prisma/prisma.service';
import { content_type } from '@prisma/client';

@Injectable()
export class LessonsService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService,
  ) {}
  async create(
    createLessonDto: CreateLessonDto,
    requestingTeacherId: string,
    video?: Express.Multer.File,
    thumbnailPic?: Express.Multer.File,
  ) {
    const course = await this.prisma.courses.findUnique({
      where: { id: createLessonDto.courseId },
    });
    if (!course) {
      throw new BadRequestException('Invalid courseId: Course does not exist');
    }
    if (course.teacher_id !== requestingTeacherId) {
      throw new BadRequestException(
        'You are not authorized to add lessons to this course',
      );
    }

    if (createLessonDto.content === content_type.Video && !video) {
      throw new BadRequestException('Video file is required for video lessons');
    }
    let videoUrl: string | null = null;
    let thumbnailUrl: string | null = null;
    let videoPublicId: string | null = null;
    let thumbnailPublicId: string | null = null;

    try {
      if (video) {
        const videoResult = await this.cloudinaryService.uploadVideo(
          video,
          'lessons/videos',
        );
        videoUrl = videoResult.secure_url;
        videoPublicId = videoResult.public_id;

        // Auto-generate thumbnail from video if no custom thumbnail provided
        if (!thumbnailPic) {
          thumbnailUrl = this.cloudinaryService.generateVideoThumbnail(
            videoResult.public_id,
          );
        }
      }

      if (thumbnailPic) {
        const thumbnailResult = await this.cloudinaryService.uploadImage(
          thumbnailPic,
          'lessons/thumbnails',
        );
        thumbnailUrl = thumbnailResult.secure_url;
        thumbnailPublicId = thumbnailResult.public_id;
      }

      const lessonCount = await this.prisma.lessons.count({
        where: {
          course_id: createLessonDto.courseId,
        },
      });

      const nextOrderNumber = lessonCount + 1;

      const lesson = await this.prisma.lessons.create({
        data: {
          title: createLessonDto.title,
          course_id: createLessonDto.courseId,
          content_type: createLessonDto.content,
          order_number: nextOrderNumber,
          video_url: videoUrl,
          video_thumbnail: thumbnailUrl,
        },
      });

      return {
        lesson,
      };
    } catch (error) {
      // Cleanup uploaded files if database operation fails
      if (videoPublicId) {
        await this.cloudinaryService.deleteVideo(videoPublicId).catch((err) => {
          console.error('Failed to cleanup video:', err);
        });
      }
      if (thumbnailPublicId) {
        await this.cloudinaryService
          .deleteFile(thumbnailPublicId)
          .catch((err) => {
            console.error('Failed to cleanup thumbnail:', err);
          });
      }

      throw new BadRequestException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Failed to create lesson: ${error.message}`,
      );
    }
  }

  findAll(courseId?: string) {
    return this.prisma.lessons.findMany({
      where: courseId ? { course_id: courseId } : {},
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} lesson`;
  }

  async update(
    id: string,
    updateLessonDto: UpdateLessonDto,
    requestingTeacherId: string,
    video?: Express.Multer.File,
    thumbnailPic?: Express.Multer.File,
  ) {
    const lesson = await this.prisma.lessons.findUnique({
      where: { id },
    });
    if (!lesson) throw new NotFoundException('lesson not found');

    const course = await this.prisma.courses.findUnique({
      where: { id: lesson.course_id },
    });
    if (!course) {
      throw new BadRequestException('Invalid courseId: Course does not exist');
    }

    if (course.teacher_id !== requestingTeacherId) {
      throw new UnauthorizedException(
        'You are not authorized to update lessons to this course',
      );
    }

    let videoUrl: string = lesson.video_url;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let thumbnailUrl: string = lesson.video_thumbnail;
    let videoPublicId: string | null = null;
    let thumbnailPublicId: string | null = null;

    try {
      if (video) {
        const videoResult = await this.cloudinaryService.uploadVideo(
          video,
          'lessons/videos',
        );
        videoUrl = videoResult.secure_url;
        videoPublicId = videoResult.public_id;
      }

      if (thumbnailPic) {
        const thumbnailResult = await this.cloudinaryService.uploadImage(
          thumbnailPic,
          'lessons/thumbnails',
        );
        thumbnailUrl = thumbnailResult.secure_url;
        thumbnailPublicId = thumbnailResult.public_id;
      }

      const updatedLesson = await this.prisma.lessons.update({
        where: { id },
        data: {
          title: updateLessonDto.title || lesson.title,
          video_url: videoUrl,
          video_thumbnail: thumbnailUrl,
        },
      });

      return {
        updatedLesson,
      };
    } catch (error) {
      // Cleanup uploaded files if database operation fails
      if (videoPublicId) {
        await this.cloudinaryService.deleteVideo(videoPublicId).catch((err) => {
          console.error('Failed to cleanup video:', err);
        });
      }
      if (thumbnailPublicId) {
        await this.cloudinaryService
          .deleteFile(thumbnailPublicId)
          .catch((err) => {
            console.error('Failed to cleanup thumbnail:', err);
          });
      }

      throw new BadRequestException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Failed to create lesson: ${error.message}`,
      );
    }
  }

  remove(id: number) {
    return `This action removes a #${id} lesson`;
  }
}
