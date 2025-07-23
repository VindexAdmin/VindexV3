"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VindexBlockchain = void 0;
const Block_1 = require("./Block");
const ProofOfStake_1 = require("../consensus/ProofOfStake");
class VindexBlockchain {
    constructor() {
        this.chain = [];
        this.pendingTransactions = [];
        this.maxTransactionsPerBlock = 1000;
        this.blockTime = 10000;
        this.lastBlockTime = 0;
        this.totalSupply = 1000000000;
        this.circulatingSupply = 0;
        this.swapPairs = new Map();
        this.burnedTokens = 0;
        this.pos = new ProofOfStake_1.ProofOfStake();
        this.createGenesisBlock();
        this.initializeGenesisAccounts();
    }
    createGenesisBlock() {
        const genesisTransactions = [];
        const genesisBlock = new Block_1.Block(0, genesisTransactions, '0', 'genesis');
        genesisBlock.timestamp = Date.now();
        genesisBlock.hash = genesisBlock.calculateHash();
        genesisBlock.signature = 'genesis_signature';
        this.chain.push(genesisBlock);
        this.lastBlockTime = genesisBlock.timestamp;
    }
    initializeGenesisAccounts() {
        const genesisAccounts = [
            { address: 'vindex_genesis_validator_1', balance: 100000000 },
            { address: 'vindex_genesis_validator_2', balance: 80000000 },
            { address: 'vindex_genesis_validator_3', balance: 60000000 },
            { address: 'vindex_treasury', balance: 200000000 },
            { address: 'vindex_community_fund', balance: 100000000 },
            { address: 'vindex_development_fund', balance: 50000000 },
        ];
        genesisAccounts.forEach(genesis => {
            this.pos.createAccount(genesis.address, genesis.balance);
            this.circulatingSupply += genesis.balance;
        });
        const reservedTokens = this.totalSupply - this.circulatingSupply;
        this.pos.createAccount('vindex_reserve', reservedTokens);
    }
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }
    addTransaction(transaction) {
        if (!transaction.isValid()) {
            throw new Error('Invalid transaction');
        }
        const senderAccount = this.pos.getAccount(transaction.from);
        if (!senderAccount) {
            throw new Error('Sender account not found');
        }
        const totalRequired = transaction.amount + transaction.fee;
        if (senderAccount.balance < totalRequired) {
            throw new Error('Insufficient balance');
        }
        const isDuplicate = this.pendingTransactions.some(tx => tx.from === transaction.from &&
            tx.to === transaction.to &&
            tx.amount === transaction.amount &&
            Math.abs(tx.timestamp - transaction.timestamp) < 60000);
        if (isDuplicate) {
            throw new Error('Duplicate transaction detected');
        }
        this.pendingTransactions.push(transaction);
        this.tryAutoMining();
        return true;
    }
    tryAutoMining() {
        const now = Date.now();
        const timeSinceLastBlock = now - this.lastBlockTime;
        const shouldMine = this.pendingTransactions.length >= this.maxTransactionsPerBlock ||
            (this.pendingTransactions.length > 0 && timeSinceLastBlock >= this.blockTime);
        if (shouldMine) {
            this.mineBlock();
        }
    }
    mineBlock() {
        if (this.pendingTransactions.length === 0) {
            return null;
        }
        const latestBlock = this.getLatestBlock();
        const nextValidator = this.pos.selectValidator(latestBlock.index + 1);
        const sortedTransactions = [...this.pendingTransactions]
            .sort((a, b) => b.fee - a.fee)
            .slice(0, this.maxTransactionsPerBlock);
        const validTransactions = [];
        for (const tx of sortedTransactions) {
            if (this.processTransaction(tx)) {
                validTransactions.push(tx);
            }
        }
        const newBlock = new Block_1.Block(latestBlock.index + 1, validTransactions, latestBlock.hash, nextValidator);
        newBlock.signBlock('validator_private_key_' + nextValidator);
        this.chain.push(newBlock);
        this.lastBlockTime = newBlock.timestamp;
        this.pos.updateValidatorAfterBlock(nextValidator, newBlock.index);
        if (newBlock.reward > 0) {
            this.pos.distributeStakingRewards(newBlock.reward, nextValidator);
        }
        this.pendingTransactions = this.pendingTransactions.filter(tx => !validTransactions.some(vtx => vtx.id === tx.id));
        return newBlock;
    }
    processTransaction(transaction) {
        const senderAccount = this.pos.getAccount(transaction.from);
        const totalRequired = transaction.amount + transaction.fee;
        if (!senderAccount || senderAccount.balance < totalRequired) {
            return false;
        }
        switch (transaction.type) {
            case 'transfer':
                return this.processTransfer(transaction);
            case 'stake':
                return this.processStake(transaction);
            case 'unstake':
                return this.processUnstake(transaction);
            case 'swap':
                return this.processSwap(transaction);
            default:
                return false;
        }
    }
    processTransfer(transaction) {
        if (!this.pos.updateAccountBalance(transaction.from, -(transaction.amount + transaction.fee))) {
            return false;
        }
        let receiverAccount = this.pos.getAccount(transaction.to);
        if (!receiverAccount) {
            receiverAccount = this.pos.createAccount(transaction.to, 0);
        }
        this.pos.updateAccountBalance(transaction.to, transaction.amount);
        const senderAccount = this.pos.getAccount(transaction.from);
        if (senderAccount) {
            senderAccount.nonce++;
        }
        return true;
    }
    processStake(transaction) {
        try {
            const validatorAddress = transaction.data?.validator || transaction.to;
            this.pos.stake(transaction.from, validatorAddress, transaction.amount);
            this.pos.updateAccountBalance(transaction.from, -transaction.fee);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    processUnstake(transaction) {
        try {
            const validatorAddress = transaction.data?.validator || transaction.to;
            this.pos.unstake(transaction.from, validatorAddress, transaction.amount);
            this.pos.updateAccountBalance(transaction.from, -transaction.fee);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    processSwap(transaction) {
        try {
            const { tokenA, tokenB, amountIn, minAmountOut } = transaction.data;
            const pairKey = this.getPairKey(tokenA, tokenB);
            const pair = this.swapPairs.get(pairKey);
            if (!pair) {
                return false;
            }
            const amountOut = this.calculateSwapOutput(pair, tokenA, amountIn);
            if (amountOut < minAmountOut) {
                return false;
            }
            if (tokenA === 'VDX') {
                pair.reserveA += amountIn;
                pair.reserveB -= amountOut;
            }
            else {
                pair.reserveB += amountIn;
                pair.reserveA -= amountOut;
            }
            this.pos.updateAccountBalance(transaction.from, -(amountIn + transaction.fee));
            this.pos.updateAccountBalance(transaction.from, amountOut);
            this.swapPairs.set(pairKey, pair);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    calculateSwapOutput(pair, inputToken, amountIn) {
        const fee = 0.003;
        const amountInWithFee = amountIn * (1 - fee);
        if (inputToken === 'VDX') {
            return (pair.reserveB * amountInWithFee) / (pair.reserveA + amountInWithFee);
        }
        else {
            return (pair.reserveA * amountInWithFee) / (pair.reserveB + amountInWithFee);
        }
    }
    getPairKey(tokenA, tokenB) {
        return [tokenA, tokenB].sort().join('-');
    }
    createSwapPair(tokenA, tokenB, reserveA, reserveB) {
        const pairKey = this.getPairKey(tokenA, tokenB);
        if (this.swapPairs.has(pairKey)) {
            return false;
        }
        const pair = {
            tokenA,
            tokenB,
            reserveA,
            reserveB,
            fee: 0.003,
            totalLiquidity: Math.sqrt(reserveA * reserveB)
        };
        this.swapPairs.set(pairKey, pair);
        return true;
    }
    burnTokens(amount) {
        if (amount <= 0)
            return false;
        this.burnedTokens += amount;
        this.circulatingSupply -= amount;
        return true;
    }
    getNetworkStats() {
        const latestBlock = this.getLatestBlock();
        const posStats = this.pos.getNetworkStats();
        const blockCount = this.chain.length;
        const totalTime = blockCount > 1 ? latestBlock.timestamp - this.chain[0].timestamp : 0;
        const averageBlockTime = blockCount > 1 ? totalTime / (blockCount - 1) : 0;
        const totalTransactions = this.chain.reduce((sum, block) => sum + block.transactionCount, 0);
        const tps = totalTime > 0 ? (totalTransactions * 1000) / totalTime : 0;
        return {
            totalSupply: this.totalSupply,
            circulatingSupply: this.circulatingSupply,
            totalStaked: posStats.totalStaked,
            totalValidators: posStats.totalValidators,
            activeValidators: posStats.activeValidators,
            averageBlockTime,
            tps,
            networkHashrate: 0
        };
    }
    getBlock(index) {
        return this.chain[index];
    }
    getBlockByHash(hash) {
        return this.chain.find(block => block.hash === hash);
    }
    getTransaction(txId) {
        for (const block of this.chain) {
            const tx = block.transactions.find(t => t.id === txId);
            if (tx)
                return tx;
        }
        return undefined;
    }
    getBalance(address) {
        const account = this.pos.getAccount(address);
        return account ? account.balance : 0;
    }
    getPendingTransactions() {
        return [...this.pendingTransactions];
    }
    getChainLength() {
        return this.chain.length;
    }
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            if (!currentBlock.isValid()) {
                return false;
            }
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }
    exportChain() {
        return {
            chain: this.chain.map(block => block.toJSON()),
            pendingTransactions: this.pendingTransactions.map(tx => tx.toJSON()),
            totalSupply: this.totalSupply,
            circulatingSupply: this.circulatingSupply,
            burnedTokens: this.burnedTokens,
            swapPairs: Array.from(this.swapPairs.entries())
        };
    }
}
exports.VindexBlockchain = VindexBlockchain;
//# sourceMappingURL=VindexBlockchain.js.map