-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "user_id" UUID;

-- CreateIndex
CREATE INDEX "idx_payments_user_id" ON "payments"("user_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
