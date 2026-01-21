-- CreateEnum
CREATE TYPE "cart_status" AS ENUM ('Active', 'CheckedOut');

-- CreateEnum
CREATE TYPE "content_type" AS ENUM ('Video', 'Quiz');

-- CreateEnum
CREATE TYPE "course_difficulty" AS ENUM ('Beginner', 'Intermediate', 'Advanced');

-- CreateEnum
CREATE TYPE "course_status" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "graded_by_type" AS ENUM ('AI', 'Teacher');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('Pending', 'Paid', 'Failed');

-- CreateEnum
CREATE TYPE "provider_type" AS ENUM ('local', 'google');

-- CreateEnum
CREATE TYPE "question_type" AS ENUM ('MultipleChoice', 'TrueFalse', 'Essay');

-- CreateEnum
CREATE TYPE "user_type" AS ENUM ('Teacher', 'Student');

-- CreateTable
CREATE TABLE "answers" (
    "id" UUID NOT NULL,
    "submission_id" UUID,
    "question_id" UUID,
    "graded_by" "graded_by_type",
    "graded_at" TIMESTAMP(6),

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL,
    "cart_id" UUID,
    "course_id" UUID,
    "price_at_time" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "status" "cart_status" DEFAULT 'Active',

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "teacher_id" UUID,
    "category_id" UUID,
    "is_published" BOOLEAN DEFAULT false,
    "thumbnail_url" VARCHAR(255),
    "difficulty" "course_difficulty",
    "price" DECIMAL(10,2),
    "estimated_duration" INTEGER,
    "status" "course_status" DEFAULT 'Pending',
    "approved_at" TIMESTAMP(6),
    "createdat" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "student_id" UUID,
    "course_id" UUID,
    "current_lesson_order" INTEGER DEFAULT 1,
    "completed" BOOLEAN DEFAULT false,
    "enrolledat" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "essay_answers" (
    "answer_id" UUID NOT NULL,
    "answer_text" TEXT,
    "ai_score" INTEGER,
    "ai_feedback" TEXT,
    "similarity_score" DOUBLE PRECISION,

    CONSTRAINT "essay_answers_pkey" PRIMARY KEY ("answer_id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "course_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "order_number" INTEGER NOT NULL,
    "content_type" "content_type" NOT NULL,
    "video_url" VARCHAR(255),
    "createdat" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local_credentials" (
    "user_id" UUID NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "verification_code" VARCHAR(255),
    "verification_code_expires_at" TIMESTAMP(6),
    "email_verified" BOOLEAN DEFAULT false,
    "reset_verified" BOOLEAN DEFAULT false,

    CONSTRAINT "local_credentials_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "mcq_tf_answers" (
    "answer_id" UUID NOT NULL,
    "selected_option_id" UUID,

    CONSTRAINT "mcq_tf_answers_pkey" PRIMARY KEY ("answer_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "course_id" UUID,
    "sender_id" UUID,
    "content" TEXT,
    "createdat" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "options" (
    "id" UUID NOT NULL,
    "question_id" UUID,
    "option_text" TEXT,
    "is_correct" BOOLEAN DEFAULT false,

    CONSTRAINT "options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "cart_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "payment_status" DEFAULT 'Pending',
    "paid_at" TIMESTAMP(6),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "lesson_id" UUID,
    "question_text" VARCHAR(255),
    "question_type" "question_type",
    "model_answer" TEXT,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL,
    "lesson_id" UUID,
    "student_id" UUID,
    "submittedat" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "grade" INTEGER,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(255),
    "type" "user_type" NOT NULL,
    "image" VARCHAR(255),
    "points" INTEGER DEFAULT 0,
    "provider" "provider_type" NOT NULL,
    "createdat" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "isprofilecomplete" BOOLEAN DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_answers_question_id" ON "answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "answers_submission_id_question_id_key" ON "answers"("submission_id", "question_id");

-- CreateIndex
CREATE INDEX "idx_cart_items_cart_id" ON "cart_items"("cart_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_course_id_key" ON "cart_items"("cart_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "idx_enrollments_student_id" ON "enrollments"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_student_id_course_id_key" ON "enrollments"("student_id", "course_id");

-- CreateIndex
CREATE INDEX "idx_lessons_course_id" ON "lessons"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_course_id_order_number_key" ON "lessons"("course_id", "order_number");

-- CreateIndex
CREATE INDEX "idx_messages_course_id" ON "messages"("course_id");

-- CreateIndex
CREATE INDEX "idx_options_question_id" ON "options"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_cart_id_key" ON "payments"("cart_id");

-- CreateIndex
CREATE INDEX "idx_payments_cart_id" ON "payments"("cart_id");

-- CreateIndex
CREATE INDEX "idx_questions_lesson_id" ON "questions"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_lesson_id_student_id_key" ON "submissions"("lesson_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "unique_username" ON "users"("username");

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_student_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "essay_answers" ADD CONSTRAINT "essay_answers_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "local_credentials" ADD CONSTRAINT "local_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mcq_tf_answers" ADD CONSTRAINT "mcq_tf_answers_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mcq_tf_answers" ADD CONSTRAINT "mcq_tf_answers_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "options"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
