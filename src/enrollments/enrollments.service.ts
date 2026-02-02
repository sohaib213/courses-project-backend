import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findEnrollmentsInCourse(course_id: string, teacherId: string) {
    const course = await this.prisma.courses.findUnique({
      where: { id: course_id },
    });
    if (!course) {
      throw new BadRequestException('Course not found.');
    }
    if (course.teacher_id !== teacherId) {
      throw new UnauthorizedException(
        'You do not have permission to view enrollments for this course.',
      );
    }
    return await this.prisma.enrollments.findMany({
      where: {
        course_id: course_id,
      },
    });
  }

  async findMyEnrollments(userId: string) {
    return await this.prisma.enrollments.findMany({
      where: {
        student_id: userId,
      },
    });
  }

  async findOne(id: string, userId: string) {
    return await this.prisma.enrollments.findUnique({
      where: {
        id,
        student_id: userId,
      },
    });
  }

  async remove(id: string, userId: string) {
    const enrollment = await this.prisma.enrollments.findUnique({
      where: { id },
    });
    if (!enrollment) {
      throw new Error('Enrollment not found.');
    }
    if (enrollment.student_id !== userId) {
      throw new UnauthorizedException(
        'You do not have permission to delete this enrollment.',
      );
    }
    return await this.prisma.enrollments.delete({
      where: {
        id,
      },
    });
  }

  async finishLesson(id: string, userId: string) {
    const enrollment = await this.prisma.enrollments.findUnique({
      where: {
        id,
      },
    });

    if (!enrollment) throw new NotFoundException('enrollment not found');
    if (enrollment.student_id !== userId)
      throw new UnauthorizedException(
        'You are not authorized to access this enrollment',
      );

    const course = await this.prisma.courses.findUnique({
      where: { id: enrollment.course_id },
    });
    if (!course) throw new InternalServerErrorException();

    if (enrollment.current_lesson_order > course.lessons_number)
      throw new ForbiddenException("can't exceed number of lessons in course");

    await this.prisma.enrollments.update({
      where: {
        id,
      },
      data: {
        current_lesson_order: {
          increment: 1,
        },
        completed: enrollment.current_lesson_order === course.lessons_number,
      },
    });
  }

  async isEnrolled(courseId: string, studentId: string): Promise<boolean> {
    const enrollment = await this.prisma.enrollments.findFirst({
      where: {
        course_id: courseId,
        student_id: studentId,
      },
    });
    return enrollment ? true : false;
  }
}
