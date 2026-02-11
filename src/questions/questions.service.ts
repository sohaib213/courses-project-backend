import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { PrismaService } from 'prisma/prisma.service';
import { content_type, options, question_type } from '@prisma/client';
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

  async createQuestion(
    createQuestionDto: CreateQuestionDto,
    teacher_id: string,
  ) {
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

    if (
      createQuestionDto.question_type !== question_type.Essay &&
      createQuestionDto.options?.length === 0
    ) {
      throw new BadRequestException(
        'Options are required for non-essay questions',
      );
    }

    if (
      createQuestionDto.question_type === question_type.Essay &&
      createQuestionDto.options &&
      createQuestionDto.options.length > 0
    ) {
      throw new BadRequestException(
        'Options are not allowed for essay questions',
      );
    }

    if (createQuestionDto.question_type === question_type.MultipleChoice) {
      const hasCorrectOption = createQuestionDto.options?.filter(
        (option) => option.is_correct,
      );
      if (hasCorrectOption.length === 0)
        throw new BadRequestException(
          'At least one correct option is required for multiple choice questions',
        );
      if (hasCorrectOption.length > 1)
        throw new BadRequestException(
          'Only one correct option is allowed for multiple choice questions',
        );
    }

    if (createQuestionDto.question_type === question_type.TrueFalse) {
      if (
        !createQuestionDto.options ||
        createQuestionDto.options.length !== 2
      ) {
        throw new BadRequestException(
          'Exactly two options are required for true/false questions',
        );
      }
      const correctOptions = createQuestionDto.options?.filter(
        (option) => option.is_correct,
      );
      if (correctOptions.length === 0)
        throw new BadRequestException(
          'One correct option is required for true/false questions',
        );
      if (correctOptions.length > 1)
        throw new BadRequestException(
          'Only one correct option is allowed for true/false questions',
        );
    }

    const question = await this.prisma.questions.create({
      data: {
        lesson_id: createQuestionDto.lesson_id,
        question_text: createQuestionDto.question_text,
        question_type: createQuestionDto.question_type,
        model_answer: createQuestionDto.model_answer,
        question_grade: createQuestionDto.question_grade,
        options: createQuestionDto.options
          ? {
              create: createQuestionDto.options.map((option) => ({
                option_text: option.option_text,
                is_correct: option.is_correct,
              })),
            }
          : undefined,
      },
    });

    await this.prisma.lessons.update({
      where: { id: createQuestionDto.lesson_id },
      data: {
        quiz_grade: {
          increment: createQuestionDto.question_grade || 0,
        },
      },
    });

    return question;
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
      select: {
        id: true,
        question_text: true,
        question_type: true,
        model_answer: isTeacher,
        question_grade: true,
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
    const question = await this.validateQuestionAccess(id, teacherId);

    if (updateQuestionDto.question_grade) {
      const gradeDifference =
        updateQuestionDto.question_grade - (question.question_grade || 0);
      await this.prisma.lessons.update({
        where: { id: question.lesson_id },
        data: {
          quiz_grade: {
            increment: gradeDifference,
          },
        },
      });
    }
    return await this.prisma.questions.update({
      where: { id },
      data: {
        ...updateQuestionDto,
      },
    });
  }

  async removeQuestion(id: string, teacher_id: string) {
    const question = await this.validateQuestionAccess(id, teacher_id);

    await this.prisma.questions.delete({ where: { id } });

    await this.prisma.lessons.update({
      where: {
        id: question.lesson_id,
      },
      data: {
        quiz_grade: {
          decrement: question.question_grade || 0,
        },
      },
    });

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

    return await this.prisma.options.create({
      data: {
        question_id,
        option_text: addOptionDto.option_text,
      },
    });
  }

  async deleteOption(id: string, teacher_id: string) {
    const option = await this.prisma.options.findUnique({
      where: { id },
    });

    if (!option) throw new NotFoundException('option with id not found');

    if (option.is_correct) {
      throw new BadRequestException(
        'Cannot delete a correct option. Please update the question to have another correct option before deleting this one.',
      );
    }
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
    if (question.question_type === question_type.Essay)
      throw new BadRequestException("can't update options of essay questions");

    return this.prisma.options.update({
      where: { id },
      data: updateOptionDto,
    });
  }

  async changeCorrectOption(
    question_id: string,
    teacher_id: string,
    new_correct_option_id: string,
  ) {
    const question = await this.validateQuestionAccess(
      question_id,
      teacher_id,
      true,
    );
    if (question.question_type === question_type.Essay)
      throw new BadRequestException(
        "can't change correct option for essay questions",
      );

    const newCorrectOption = question.options.find(
      (option) => option.id === new_correct_option_id,
    );

    if (!newCorrectOption) {
      throw new NotFoundException(
        'New correct option not found in this question',
      );
    }

    const currentCorrectOption = question.options.find(
      (option) => option.is_correct,
    );

    const transactionOperations = [];

    if (!currentCorrectOption) {
      transactionOperations.push(
        this.prisma.options.update({
          where: { id: new_correct_option_id },
          data: { is_correct: true },
        }),
      );
    } else {
      if (currentCorrectOption.id === new_correct_option_id) {
        return {
          message:
            'No change needed - the correct option is already set to the requested value',
        };
      }
      transactionOperations.push(
        this.prisma.options.update({
          where: { id: currentCorrectOption.id },
          data: { is_correct: false },
        }),
      );

      transactionOperations.push(
        this.prisma.options.update({
          where: { id: new_correct_option_id },
          data: { is_correct: true },
        }),
      );
    }

    return (await this.prisma.$transaction(transactionOperations)) as options[];
  }
}
