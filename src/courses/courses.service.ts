import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'prisma/prisma.service';
import { course_status, Prisma, user_type } from '@prisma/client';
import { CourseCoverURL } from 'src/common/assets/defaultPhotos';
import { FindCoursesQueryDto } from './dto/find-corse-query.dto';
import { PageLimitDto } from '../common/dtos/page-limit-dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CoursesService {
  defaultURL = CourseCoverURL;

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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
    limit = limit && limit > 0 ? limit : 12;
    const skip = (page - 1) * limit;
    return { skip, limitt: limit };
  }

  async findAll(query: FindCoursesQueryDto, currentUserId?: string) {
    const {
      teacher_id,
      category_id,
      title_description_search,
      min_price,
      max_price,
    } = query;

    const { skip, limitt } = this.calcSkip(query.page, query.limit);

    const baseCacheKey = `courses:${JSON.stringify({
      teacher_id,
      category_id,
      title_description_search,
      min_price,
      max_price,
      page: query.page,
      limit: query.limit,
    })}`;

    let enrolledCourseIds: string[] = [];
    let userType: user_type | null = null;

    if (currentUserId) {
      const userCacheKey = `user:${currentUserId}:data`;
      let userData = await this.cacheManager.get<{
        type: user_type;
        enrollments: string[];
      }>(userCacheKey);

      if (!userData) {
        const currentUser = await this.prisma.users.findUnique({
          where: { id: currentUserId },
          select: {
            type: true,
            enrollments: {
              select: {
                course_id: true,
              },
            },
          },
        });

        if (currentUser) {
          userData = {
            type: currentUser.type,
            enrollments: currentUser.enrollments.map((e) => e.course_id),
          };

          // Cache for 5 minutes
          await this.cacheManager.set(userCacheKey, userData, 5 * 60 * 1000);
        }
      }

      if (userData) {
        userType = userData.type;
        enrolledCourseIds = userData.enrollments;
      }
    }

    const whereClause: Prisma.coursesWhereInput = {
      isReady: true,
      status: course_status.Approved,
    };

    if (teacher_id) {
      whereClause.teacher_id = teacher_id;
    }

    if (category_id) {
      whereClause.category_id = category_id;
    }

    if (min_price !== undefined || max_price !== undefined) {
      whereClause.price = {};
      if (min_price !== undefined) whereClause.price.gte = min_price;
      if (max_price !== undefined) whereClause.price.lte = max_price;
    }

    if (title_description_search) {
      whereClause.OR = [
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
      ];
    }

    if (currentUserId) {
      if (userType === user_type.Teacher && teacher_id === currentUserId) {
        return {
          courses: [],
          count: 0,
        };
      }

      if (userType === user_type.Teacher && !teacher_id) {
        whereClause.teacher_id = { not: currentUserId };
      }

      if (enrolledCourseIds.length > 0) {
        whereClause.id = { notIn: enrolledCourseIds };
      }
    }

    if (!currentUserId) {
      const cached = await this.cacheManager.get(baseCacheKey);
      if (cached) {
        return cached;
      }
    }

    const [courses, totalCount] = await Promise.all([
      this.prisma.courses.findMany({
        where: whereClause,
        include: {
          teacher: {
            select: {
              id: true,
              username: true,
              email: true,
              image: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
        skip,
        take: limitt,
      }),
      this.prisma.courses.count({
        where: whereClause,
      }),
    ]);

    const result = {
      courses,
      count: totalCount,
    };

    if (!currentUserId) {
      await this.cacheManager.set(baseCacheKey, result, 60 * 1000);
    }

    return result;
  }

  async findTeacherCourses(querry: PageLimitDto, teacher_id: string) {
    const { page, limit } = querry;
    const { skip, limitt }: { skip: number; limitt: number } = this.calcSkip(
      page,
      limit,
    );
    const [courses, count] = await Promise.all([
      this.prisma.courses.findMany({
        where: {
          teacher_id,
        },
        include: {
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
        skip,
        take: limitt,
      }),
      this.prisma.courses.count({
        where: {
          teacher_id,
        },
      }),
    ]);

    return {
      courses,
      count,
    };
  }

  async findOne(id: string) {
    const course = await this.prisma.courses.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            email: true,
            image: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        lessons: {
          select: {
            title: true,
            content_type: true,
          },
        },
      },
    });
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

  async coursesNumber() {
    const count = this.prisma.courses.count();
    return count;
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
