-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_cart_id_fkey";

-- DropIndex
DROP INDEX "payments_cart_id_key";

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
