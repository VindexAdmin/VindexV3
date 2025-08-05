/*
  Warnings:

  - The values [MINT,BURN] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `estimated_time` on the `bridge_transactions` table. All the data in the column will be lost.
  - You are about to alter the column `avg_block_time` on the `network_stats` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,3)` to `DoublePrecision`.
  - You are about to alter the column `tps` on the `network_stats` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,3)` to `DoublePrecision`.
  - You are about to drop the column `apy` on the `staking_positions` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `staking_positions` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `staking_positions` table. All the data in the column will be lost.
  - You are about to drop the column `wallet_id` on the `staking_positions` table. All the data in the column will be lost.
  - You are about to drop the column `from` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `to` on the `transactions` table. All the data in the column will be lost.
  - The `status` column on the `transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `description` on the `validators` table. All the data in the column will be lost.
  - You are about to drop the column `joined_at` on the `validators` table. All the data in the column will be lost.
  - You are about to drop the column `last_seen` on the `validators` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `validators` table. All the data in the column will be lost.
  - You are about to alter the column `commission` on the `validators` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `DoublePrecision`.
  - You are about to drop the column `mnemonic` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the `proposals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `staking_rewards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `votes` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `validator_address` to the `staking_positions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wallet_address` to the `staking_positions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `from_address` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `to_address` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `validators` table without a default value. This is not possible if the table is not empty.
  - Added the required column `encrypted_mnemonic` to the `wallets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `iv` to the `wallets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salt` to the `wallets` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED', 'DROPPED');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."TransactionType_new" AS ENUM ('TRANSFER', 'STAKE', 'UNSTAKE', 'SWAP', 'BRIDGE', 'CONTRACT_CALL', 'CONTRACT_DEPLOY', 'FEE');
ALTER TABLE "public"."transactions" ALTER COLUMN "type" TYPE "public"."TransactionType_new" USING ("type"::text::"public"."TransactionType_new");
ALTER TYPE "public"."TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "public"."TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "public"."TransactionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."staking_positions" DROP CONSTRAINT "staking_positions_wallet_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."transactions" DROP CONSTRAINT "transactions_from_fkey";

-- DropForeignKey
ALTER TABLE "public"."transactions" DROP CONSTRAINT "transactions_to_fkey";

-- DropForeignKey
ALTER TABLE "public"."votes" DROP CONSTRAINT "votes_proposal_id_fkey";

-- DropIndex
DROP INDEX "public"."blocks_hash_idx";

-- DropIndex
DROP INDEX "public"."blocks_index_idx";

-- DropIndex
DROP INDEX "public"."blocks_timestamp_idx";

-- DropIndex
DROP INDEX "public"."bridge_transactions_status_idx";

-- DropIndex
DROP INDEX "public"."bridge_transactions_timestamp_idx";

-- DropIndex
DROP INDEX "public"."bridge_transactions_user_address_idx";

-- DropIndex
DROP INDEX "public"."network_stats_timestamp_idx";

-- DropIndex
DROP INDEX "public"."staking_positions_is_active_idx";

-- DropIndex
DROP INDEX "public"."staking_positions_user_id_idx";

-- DropIndex
DROP INDEX "public"."staking_positions_wallet_id_idx";

-- DropIndex
DROP INDEX "public"."transactions_block_index_idx";

-- DropIndex
DROP INDEX "public"."transactions_from_idx";

-- DropIndex
DROP INDEX "public"."transactions_hash_idx";

-- DropIndex
DROP INDEX "public"."transactions_status_idx";

-- DropIndex
DROP INDEX "public"."transactions_timestamp_idx";

-- DropIndex
DROP INDEX "public"."transactions_to_idx";

-- DropIndex
DROP INDEX "public"."validators_is_active_idx";

-- DropIndex
DROP INDEX "public"."validators_stake_idx";

-- AlterTable
ALTER TABLE "public"."blocks" ALTER COLUMN "gas_limit" SET DEFAULT '1000000',
ALTER COLUMN "gas_limit" SET DATA TYPE TEXT,
ALTER COLUMN "gas_used" SET DEFAULT '0',
ALTER COLUMN "gas_used" SET DATA TYPE TEXT,
ALTER COLUMN "total_fees" SET DEFAULT '0',
ALTER COLUMN "total_fees" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."bridge_transactions" DROP COLUMN "estimated_time",
ADD COLUMN     "estimated_completion" TIMESTAMP(3),
ADD COLUMN     "total_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "user_id" TEXT,
ALTER COLUMN "from_amount" SET DATA TYPE TEXT,
ALTER COLUMN "to_amount" SET DATA TYPE TEXT,
ALTER COLUMN "exchange_rate" SET DATA TYPE TEXT,
ALTER COLUMN "bridge_fee" SET DATA TYPE TEXT,
ALTER COLUMN "destination_address" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."network_stats" ADD COLUMN     "difficulty" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "total_supply" SET DATA TYPE TEXT,
ALTER COLUMN "circulating_supply" SET DATA TYPE TEXT,
ALTER COLUMN "total_staked" SET DATA TYPE TEXT,
ALTER COLUMN "avg_block_time" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "tps" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "network_hashrate" SET DEFAULT '0',
ALTER COLUMN "network_hashrate" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."staking_positions" DROP COLUMN "apy",
DROP COLUMN "duration",
DROP COLUMN "user_id",
DROP COLUMN "wallet_id",
ADD COLUMN     "lock_period" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "validator_address" TEXT NOT NULL,
ADD COLUMN     "wallet_address" TEXT NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE TEXT,
ALTER COLUMN "rewards" SET DEFAULT '0',
ALTER COLUMN "rewards" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."transactions" DROP COLUMN "from",
DROP COLUMN "metadata",
DROP COLUMN "to",
ADD COLUMN     "data" JSONB,
ADD COLUMN     "from_address" TEXT NOT NULL,
ADD COLUMN     "nonce" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "to_address" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT,
ALTER COLUMN "amount" SET DEFAULT '0',
ALTER COLUMN "amount" SET DATA TYPE TEXT,
ALTER COLUMN "fee" SET DEFAULT '0',
ALTER COLUMN "fee" SET DATA TYPE TEXT,
ALTER COLUMN "gas_price" SET DEFAULT '1',
ALTER COLUMN "gas_price" SET DATA TYPE TEXT,
ALTER COLUMN "gas_limit" SET DEFAULT '21000',
ALTER COLUMN "gas_limit" SET DATA TYPE TEXT,
ALTER COLUMN "gas_used" SET DATA TYPE TEXT,
ALTER COLUMN "type" SET DEFAULT 'TRANSFER',
DROP COLUMN "status",
ADD COLUMN     "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "timestamp" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."validators" DROP COLUMN "description",
DROP COLUMN "joined_at",
DROP COLUMN "last_seen",
DROP COLUMN "name",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "last_block_time" TIMESTAMP(3),
ADD COLUMN     "reputation" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "uptime" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ALTER COLUMN "commission" SET DEFAULT 0.05,
ALTER COLUMN "commission" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "stake" SET DEFAULT '0',
ALTER COLUMN "stake" SET DATA TYPE TEXT,
ALTER COLUMN "is_active" SET DEFAULT false;

-- AlterTable
ALTER TABLE "public"."wallets" DROP COLUMN "mnemonic",
ADD COLUMN     "encrypted_mnemonic" TEXT NOT NULL,
ADD COLUMN     "iv" TEXT NOT NULL,
ADD COLUMN     "salt" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."proposals";

-- DropTable
DROP TABLE "public"."staking_rewards";

-- DropTable
DROP TABLE "public"."votes";

-- DropEnum
DROP TYPE "public"."ProposalStatus";

-- DropEnum
DROP TYPE "public"."ProposalType";

-- DropEnum
DROP TYPE "public"."TxStatus";

-- DropEnum
DROP TYPE "public"."VoteChoice";

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_from_address_fkey" FOREIGN KEY ("from_address") REFERENCES "public"."wallets"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_to_address_fkey" FOREIGN KEY ("to_address") REFERENCES "public"."wallets"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bridge_transactions" ADD CONSTRAINT "bridge_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
