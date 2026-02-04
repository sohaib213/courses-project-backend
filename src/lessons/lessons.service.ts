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
import { content_type, user_type } from '@prisma/client';
import { JwtPayload } from 'src/common/interfaces/jwtPayload';

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
      if (createLessonDto.content === content_type.Video) {
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
          isReady: createLessonDto.content === content_type.Video,
        },
      });

      await this.prisma.courses.update({
        where: { id: course.id },
        data: { lessons_number: { increment: 1 } },
      });

      await this.prisma.enrollments.updateMany({
        where: {
          course_id: course.id,
        },
        data: { completed: false },
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

  async isAllow(courseId: string, user: JwtPayload) {
    let allow = false;
    const course = await this.prisma.courses.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    allow = user.type === user_type.Teacher && course.teacher_id === user.id;

    if (!allow) {
      const enrollment = await this.prisma.enrollments.findUnique({
        where: {
          student_id_course_id: {
            course_id: courseId,
            student_id: user.id,
          },
        },
      });

      if (enrollment) allow = true;
    }

    if (!allow) {
      throw new UnauthorizedException('you are not allowed to see this lesson');
    }

    return {
      isTeacher:
        user.type === user_type.Teacher && course.teacher_id === user.id,
    };
  }

  async findAll(courseId: string, user: JwtPayload) {
    const { isTeacher } = await this.isAllow(courseId, user);

    return this.prisma.lessons.findMany({
      where: {
        course_id: courseId,
        ...(isTeacher ? {} : { isReady: true }),
      },
      orderBy: { order_number: 'asc' },
    });
  }

  async findOne(id: string, user: JwtPayload) {
    const lesson = await this.prisma.lessons.findUnique({ where: { id } });

    if (!lesson) throw new NotFoundException('No lesson by this id');

    const { isTeacher } = await this.isAllow(lesson.course_id, user);

    if (!isTeacher && !lesson.isReady) {
      throw new UnauthorizedException('This lesson is not ready yet');
    }

    return { lesson, isTeacher };
  }

  getLessonsTitle(courseId: string) {
    return this.prisma.lessons.findMany({
      where: { course_id: courseId, isReady: true },
      select: { title: true, content_type: true },
      orderBy: { order_number: 'asc' },
    });
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

    if ((video || thumbnailPic) && lesson.content_type !== content_type.Video) {
      throw new BadRequestException(
        'You cannot update a lesson with video or thumbnail if it is not a video lesson',
      );
    }

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
          isReady:
            updateLessonDto.isReady !== undefined
              ? updateLessonDto.isReady
              : lesson.isReady,
          video_url: videoUrl,
          video_thumbnail: thumbnailUrl,
        },
      });

      if (videoPublicId) {
        const oldPublicId = this.cloudinaryService.extractPublicId(
          lesson.video_url,
        );
        if (oldPublicId) {
          this.cloudinaryService.deleteVideo(oldPublicId).catch(() => {
            console.error(`Failed to delete old video: ${oldPublicId}`);
          });
        }
      }

      if (thumbnailPublicId) {
        const oldThumbPublicId = this.cloudinaryService.extractPublicId(
          lesson.video_thumbnail,
        );
        if (oldThumbPublicId) {
          this.cloudinaryService.deleteFile(oldThumbPublicId).catch(() => {
            console.error(
              `Failed to delete old thumbnail: ${oldThumbPublicId}`,
            );
          });
        }
      }

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
        `Failed to update lesson: ${error.message}`,
      );
    }
  }

  async remove(id: string, requestingTeacherId: string) {
    const lesson = await this.prisma.lessons.findUnique({
      where: { id },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const course = await this.prisma.courses.findUnique({
      where: { id: lesson.course_id },
    });
    if (!course) {
      throw new BadRequestException('Invalid courseId: Course does not exist');
    }

    if (course.teacher_id !== requestingTeacherId) {
      throw new UnauthorizedException(
        'You are not authorized to remove lessons from this course',
      );
    }
    const lessonNumber = lesson.order_number;

    const deletedLesson = await this.prisma.lessons.delete({
      where: { id },
    });
    await this.prisma.lessons.updateMany({
      where: {
        order_number: { gt: lessonNumber },
        course_id: lesson.course_id,
      },
      data: {
        order_number: {
          decrement: 1,
        },
      },
    });

    await this.prisma.courses.update({
      where: { id: course.id },
      data: { lessons_number: { decrement: 1 } },
    });

    if (deletedLesson && deletedLesson.content_type === content_type.Video) {
      const videoPublicId = this.cloudinaryService.extractPublicId(
        deletedLesson.video_url,
      );
      if (videoPublicId) {
        this.cloudinaryService.deleteVideo(videoPublicId).catch(() => {
          console.error(`Failed to delete video: ${videoPublicId}`);
        });
      }

      const thumbnailPublicId = this.cloudinaryService.extractPublicId(
        deletedLesson.video_thumbnail,
      );
      if (thumbnailPublicId) {
        this.cloudinaryService.deleteFile(thumbnailPublicId).catch(() => {
          console.error(`Failed to delete thumbnail: ${thumbnailPublicId}`);
        });
      }
    }
    return { message: 'Lesson deleted successfully' };
  }
}
