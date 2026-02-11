/*
  Warnings:

  - You are about to drop the column `graded_by` on the `answers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "answers" DROP COLUMN "graded_by";

-- DropEnum
DROP TYPE "graded_by_type";
