import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'prisma/prisma.service';
import { course_status, user_type } from '@prisma/client';
import { CourseCoverURL } from 'src/common/assets/defaultPhotos';
import { FindCoursesQueryDto } from './dto/find-corse-query.dto';
import { PageLimitDto } from '../common/dtos/page-limit-dto';

@Injectable()
export class CoursesService {
  defaultURL = CourseCoverURL;

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    createCourseDto: CreateCourseDto,
    teacher_id: string,
    file?: Express.Multer.File,
  ) {
    let thumbnail_url: string = this.defaultURL;
    if (file) {
      try {
        const result = await this.cloudinaryService.uploadFile(
          file,
          'courses/thumbnails',
        );
        thumbnail_url = result.secure_url;
      } catch {
        throw new BadRequestException('Failed to upload thumbnail picture');
      }
    }
    try {
      const newCourse = await this.prisma.courses.create({
        data: {
          ...createCourseDto,
          teacher_id,
          thumbnail_url,
          estimated_duration: createCourseDto.estimated_duration || 0,
        },
      });
      return newCourse;
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Failed to create course');
    }
  }

  calcSkip(page: number, limit: number) {
    page = page && page > 0 ? page : 1;
    limit = limit && limit > 0 ? limit : 10;
    const skip = (page - 1) * limit;
    return { skip, limitt: limit };
  }

  async findAll(querry: FindCoursesQueryDto) {
    const { teacher_id, category_id, title_description_search } = querry;
    const { skip, limitt }: { skip: number; limitt: number } = this.calcSkip(
      querry.page,
      querry.limit,
    );

    // console.log('Query params:', { teacher_id, category_id, page, limit });
    if (teacher_id) {
      const teacher = await this.prisma.users.findUnique({
        where: {
          id: teacher_id,
        },
      });

      if (!teacher || teacher.type !== user_type.Teacher) {
        throw new BadRequestException('invalid teacher id');
      }
    }

    return await this.prisma.courses.findMany({
      where: {
        teacher_id,
        category_id,
        isReady: true,
        status: course_status.Approved,

        ...(title_description_search && {
          OR: [
            {
              title: {
                contains: title_description_search,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: title_description_search,
                mode: 'insensitive',
              },
            },
          ],
        }),
      },
      skip,
      take: limitt,
    });
  }

  async findTeacherCourses(querry: PageLimitDto, teacher_id: string) {
    const { page, limit } = querry;
    const { skip, limitt }: { skip: number; limitt: number } = this.calcSkip(
      page,
      limit,
    );
    return await this.prisma.courses.findMany({
      where: {
        teacher_id,
      },
      skip,
      take: limitt,
    });
  }

  async findOne(id: string) {
    const course = await this.prisma.courses.findUnique({ where: { id } });
    if (!course) {
      throw new BadRequestException('Course not found');
    }
    return course;
  }

  async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
    teacher_id: string,
    imageUrl?: Express.Multer.File,
  ) {
    const course = await this.prisma.courses.findUnique({ where: { id } });
    if (!course) {
      throw new BadRequestException('Course not found');
    }
    if (teacher_id !== course.teacher_id) {
      throw new UnauthorizedException(
        'You are not authorized to update this course',
      );
    }

    let thumbnail_url: string = course.thumbnail_url;
    if (imageUrl) {
      try {
        const result = await this.cloudinaryService.uploadFile(
          imageUrl,
          'courses/thumbnails',
        );
        thumbnail_url = result.secure_url;
      } catch {
        throw new BadRequestException('Failed to upload thumbnail picture');
      }
    }

    try {
      const updatedCourse = await this.prisma.courses.update({
        where: { id },
        data: {
          ...updateCourseDto,
          isReady:
            updateCourseDto.isReady !== undefined
              ? updateCourseDto.isReady
              : course.isReady,
          thumbnail_url,
        },
      });

      if (imageUrl && course.thumbnail_url !== this.defaultURL) {
        const oldPublicId = this.cloudinaryService.extractPublicId(
          course.thumbnail_url,
        );
        if (oldPublicId) {
          this.cloudinaryService.deleteFile(oldPublicId).catch(() => {
            console.error(`Failed to delete old image: ${oldPublicId}`);
          });
        }
      }
      return updatedCourse;
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Failed to update course');
    }
  }

  // admin only
  async getAllCourses(query: PageLimitDto) {
    const { page, limit } = query;
    const { skip, limitt }: { skip: number; limitt: number } = this.calcSkip(
      page,
      limit,
    );

    return await this.prisma.courses.findMany({
      skip,
      take: limitt,
    });
  }
  // admin only
  async getCreatedReadyPendingCourses(query: PageLimitDto) {
    const { page, limit } = query;
    const { skip, limitt }: { skip: number; limitt: number } = this.calcSkip(
      page,
      limit,
    );

    return await this.prisma.courses.findMany({
      where: {
        isReady: true,
        status: course_status.Pending,
      },
      skip,
      take: limitt,
    });
  }
  // admin only
  async remove(id: string) {
    await this.prisma.courses.delete({ where: { id } });
    return `course ${id} removed`;
  }

  // admin only
  async updateCourseStatus(id: string, status: course_status) {
    try {
      const updatedCourse = await this.prisma.courses.update({
        where: { id },
        data: { status },
      });
      return updatedCourse;
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Failed to update course status');
    }
  }
}
// https://res.cloudinary.com/dspfo4tsu/image/upload/v1770119258/courses/thumbnails/qefsmhjczpqd1iapt45e.png
