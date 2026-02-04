import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { PrismaService } from 'prisma/prisma.service';
import { content_type, question_type } from '@prisma/client';
import { LessonsService } from 'src/lessons/lessons.service';
import { JwtPayload } from 'src/common/interfaces/jwtPayload';
import { AddOptionDto } from './dto/add-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lessonsService: LessonsService,
  ) {}

  async validateLessonAccess(lessonId: string, teacherId: string) {
    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      include: { courses: true },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.content_type !== content_type.Quiz) {
      throw new BadRequestException(
        'Questions can only be added to Quiz lessons',
      );
    }

    if (!lesson.courses) {
      throw new NotFoundException('Course not found for this lesson');
    }

    if (lesson.courses.teacher_id !== teacherId) {
      throw new UnauthorizedException(
        'You are not authorized to modify this quiz',
      );
    }

    return lesson;
  }

  async validateQuestionAccess(
    questionId: string,
    teacherId: string,
    getOptions: boolean = false,
  ) {
    const question = await this.prisma.questions.findUnique({
      where: { id: questionId },
      include: {
        lessons: {
          include: {
            courses: true,
          },
        },
        options: getOptions,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (!question.lessons) {
      throw new NotFoundException('Lesson not found for this question');
    }

    if (question.lessons.content_type !== content_type.Quiz) {
      throw new BadRequestException('Question must belong to a Quiz lesson');
    }

    if (!question.lessons.courses) {
      throw new NotFoundException('Course not found');
    }

    if (question.lessons.courses.teacher_id !== teacherId) {
      throw new UnauthorizedException(
        'You are not authorized to modify this question',
      );
    }

    return question;
  }

  async create(createQuestionDto: CreateQuestionDto, teacher_id: string) {
    await this.validateLessonAccess(createQuestionDto.lesson_id, teacher_id);

    if (
      createQuestionDto.question_type === question_type.Essay &&
      !createQuestionDto.model_answer
    ) {
      throw new BadRequestException(
        'Model answer is required for essay questions',
      );
    }

    if (
      createQuestionDto.question_type !== question_type.Essay &&
      createQuestionDto.model_answer
    ) {
      throw new BadRequestException(
        'Model answer can exist just for essay question',
      );
    }
    return await this.prisma.questions.create({
      data: {
        lesson_id: createQuestionDto.lesson_id,
        question_text: createQuestionDto.question_text,
        question_type: createQuestionDto.question_type,
        model_answer: createQuestionDto.model_answer,
      },
    });
  }

  async findAll(lesson_id: string, user: JwtPayload) {
    const { lesson, isTeacher } = await this.lessonsService.findOne(
      lesson_id,
      user,
    );

    if (lesson.content_type !== content_type.Quiz) {
      throw new BadRequestException('This lesson is not a quiz');
    }

    return await this.prisma.questions.findMany({
      where: { lesson_id: lesson_id },
      include: {
        options: {
          select: {
            id: true,
            option_text: true,
            is_correct: isTeacher,
          },
        },
      },
    });
  }

  async findOne(id: string, user: JwtPayload) {
    const question = await this.prisma.questions.findUnique({
      where: { id },
      include: {
        lessons: true,
        options: true,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (!question.lessons) {
      throw new NotFoundException('Lesson not found for this question');
    }

    const { isTeacher } = await this.lessonsService.findOne(
      question.lessons.id,
      user,
    );

    if (!isTeacher) {
      question.options.map((option) => ({
        id: option.id,
        option_text: option.option_text,
      }));
    }

    return question;
  }

  async update(
    id: string,
    updateQuestionDto: UpdateQuestionDto,
    teacherId: string,
  ) {
    await this.validateQuestionAccess(id, teacherId);

    return await this.prisma.questions.update({
      where: { id },
      data: {
        ...updateQuestionDto,
      },
    });
  }

  async remove(id: string, teacher_id: string) {
    await this.validateQuestionAccess(id, teacher_id);

    await this.prisma.questions.delete({ where: { id } });

    return { message: 'Question deleted successfully' };
  }

  async addOption(
    question_id: string,
    addOptionDto: AddOptionDto,
    teacherId: string,
  ) {
    const question = await this.validateQuestionAccess(
      question_id,
      teacherId,
      true,
    );

    if (question.question_type === question_type.Essay)
      throw new BadRequestException("can't add options to essay questions");
    if (addOptionDto.is_correct) {
      const correctOption = question.options.find(
        (option) => option.is_correct,
      );
      if (correctOption)
        throw new BadRequestException(
          'there is already correct option for this question',
        );
    }

    return await this.prisma.options.create({
      data: {
        question_id,
        option_text: addOptionDto.option_text,
        is_correct: addOptionDto.is_correct,
      },
    });
  }

  async deleteOption(id: string, teacher_id: string) {
    const option = await this.prisma.options.findUnique({
      where: { id },
    });

    if (!option) throw new NotFoundException('option with id not found');

    await this.validateQuestionAccess(option.question_id, teacher_id);

    await this.prisma.options.delete({ where: { id } });

    return { message: 'option deleted successfully' };
  }

  async updateOption(
    id: string,
    teacher_id: string,
    updateOptionDto: UpdateOptionDto,
  ) {
    const option = await this.prisma.options.findUnique({
      where: { id },
    });

    if (!option) throw new NotFoundException('option with id not found');

    const question = await this.validateQuestionAccess(
      option.question_id,
      teacher_id,
      true,
    );

    if (
      updateOptionDto.is_correct !== undefined &&
      updateOptionDto.is_correct
    ) {
      const hasCorrectOption = question.options.some(
        (option) => option.is_correct && option.id !== id,
      );
      if (hasCorrectOption)
        throw new ForbiddenException(
          'This question already has a correct option',
        );
    }

    return this.prisma.options.update({
      where: { id },
      data: updateOptionDto,
    });
  }
}
