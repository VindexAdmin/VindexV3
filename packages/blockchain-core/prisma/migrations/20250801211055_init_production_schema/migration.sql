-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('TRANSFER', 'STAKE', 'UNSTAKE', 'SWAP', 'BRIDGE', 'FEE', 'MINT', 'BURN', 'CONTRACT_CALL', 'CONTRACT_DEPLOY');

-- CreateEnum
CREATE TYPE "public"."TxStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'DROPPED');

-- CreateEnum
CREATE TYPE "public"."BridgeStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."ProposalType" AS ENUM ('PARAMETER_CHANGE', 'SOFTWARE_UPGRADE', 'VALIDATOR_SET_CHANGE', 'TREASURY_SPEND', 'EMERGENCY_ACTION');

-- CreateEnum
CREATE TYPE "public"."ProposalStatus" AS ENUM ('PENDING', 'ACTIVE', 'PASSED', 'REJECTED', 'CANCELLED', 'EXECUTED');

-- CreateEnum
CREATE TYPE "public"."VoteChoice" AS ENUM ('FOR', 'AGAINST', 'ABSTAIN');

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
    "gas_limit" BIGINT NOT NULL DEFAULT 8000000,
    "gas_used" BIGINT NOT NULL DEFAULT 0,
    "transaction_count" INTEGER NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "total_fees" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "signature" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "fee" DECIMAL(18,8) NOT NULL,
    "gas_price" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "gas_limit" BIGINT NOT NULL DEFAULT 21000,
    "gas_used" BIGINT,
    "type" "public"."TransactionType" NOT NULL,
    "status" "public"."TxStatus" NOT NULL DEFAULT 'PENDING',
    "block_id" TEXT,
    "block_index" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "signature" TEXT NOT NULL,
    "metadata" JSONB,
    "error" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bridge_transactions" (
    "id" TEXT NOT NULL,
    "from_network" TEXT NOT NULL,
    "to_network" TEXT NOT NULL,
    "from_token" TEXT NOT NULL,
    "to_token" TEXT NOT NULL,
    "from_amount" DECIMAL(18,8) NOT NULL,
    "to_amount" DECIMAL(18,8) NOT NULL,
    "exchange_rate" DECIMAL(18,8) NOT NULL,
    "bridge_fee" DECIMAL(18,8) NOT NULL,
    "user_address" TEXT NOT NULL,
    "destination_address" TEXT NOT NULL,
    "status" "public"."BridgeStatus" NOT NULL DEFAULT 'PENDING',
    "tx_hash" TEXT,
    "source_tx_hash" TEXT,
    "dest_tx_hash" TEXT,
    "error" TEXT,
    "retry_attempt" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "estimated_time" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "bridge_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staking_positions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER NOT NULL,
    "apy" DECIMAL(5,2) NOT NULL,
    "rewards" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "unstake_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "staking_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staking_rewards" (
    "id" TEXT NOT NULL,
    "staking_position_id" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "block_height" INTEGER NOT NULL,

    CONSTRAINT "staking_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."network_stats" (
    "id" TEXT NOT NULL,
    "chain_length" INTEGER NOT NULL,
    "total_supply" DECIMAL(18,8) NOT NULL,
    "circulating_supply" DECIMAL(18,8) NOT NULL,
    "total_staked" DECIMAL(18,8) NOT NULL,
    "active_validators" INTEGER NOT NULL,
    "avg_block_time" DECIMAL(10,3) NOT NULL,
    "tps" DECIMAL(10,3) NOT NULL,
    "total_transactions" INTEGER NOT NULL,
    "network_hashrate" DECIMAL(20,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."validators" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "commission" DECIMAL(5,2) NOT NULL,
    "stake" DECIMAL(18,8) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blocks_produced" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "validators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."proposals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "proposer" TEXT NOT NULL,
    "type" "public"."ProposalType" NOT NULL,
    "status" "public"."ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "votes_for" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "votes_against" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "votes_abstain" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "execution_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."votes" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "voter" TEXT NOT NULL,
    "choice" "public"."VoteChoice" NOT NULL,
    "weight" DECIMAL(18,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "blocks_index_idx" ON "public"."blocks"("index");

-- CreateIndex
CREATE INDEX "blocks_hash_idx" ON "public"."blocks"("hash");

-- CreateIndex
CREATE INDEX "blocks_timestamp_idx" ON "public"."blocks"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_hash_key" ON "public"."transactions"("hash");

-- CreateIndex
CREATE INDEX "transactions_hash_idx" ON "public"."transactions"("hash");

-- CreateIndex
CREATE INDEX "transactions_from_idx" ON "public"."transactions"("from");

-- CreateIndex
CREATE INDEX "transactions_to_idx" ON "public"."transactions"("to");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "public"."transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_timestamp_idx" ON "public"."transactions"("timestamp");

-- CreateIndex
CREATE INDEX "transactions_block_index_idx" ON "public"."transactions"("block_index");

-- CreateIndex
CREATE INDEX "bridge_transactions_status_idx" ON "public"."bridge_transactions"("status");

-- CreateIndex
CREATE INDEX "bridge_transactions_user_address_idx" ON "public"."bridge_transactions"("user_address");

-- CreateIndex
CREATE INDEX "bridge_transactions_timestamp_idx" ON "public"."bridge_transactions"("timestamp");

-- CreateIndex
CREATE INDEX "staking_positions_user_id_idx" ON "public"."staking_positions"("user_id");

-- CreateIndex
CREATE INDEX "staking_positions_wallet_id_idx" ON "public"."staking_positions"("wallet_id");

-- CreateIndex
CREATE INDEX "staking_positions_is_active_idx" ON "public"."staking_positions"("is_active");

-- CreateIndex
CREATE INDEX "staking_rewards_staking_position_id_idx" ON "public"."staking_rewards"("staking_position_id");

-- CreateIndex
CREATE INDEX "staking_rewards_timestamp_idx" ON "public"."staking_rewards"("timestamp");

-- CreateIndex
CREATE INDEX "network_stats_timestamp_idx" ON "public"."network_stats"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "validators_address_key" ON "public"."validators"("address");

-- CreateIndex
CREATE INDEX "validators_is_active_idx" ON "public"."validators"("is_active");

-- CreateIndex
CREATE INDEX "validators_stake_idx" ON "public"."validators"("stake");

-- CreateIndex
CREATE INDEX "proposals_status_idx" ON "public"."proposals"("status");

-- CreateIndex
CREATE INDEX "proposals_start_time_idx" ON "public"."proposals"("start_time");

-- CreateIndex
CREATE INDEX "proposals_end_time_idx" ON "public"."proposals"("end_time");

-- CreateIndex
CREATE INDEX "votes_proposal_id_idx" ON "public"."votes"("proposal_id");

-- CreateIndex
CREATE INDEX "votes_voter_idx" ON "public"."votes"("voter");

-- CreateIndex
CREATE UNIQUE INDEX "votes_proposal_id_voter_key" ON "public"."votes"("proposal_id", "voter");

-- AddForeignKey
ALTER TABLE "public"."user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_from_fkey" FOREIGN KEY ("from") REFERENCES "public"."wallets"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_to_fkey" FOREIGN KEY ("to") REFERENCES "public"."wallets"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staking_positions" ADD CONSTRAINT "staking_positions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."votes" ADD CONSTRAINT "votes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
