import { Block } from './Block';
import { Transaction } from './Transaction';
import { ProofOfStake } from '../consensus/ProofOfStake';
import { NetworkStats, SwapPair } from './types';
import * as crypto from 'crypto-js';

export class VindexBlockchain {
  private chain: Block[] = [];
  private pendingTransactions: Transaction[] = [];
  private pos: ProofOfStake;
  private maxTransactionsPerBlock = 1000;
  private blockTime = 10000; // 10 seconds
  private lastBlockTime = 0;
  private totalSupply = 1000000000; // 1 billion VDX
  private circulatingSupply = 0;
  private swapPairs: Map<string, SwapPair> = new Map();
  private burnedTokens = 0;

  constructor() {
    this.pos = new ProofOfStake();
    this.createGenesisBlock();
    this.initializeGenesisAccounts();
  }

  /**
   * Create the genesis block
   */
  private createGenesisBlock(): void {
    const genesisTransactions: Transaction[] = [];
    const genesisBlock = new Block(0, genesisTransactions, '0', 'genesis');
    
    genesisBlock.timestamp = Date.now();
    genesisBlock.hash = genesisBlock.calculateHash();
    genesisBlock.signature = 'genesis_signature';
    
    this.chain.push(genesisBlock);
    this.lastBlockTime = genesisBlock.timestamp;
  }

  /**
   * Initialize genesis accounts with initial token distribution
   */
  private initializeGenesisAccounts(): void {
    // Create genesis accounts
    const genesisAccounts = [
      { address: 'vindex_genesis_validator_1', balance: 100000000 }, // 100M VDX
      { address: 'vindex_genesis_validator_2', balance: 80000000 },  // 80M VDX
      { address: 'vindex_genesis_validator_3', balance: 60000000 },  // 60M VDX
      { address: 'vindex_treasury', balance: 200000000 },           // 200M VDX for treasury
      { address: 'vindex_community_fund', balance: 100000000 },     // 100M VDX for community
      { address: 'vindex_development_fund', balance: 50000000 },    // 50M VDX for development
    ];

    genesisAccounts.forEach(genesis => {
      this.pos.createAccount(genesis.address, genesis.balance);
      this.circulatingSupply += genesis.balance;
    });

    // Reserve remaining tokens for future distribution
    const reservedTokens = this.totalSupply - this.circulatingSupply;
    this.pos.createAccount('vindex_reserve', reservedTokens);
  }

  /**
   * Get the latest block
   */
  public getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Add a new transaction to pending pool
   */
  public addTransaction(transaction: Transaction): boolean {
    // Validate transaction
    if (!transaction.isValid()) {
      throw new Error('Invalid transaction');
    }

    // Check if sender has sufficient balance
    const senderAccount = this.pos.getAccount(transaction.from);
    if (!senderAccount) {
      throw new Error('Sender account not found');
    }

    const totalRequired = transaction.amount + transaction.fee;
    if (senderAccount.balance < totalRequired) {
      throw new Error('Insufficient balance');
    }

    // Anti-spam: Check for duplicate transactions
    const isDuplicate = this.pendingTransactions.some(tx => 
      tx.from === transaction.from && 
      tx.to === transaction.to && 
      tx.amount === transaction.amount &&
      Math.abs(tx.timestamp - transaction.timestamp) < 60000 // Within 1 minute
    );

    if (isDuplicate) {
      throw new Error('Duplicate transaction detected');
    }

    // Add to pending pool
    this.pendingTransactions.push(transaction);
    
    // Auto-mine if enough transactions or enough time passed
    this.tryAutoMining();
    
    return true;
  }

  /**
   * Try to automatically mine a block
   */
  private tryAutoMining(): void {
    const now = Date.now();
    const timeSinceLastBlock = now - this.lastBlockTime;
    
    // Mine if we have enough transactions or enough time has passed
    const shouldMine = 
      this.pendingTransactions.length >= this.maxTransactionsPerBlock ||
      (this.pendingTransactions.length > 0 && timeSinceLastBlock >= this.blockTime);

    if (shouldMine) {
      this.mineBlock();
    }
  }

  /**
   * Mine a new block
   */
  public mineBlock(): Block | null {
    if (this.pendingTransactions.length === 0) {
      // No reward for empty blocks
      return null;
    }

    const latestBlock = this.getLatestBlock();
    const nextValidator = this.pos.selectValidator(latestBlock.index + 1);
    
    // Select transactions for the block (prioritize by fee)
    const sortedTransactions = [...this.pendingTransactions]
      .sort((a, b) => b.fee - a.fee)
      .slice(0, this.maxTransactionsPerBlock);

    // Process transactions and update state
    const validTransactions: Transaction[] = [];
    
    for (const tx of sortedTransactions) {
      if (this.processTransaction(tx)) {
        validTransactions.push(tx);
      }
    }

    // Create new block
    const newBlock = new Block(
      latestBlock.index + 1,
      validTransactions,
      latestBlock.hash,
      nextValidator
    );

    // Sign the block
    newBlock.signBlock('validator_private_key_' + nextValidator);

    // Add to chain
    this.chain.push(newBlock);
    this.lastBlockTime = newBlock.timestamp;

    // Update validator stats
    this.pos.updateValidatorAfterBlock(nextValidator, newBlock.index);

    // Distribute rewards
    if (newBlock.reward > 0) {
      this.pos.distributeStakingRewards(newBlock.reward, nextValidator);
    }

    // Remove processed transactions from pending pool
    this.pendingTransactions = this.pendingTransactions.filter(tx =>
      !validTransactions.some(vtx => vtx.id === tx.id)
    );

    return newBlock;
  }

