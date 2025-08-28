/*
  Warnings:

  - You are about to drop the column `mnemonic` on the `wallets` table. All the data in the column will be lost.
  - Added the required column `walletId` to the `staking_pools` table without a default value. This is not possible if the table is not empty.
  - Added the required column `walletId` to the `swap_trades` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."staking_pools" ADD COLUMN     "walletId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."swap_trades" ADD COLUMN     "walletId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."wallets" DROP COLUMN "mnemonic",
ADD COLUMN     "backupStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "confirmationThreshold" DECIMAL(20,8),
ADD COLUMN     "dailyLimit" DECIMAL(20,8),
ADD COLUMN     "encryptedMnemonic" TEXT,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3),
ADD COLUMN     "lastBackupAt" TIMESTAMP(3),
ADD COLUMN     "mnemonicConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recoveryEmail" TEXT,
ADD COLUMN     "securityLevel" TEXT NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "singleTransactionLimit" DECIMAL(20,8);

-- CreateTable
CREATE TABLE "public"."token_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "balance" DECIMAL(20,8) NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trusted_addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trusted_addresses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."token_balances" ADD CONSTRAINT "token_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."token_balances" ADD CONSTRAINT "token_balances_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."trusted_addresses" ADD CONSTRAINT "trusted_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."trusted_addresses" ADD CONSTRAINT "trusted_addresses_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staking_pools" ADD CONSTRAINT "staking_pools_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."swap_trades" ADD CONSTRAINT "swap_trades_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
