import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { SubmitDto } from './dto/submit.dto';
import { JwtPayload } from 'src/common/interfaces/jwtPayload';
import { LessonsService } from 'src/lessons/lessons.service';
import {
  answers,
  essay_answers,
  mcq_tf_answers,
  options,
  question_type,
  questions,
  submissions,
} from '@prisma/client';

@Injectable()
export class QuizSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lessonService: LessonsService,
  ) {}

  async submitQuiz(submitDto: SubmitDto, student: JwtPayload) {
    const { isTeacher } = await this.lessonService.findOne(
      submitDto.lesson_id,
      student,
    );

    if (isTeacher) {
      throw new UnauthorizedException(
        'Teacher cannot submit quiz for his course',
      );
    }

    const existing = await this.prisma.submissions.findUnique({
      where: {
        lesson_id_student_id: {
          lesson_id: submitDto.lesson_id,
          student_id: student.id,
        },
      },
    });
    if (existing)
      throw new BadRequestException('You have already submitted this lesson');

    const submission = await this.prisma.$transaction(async (tx) => {
      // 1️⃣ Create submission
      const createdSubmission = await tx.submissions.create({
        data: {
          lesson_id: submitDto.lesson_id,
          student_id: student.id,
          submittedat: new Date(),
        },
      });

      // 2️⃣ Create answers + nested essay/mcq
      for (const answer of submitDto.answers) {
        const question = await tx.questions.findUnique({
          where: { id: answer.question_id },
        });
        if (!question)
          throw new NotFoundException(
            `Question ${answer.question_id} not found`,
          );

        // Check type consistency
        if (
          question.question_type === question_type.MultipleChoice ||
          question.question_type === question_type.TrueFalse
        ) {
          if (!answer.mcq_tf_answer || answer.essay_answer) {
            throw new BadRequestException(
              `Question ${answer.question_id} is ${question.question_type}, so you must provide a mcq_tf_answer only`,
            );
          }
        } else if (question.question_type === question_type.Essay) {
          if (!answer.essay_answer || answer.mcq_tf_answer) {
            throw new BadRequestException(
              `Question ${answer.question_id} is an essay, so you must provide an essay_answer only`,
            );
          }
        } else {
          throw new BadRequestException(
            `Unknown question type for question ${answer.question_id}`,
          );
        }

        const createdAnswer = await tx.answers.create({
          data: {
            submission_id: createdSubmission.id,
            question_id: answer.question_id,
          },
        });

        if (answer.essay_answer) {
          await tx.essay_answers.create({
            data: {
              answer_id: createdAnswer.id,
              answer_text: answer.essay_answer.answer_text,
            },
          });
        }

        if (answer.mcq_tf_answer) {
          const option = await tx.options.findUnique({
            where: { id: answer.mcq_tf_answer.selected_option_id },
          });

          if (!option) {
            throw new NotFoundException(
              `Option ${answer.mcq_tf_answer.selected_option_id} not found`,
            );
          }

          if (option.question_id !== answer.question_id) {
            throw new BadRequestException(
              `Option ${answer.mcq_tf_answer.selected_option_id} does not belong to question ${answer.question_id}`,
            );
          }

          // 4️⃣ Create mcq_tf_answer
          await tx.mcq_tf_answers.create({
            data: {
              answer_id: createdAnswer.id,
              selected_option_id: answer.mcq_tf_answer.selected_option_id,
            },
          });
        }
      }

      return createdSubmission;
    });

    // 3️⃣ Auto-grade MCQs and calculate total grade
    const gradedSubmission = await this.gradeSubmission(submission.id);

    return gradedSubmission;
  }

  async gradeSubmission(submissionId: string) {
    const submission = await this.prisma.submissions.findUnique({
      where: { id: submissionId },
      include: {
        answers: {
          include: {
            mcq_tf_answers: { include: { options: true } },
            essay_answers: true,
            questions: true,
          },
        },
      },
    });

    if (!submission) throw new NotFoundException('Submission not found');

    let totalGrade = 0;

    for (const answer of submission.answers) {
      if (answer.mcq_tf_answers) {
        answer.mcq_tf_answers['isCorrect'] =
          answer.mcq_tf_answers.options?.is_correct ?? false;
        if (answer.mcq_tf_answers['isCorrect']) totalGrade += 1; // correct
      } else if (answer.essay_answers) {
        // grade essay (AI/manual)
        totalGrade += answer.essay_answers.ai_score ?? 0;
      } else {
        throw new BadRequestException(
          `Answer for question ${answer.question_id} must be either mcq_tf_answer or essay_answer`,
        );
      }
    }

    // Update submission grade
    const updatedSubmission = await this.prisma.submissions.update({
      where: { id: submission.id },
      data: { grade: totalGrade },
      include: {
        answers: {
          include: {
            mcq_tf_answers: true,
            essay_answers: true,
            questions: true,
          },
        },
      },
    });

    return updatedSubmission;
  }

  async getQuizSubmission(lessonId: string, user: JwtPayload) {
    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      include: { courses: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const { isTeacher } = await this.lessonService.isAllow(
      lesson.course_id,
      user,
    );

    // 3️⃣ Fetch submissions
    let submisions: (submissions & {
      answers: (answers & {
        questions: questions;
        mcq_tf_answers: mcq_tf_answers & { options: options | null };
        essay_answers: essay_answers | null;
      })[];
    })[] = [];
    if (isTeacher) {
      submisions = await this.prisma.submissions.findMany({
        where: { lesson_id: lessonId },
        include: {
          answers: {
            include: {
              questions: true,
              mcq_tf_answers: { include: { options: true } },
              essay_answers: true,
            },
          },
        },
      });
    } else {
      const submission = await this.prisma.submissions.findUnique({
        where: {
          lesson_id_student_id: {
            lesson_id: lessonId,
            student_id: user.id,
          },
        },
        include: {
          answers: {
            include: {
              questions: true,
              mcq_tf_answers: { include: { options: true } },
              essay_answers: true,
            },
          },
          users: true,
        },
      });

      if (!submission) {
        throw new NotFoundException('You have not submitted this lesson yet');
      }
      submisions = [submission];
    }

    submisions.forEach((submission) => {
      submission.answers.forEach((answer) => {
        if (answer.mcq_tf_answers) {
          answer.mcq_tf_answers['isCorrect'] =
            answer.mcq_tf_answers.options?.is_correct ?? false;
        }
      });
    });

    return submisions;
  }
}
