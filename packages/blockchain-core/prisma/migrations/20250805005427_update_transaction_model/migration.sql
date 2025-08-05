/*
  Warnings:

  - You are about to drop the `transactions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."transactions" DROP CONSTRAINT "transactions_block_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."transactions" DROP CONSTRAINT "transactions_from_address_fkey";

-- DropForeignKey
ALTER TABLE "public"."transactions" DROP CONSTRAINT "transactions_to_address_fkey";

-- DropForeignKey
ALTER TABLE "public"."transactions" DROP CONSTRAINT "transactions_user_id_fkey";

-- DropTable
DROP TABLE "public"."transactions";

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "user_id" TEXT,
    "from_wallet_id" TEXT,
    "to_wallet_id" TEXT,
    "block_id" TEXT,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "gas_price" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "gas_limit" DECIMAL(65,30) NOT NULL DEFAULT 21000,
    "gas_used" DECIMAL(65,30),
    "type" TEXT NOT NULL DEFAULT 'TRANSFER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "block_number" INTEGER,
    "raw_transaction" TEXT,
    "receipt" JSONB,
    "data" TEXT,
    "error" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_hash_key" ON "public"."Transaction"("hash");

-- CreateIndex
CREATE INDEX "Transaction_from_address_idx" ON "public"."Transaction"("from_address");

-- CreateIndex
CREATE INDEX "Transaction_to_address_idx" ON "public"."Transaction"("to_address");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "public"."Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_timestamp_idx" ON "public"."Transaction"("timestamp");

-- CreateIndex
CREATE INDEX "Transaction_user_id_idx" ON "public"."Transaction"("user_id");

-- CreateIndex
CREATE INDEX "Transaction_from_wallet_id_idx" ON "public"."Transaction"("from_wallet_id");

-- CreateIndex
CREATE INDEX "Transaction_to_wallet_id_idx" ON "public"."Transaction"("to_wallet_id");

-- CreateIndex
CREATE INDEX "Transaction_block_id_idx" ON "public"."Transaction"("block_id");

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_from_wallet_id_fkey" FOREIGN KEY ("from_wallet_id") REFERENCES "public"."wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_to_wallet_id_fkey" FOREIGN KEY ("to_wallet_id") REFERENCES "public"."wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
