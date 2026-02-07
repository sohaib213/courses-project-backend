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
  graded_by_type,
  mcq_tf_answers,
  options,
  question_type,
  questions,
  submissions,
} from '@prisma/client';
import { AiService } from 'src/ai/ai.service';

@Injectable()
export class QuizSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lessonService: LessonsService,
    private readonly aiService: AiService,
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

    const gradedSubmission = await this.prisma.$transaction(async (tx) => {
      // 1️⃣ Create submission
      const createdSubmission = await tx.submissions.create({
        data: {
          lesson_id: submitDto.lesson_id,
          student_id: student.id,
          submittedat: new Date(),
        },
      });

      let totalGrade = 0;

      // 2️⃣ Create answers + nested essay/mcq + AI grading
      for (const answer of submitDto.answers) {
        const question = await tx.questions.findUnique({
          where: { id: answer.question_id },
        });
        if (!question)
          throw new NotFoundException(
            `Question ${answer.question_id} not found`,
          );

        // Type consistency checks
        if (
          (question.question_type === question_type.MultipleChoice ||
            question.question_type === question_type.TrueFalse) &&
          (!answer.mcq_tf_answer || answer.essay_answer)
        ) {
          throw new BadRequestException(
            `Question ${answer.question_id} is ${question.question_type}, so you must provide a mcq_tf_answer only`,
          );
        } else if (
          question.question_type === question_type.Essay &&
          (!answer.essay_answer || answer.mcq_tf_answer)
        ) {
          throw new BadRequestException(
            `Question ${answer.question_id} is an essay, so you must provide an essay_answer only`,
          );
        }

        // Create answer
        const createdAnswer = await tx.answers.create({
          data: {
            submission_id: createdSubmission.id,
            question_id: answer.question_id,
          },
        });

        // Essay answer
        if (answer.essay_answer) {
          await tx.essay_answers.create({
            data: {
              answer_id: createdAnswer.id,
              answer_text: answer.essay_answer.answer_text,
            },
          });

          // AI grading inside transaction
          if (question.model_answer) {
            const aiResult = await this.aiService.gradeEssay({
              questionText: question.question_text,
              modelAnswer: question.model_answer,
              studentAnswer: answer.essay_answer.answer_text,
              maxScore: 5,
            });

            // Update answer + essay_answers
            await tx.answers.update({
              where: { id: createdAnswer.id },
              data: {
                graded_by: 'AI',
                graded_at: new Date(),
                essay_answers: {
                  update: {
                    ai_score: aiResult.score,
                    ai_feedback: aiResult.feedback,
                    similarity_score: aiResult.similarity,
                  },
                },
              },
            });

            totalGrade += aiResult.score;
          }
        }

        // MCQ/TF answer
        if (answer.mcq_tf_answer) {
          const option = await tx.options.findUnique({
            where: { id: answer.mcq_tf_answer.selected_option_id },
          });

          if (!option) throw new NotFoundException(`Option not found`);
          if (option.question_id !== answer.question_id)
            throw new BadRequestException(
              `Option does not belong to this question`,
            );

          await tx.mcq_tf_answers.create({
            data: {
              answer_id: createdAnswer.id,
              selected_option_id: answer.mcq_tf_answer.selected_option_id,
            },
          });

          // Auto-grade MCQ
          if (option.is_correct) totalGrade += 1;

          // Mark graded
          await tx.answers.update({
            where: { id: createdAnswer.id },
            data: {
              graded_by: 'AI',
              graded_at: new Date(),
            },
          });
        }
      }

      // 3️⃣ Update total grade
      const finalSubmission = await tx.submissions.update({
        where: { id: createdSubmission.id },
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

      return finalSubmission;
    });

    return gradedSubmission;
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
