/*
  Warnings:

  - You are about to drop the column `stripe_payment_intent_id` on the `payments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripe_payment_session_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "payments_stripe_payment_intent_id_key";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "stripe_payment_intent_id",
ADD COLUMN     "stripe_payment_session_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_session_id_key" ON "payments"("stripe_payment_session_id");
