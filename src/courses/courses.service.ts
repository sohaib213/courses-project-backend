import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class CoursesService {
  defaultURL = 'https://example.com/default-course-image.png';

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

  findAll() {
    return this.prisma.courses.findMany();
  }

  findOne(id: string) {
    return `This action returns a #${id} course`;
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
      throw new BadRequestException(
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

    let numberOfUpdates = 0;
    Object.keys(updateCourseDto).forEach((key) => {
      if (updateCourseDto[key as keyof UpdateCourseDto] !== undefined) {
        numberOfUpdates++;
      }
    });
    if (numberOfUpdates === 0 && !imageUrl) {
      throw new BadRequestException('No data provided for update');
    }
    console.log(updateCourseDto, thumbnail_url);
    try {
      const updatedCourse = await this.prisma.courses.update({
        where: { id },
        data: {
          ...updateCourseDto,
          thumbnail_url,
        },
      });

      const oldPublicId = this.cloudinaryService.extractPublicId(
        course.thumbnail_url,
      );
      if (oldPublicId) {
        this.cloudinaryService.deleteFile(oldPublicId).catch(() => {
          console.error(`Failed to delete old image: ${oldPublicId}`);
        });
      }
      return updatedCourse;
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Failed to update course');
    }
  }

  remove(id: string) {
    return `This action removes a #${id} course`;
  }
}
