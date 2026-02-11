/*
  Warnings:

  - You are about to drop the column `quiz_grade` on the `questions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "questions" DROP COLUMN "quiz_grade",
ADD COLUMN     "question_grade" INTEGER DEFAULT 0;
