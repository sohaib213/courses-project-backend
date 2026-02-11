-- DropForeignKey
ALTER TABLE "answers" DROP CONSTRAINT "answers_submission_id_fkey";

-- DropForeignKey
ALTER TABLE "essay_answers" DROP CONSTRAINT "essay_answers_answer_id_fkey";

-- DropForeignKey
ALTER TABLE "mcq_tf_answers" DROP CONSTRAINT "mcq_tf_answers_answer_id_fkey";

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "quiz_grade" INTEGER DEFAULT 0;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "essay_answers" ADD CONSTRAINT "essay_answers_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mcq_tf_answers" ADD CONSTRAINT "mcq_tf_answers_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