  /**
   * Process a transaction and update account states
   */
  private processTransaction(transaction: Transaction): boolean {
    const senderAccount = this.pos.getAccount(transaction.from);
    const totalRequired = transaction.amount + transaction.fee;

    // Verify sender has sufficient balance
    if (!senderAccount || senderAccount.balance < totalRequired) {
      return false;
    }

    // Process based on transaction type
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

  /**
   * Process a transfer transaction
   */
  private processTransfer(transaction: Transaction): boolean {
    // Deduct from sender
    if (!this.pos.updateAccountBalance(transaction.from, -(transaction.amount + transaction.fee))) {
      return false;
    }

    // Add to receiver (create account if doesn't exist)
    let receiverAccount = this.pos.getAccount(transaction.to);
    if (!receiverAccount) {
      receiverAccount = this.pos.createAccount(transaction.to, 0);
    }

    this.pos.updateAccountBalance(transaction.to, transaction.amount);

    // Increment sender nonce
    const senderAccount = this.pos.getAccount(transaction.from);
    if (senderAccount) {
      senderAccount.nonce++;
    }

    return true;
  }

  /**
   * Process a stake transaction
   */
  private processStake(transaction: Transaction): boolean {
    try {
      const validatorAddress = transaction.data?.validator || transaction.to;
      this.pos.stake(transaction.from, validatorAddress, transaction.amount);
      
      // Deduct fee
      this.pos.updateAccountBalance(transaction.from, -transaction.fee);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Process an unstake transaction
   */
  private processUnstake(transaction: Transaction): boolean {
    try {
      const validatorAddress = transaction.data?.validator || transaction.to;
      this.pos.unstake(transaction.from, validatorAddress, transaction.amount);
      
      // Deduct fee
      this.pos.updateAccountBalance(transaction.from, -transaction.fee);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Process a swap transaction (basic DEX functionality)
   */
  private processSwap(transaction: Transaction): boolean {
    try {
      const { tokenA, tokenB, amountIn, minAmountOut } = transaction.data;
      const pairKey = this.getPairKey(tokenA, tokenB);
      const pair = this.swapPairs.get(pairKey);

      if (!pair) {
        return false; // Pair doesn't exist
      }

      // Calculate output amount using constant product formula (x * y = k)
      const amountOut = this.calculateSwapOutput(pair, tokenA, amountIn);

      if (amountOut < minAmountOut) {
        return false; // Slippage protection
      }

      // Update reserves
      if (tokenA === 'VDX') {
        pair.reserveA += amountIn;
        pair.reserveB -= amountOut;
      } else {
        pair.reserveB += amountIn;
        pair.reserveA -= amountOut;
      }

      // Deduct input amount and fee from sender
      this.pos.updateAccountBalance(transaction.from, -(amountIn + transaction.fee));
      
      // Add output amount to sender
      this.pos.updateAccountBalance(transaction.from, amountOut);

      this.swapPairs.set(pairKey, pair);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate swap output amount
   */
  private calculateSwapOutput(pair: SwapPair, inputToken: string, amountIn: number): number {
    const fee = 0.003; // 0.3% trading fee
    const amountInWithFee = amountIn * (1 - fee);
    
    if (inputToken === 'VDX') {
      return (pair.reserveB * amountInWithFee) / (pair.reserveA + amountInWithFee);
    } else {
      return (pair.reserveA * amountInWithFee) / (pair.reserveB + amountInWithFee);
    }
  }

  /**
   * Get pair key for swap pairs
   */
  private getPairKey(tokenA: string, tokenB: string): string {
    return [tokenA, tokenB].sort().join('-');
  }

  /**
   * Create a new swap pair
   */
  public createSwapPair(tokenA: string, tokenB: string, reserveA: number, reserveB: number): boolean {
    const pairKey = this.getPairKey(tokenA, tokenB);
    
    if (this.swapPairs.has(pairKey)) {
      return false; // Pair already exists
    }

    const pair: SwapPair = {
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

  /**
   * Burn tokens (for BurnSwap mechanism)
   */
  public burnTokens(amount: number): boolean {
    if (amount <= 0) return false;
    
    this.burnedTokens += amount;
    this.circulatingSupply -= amount;
    
    return true;
  }

  /**
   * Get blockchain statistics
   */
  public getNetworkStats(): NetworkStats {
    const latestBlock = this.getLatestBlock();
    const posStats = this.pos.getNetworkStats();
    
    // Calculate average block time
    const blockCount = this.chain.length;
    const totalTime = blockCount > 1 ? latestBlock.timestamp - this.chain[0].timestamp : 0;
    const averageBlockTime = blockCount > 1 ? totalTime / (blockCount - 1) : 0;

    // Calculate TPS (transactions per second)
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
      networkHashrate: 0 // Not applicable for PoS
    };
  }

  /**
   * Get block by index
   */
  public getBlock(index: number): Block | undefined {
    return this.chain[index];
  }

  /**
   * Get block by hash
   */
  public getBlockByHash(hash: string): Block | undefined {
    return this.chain.find(block => block.hash === hash);
  }

  /**
   * Get transaction by ID
   */
  public getTransaction(txId: string): any | undefined {
    for (const block of this.chain) {
      const tx = block.transactions.find(t => t.id === txId);
      if (tx) return tx;
    }
    return undefined;
  }

  /**
   * Get account balance
   */
  public getBalance(address: string): number {
    const account = this.pos.getAccount(address);
    return account ? account.balance : 0;
  }

  /**
   * Get pending transactions
   */
  public getPendingTransactions(): Transaction[] {
    return [...this.pendingTransactions];
  }

  /**
   * Get blockchain length
   */
  public getChainLength(): number {
    return this.chain.length;
  }

  /**
   * Validate the entire blockchain
   */
  public isChainValid(): boolean {
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

  /**
   * Export blockchain to JSON
   */
  public exportChain(): any {
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
