-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('TRANSFER', 'STAKE', 'UNSTAKE', 'SWAP', 'BRIDGE', 'CONTRACT_CALL', 'CONTRACT_DEPLOY', 'FEE');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED', 'DROPPED');

-- CreateEnum
CREATE TYPE "public"."BridgeStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "device_info" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "encrypted_private_key" TEXT NOT NULL,
    "mnemonic" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Main Wallet',
    "balance" TEXT NOT NULL DEFAULT '0',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blocks" (
    "id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "previous_hash" TEXT NOT NULL,
    "merkle_root" TEXT NOT NULL,
    "state_root" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "validator" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "transaction_count" INTEGER NOT NULL,
    "total_fees" TEXT NOT NULL DEFAULT '0',
    "gas_used" TEXT NOT NULL DEFAULT '0',
    "gas_limit" TEXT NOT NULL DEFAULT '1000000',
    "signature" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "amount" TEXT NOT NULL DEFAULT '0',
    "fee" TEXT NOT NULL DEFAULT '0',
    "gas_price" TEXT NOT NULL DEFAULT '1',
    "gas_limit" TEXT NOT NULL DEFAULT '21000',
    "gas_used" TEXT,
    "type" "public"."TransactionType" NOT NULL DEFAULT 'TRANSFER',
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "block_id" TEXT,
    "block_index" INTEGER,
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signature" TEXT NOT NULL,
    "data" JSONB,
    "error" TEXT,
    "user_id" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bridge_transactions" (
    "id" TEXT NOT NULL,
    "from_network" TEXT NOT NULL,
    "to_network" TEXT NOT NULL,
    "from_token" TEXT NOT NULL,
    "to_token" TEXT NOT NULL,
    "from_amount" TEXT NOT NULL,
    "to_amount" TEXT NOT NULL,
    "exchange_rate" TEXT NOT NULL,
    "bridge_fee" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "destination_address" TEXT,
    "status" "public"."BridgeStatus" NOT NULL DEFAULT 'PENDING',
    "tx_hash" TEXT,
    "source_tx_hash" TEXT,
    "dest_tx_hash" TEXT,
    "error" TEXT,
    "retry_attempt" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "estimated_completion" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "user_id" TEXT,

    CONSTRAINT "bridge_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."network_stats" (
    "id" TEXT NOT NULL,
    "chain_length" INTEGER NOT NULL,
    "total_supply" TEXT NOT NULL,
    "circulating_supply" TEXT NOT NULL,
    "total_staked" TEXT NOT NULL,
    "active_validators" INTEGER NOT NULL,
    "avg_block_time" DOUBLE PRECISION NOT NULL,
    "tps" DOUBLE PRECISION NOT NULL,
    "total_transactions" INTEGER NOT NULL,
    "network_hashrate" TEXT NOT NULL DEFAULT '0',
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."validators" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "stake" TEXT NOT NULL DEFAULT '0',
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "blocks_produced" INTEGER NOT NULL DEFAULT 0,
    "last_block_time" TIMESTAMP(3),
    "uptime" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "reputation" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "validators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staking_positions" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "validator_address" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "rewards" TEXT NOT NULL DEFAULT '0',
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unstake_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "lock_period" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "staking_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_key" ON "public"."user_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_address_key" ON "public"."wallets"("address");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_index_key" ON "public"."blocks"("index");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_hash_key" ON "public"."blocks"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_hash_key" ON "public"."transactions"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "validators_address_key" ON "public"."validators"("address");

-- AddForeignKey
ALTER TABLE "public"."user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_from_address_fkey" FOREIGN KEY ("from_address") REFERENCES "public"."wallets"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_to_address_fkey" FOREIGN KEY ("to_address") REFERENCES "public"."wallets"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bridge_transactions" ADD CONSTRAINT "bridge_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
