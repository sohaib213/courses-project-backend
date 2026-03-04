-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "enrollments_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "enrollments" ALTER COLUMN "current_lesson_order" SET DEFAULT 0;
