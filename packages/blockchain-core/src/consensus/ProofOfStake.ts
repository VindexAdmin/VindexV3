import { Validator, Account, StakingInfo } from '../core/types';

export class ProofOfStake {
  private validators: Map<string, Validator> = new Map();
  private stakingInfo: Map<string, StakingInfo[]> = new Map();
  private accounts: Map<string, Account> = new Map();
  private minStakeAmount = 100; // Minimum 100 VDX to become validator
  private maxValidators = 21; // Maximum number of active validators
  private stakingRewardRate = 0.08; // 8% annual staking rewards
  private unstakingPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  constructor() {
    this.initializeGenesisValidators();
  }

  /**
   * Initialize the first 3 genesis validators
   */
  private initializeGenesisValidators(): void {
    const genesisValidators = [
      {
        address: 'vindex_genesis_validator_1',
        stake: 1000000, // 1M VDX
        commission: 0.05 // 5% commission
      },
      {
        address: 'vindex_genesis_validator_2', 
        stake: 800000, // 800K VDX
        commission: 0.04 // 4% commission
      },
      {
        address: 'vindex_genesis_validator_3',
        stake: 600000, // 600K VDX
        commission: 0.06 // 6% commission
      }
    ];

    genesisValidators.forEach(genesis => {
      const validator: Validator = {
        address: genesis.address,
        stake: genesis.stake,
        totalStake: genesis.stake,
        commission: genesis.commission,
        active: true,
        blocksProduced: 0,
        lastActiveBlock: 0
      };

      this.validators.set(genesis.address, validator);

      // Create account for validator
      const account: Account = {
        address: genesis.address,
        balance: 0,
        nonce: 0,
        staked: genesis.stake,
        stakingRewards: 0,
        isValidator: true
      };

      this.accounts.set(genesis.address, account);
    });
  }

  /**
   * Stake tokens to become a validator or delegate to existing validator
   */
  public stake(delegator: string, validatorAddress: string, amount: number): boolean {
    if (amount < this.minStakeAmount) {
      throw new Error(`Minimum stake amount is ${this.minStakeAmount} VDX`);
    }

    const delegatorAccount = this.accounts.get(delegator);
    if (!delegatorAccount || delegatorAccount.balance < amount) {
      throw new Error('Insufficient balance for staking');
    }

    // Check if validator exists or create new one
    let validator = this.validators.get(validatorAddress);
    if (!validator) {
      // Creating new validator
      if (validatorAddress !== delegator) {
        throw new Error('Cannot delegate to non-existent validator');
      }

      if (this.validators.size >= this.maxValidators) {
        throw new Error('Maximum number of validators reached');
      }

      validator = {
        address: validatorAddress,
        stake: 0,
        totalStake: 0,
        commission: 0.05, // Default 5% commission
        active: false,
        blocksProduced: 0,
        lastActiveBlock: 0
      };

      this.validators.set(validatorAddress, validator);
    }

    // Update delegator account
    delegatorAccount.balance -= amount;
    delegatorAccount.staked += amount;

    // Update validator stake
    validator.totalStake += amount;
    if (validatorAddress === delegator) {
      validator.stake += amount;
    }

    // Activate validator if meets minimum requirements
    if (validator.totalStake >= this.minStakeAmount && !validator.active) {
      validator.active = true;
    }

    // Add staking info
    const stakingInfoList = this.stakingInfo.get(delegator) || [];
    const existingStake = stakingInfoList.find(s => s.validator === validatorAddress);
    
    if (existingStake) {
      existingStake.stakedAmount += amount;
    } else {
      stakingInfoList.push({
        address: delegator,
        stakedAmount: amount,
        validator: validatorAddress,
        rewards: 0
      });
    }

    this.stakingInfo.set(delegator, stakingInfoList);
    this.accounts.set(delegator, delegatorAccount);
    this.validators.set(validatorAddress, validator);

    return true;
  }

  /**
   * Unstake tokens (with unbonding period)
   */
  public unstake(delegator: string, validatorAddress: string, amount: number): boolean {
    const stakingInfoList = this.stakingInfo.get(delegator);
    if (!stakingInfoList) {
      throw new Error('No staking information found');
    }

    const stakeInfo = stakingInfoList.find(s => s.validator === validatorAddress);
    if (!stakeInfo || stakeInfo.stakedAmount < amount) {
      throw new Error('Insufficient staked amount');
    }

    const validator = this.validators.get(validatorAddress);
    const delegatorAccount = this.accounts.get(delegator);
    
    if (!validator || !delegatorAccount) {
      throw new Error('Validator or delegator not found');
    }

    // Update staking info
    stakeInfo.stakedAmount -= amount;
    stakeInfo.unstakeTime = Date.now() + this.unstakingPeriod;

    // Update validator
    validator.totalStake -= amount;
    if (validatorAddress === delegator) {
      validator.stake -= amount;
    }

    // Deactivate validator if below minimum stake
    if (validator.totalStake < this.minStakeAmount) {
      validator.active = false;
    }

    // Update delegator account
    delegatorAccount.staked -= amount;

    // Clean up if no more stake
    if (stakeInfo.stakedAmount === 0) {
      const index = stakingInfoList.indexOf(stakeInfo);
      stakingInfoList.splice(index, 1);
    }

    return true;
  }

  /**
   * Complete unstaking after unbonding period
   */
  public completeUnstaking(delegator: string): number {
    const delegatorAccount = this.accounts.get(delegator);
    if (!delegatorAccount) {
      throw new Error('Delegator account not found');
    }

    const stakingInfoList = this.stakingInfo.get(delegator) || [];
    let totalUnstaked = 0;
    const now = Date.now();

    stakingInfoList.forEach(stakeInfo => {
      if (stakeInfo.unstakeTime && stakeInfo.unstakeTime <= now) {
        // Unbonding period completed
        totalUnstaked += stakeInfo.stakedAmount;
        delegatorAccount.balance += stakeInfo.stakedAmount;
        
        // Remove from staking info
        delete stakeInfo.unstakeTime;
      }
    });

    if (totalUnstaked > 0) {
      this.accounts.set(delegator, delegatorAccount);
    }

    return totalUnstaked;
  }

  /**
   * Select next validator using weighted random selection
   */
  public selectValidator(blockIndex: number): string {
    const activeValidators = Array.from(this.validators.values())
      .filter(v => v.active && v.totalStake >= this.minStakeAmount);

    if (activeValidators.length === 0) {
      throw new Error('No active validators available');
    }

    // Calculate total stake of all active validators
    const totalStake = activeValidators.reduce((sum, v) => sum + v.totalStake, 0);

    // Use block index as seed for deterministic but pseudo-random selection
    const seed = blockIndex * 1103515245 + 12345; // Linear congruential generator
    const random = (seed % 2147483647) / 2147483647;
    const target = random * totalStake;

    let cumulativeStake = 0;
    for (const validator of activeValidators) {
      cumulativeStake += validator.totalStake;
      if (cumulativeStake >= target) {
        return validator.address;
      }
    }

    // Fallback to first validator
    return activeValidators[0].address;
  }

  /**
   * Update validator after block production
   */
  public updateValidatorAfterBlock(validatorAddress: string, blockIndex: number): void {
    const validator = this.validators.get(validatorAddress);
    if (validator) {
      validator.blocksProduced++;
      validator.lastActiveBlock = blockIndex;
      this.validators.set(validatorAddress, validator);
    }
  }

  /**
   * Calculate and distribute staking rewards
   */
  public distributeStakingRewards(blockReward: number, validatorAddress: string): void {
    const validator = this.validators.get(validatorAddress);
    if (!validator) return;

    // Validator commission
    const commission = blockReward * validator.commission;
    const delegatorRewards = blockReward - commission;

    // Distribute to validator
    const validatorAccount = this.accounts.get(validatorAddress);
    if (validatorAccount) {
      validatorAccount.stakingRewards += commission;
      this.accounts.set(validatorAddress, validatorAccount);
    }

    // Distribute to delegators proportionally
    this.stakingInfo.forEach((stakingInfoList, delegator) => {
      const relevantStakes = stakingInfoList.filter(s => s.validator === validatorAddress);
      
      relevantStakes.forEach(stakeInfo => {
        const delegatorShare = stakeInfo.stakedAmount / validator.totalStake;
        const delegatorReward = delegatorRewards * delegatorShare;
        
        stakeInfo.rewards += delegatorReward;
        
        const delegatorAccount = this.accounts.get(delegator);
        if (delegatorAccount) {
          delegatorAccount.stakingRewards += delegatorReward;
          this.accounts.set(delegator, delegatorAccount);
        }
      });
    });
  }

  /**
   * Get validator information
   */
  public getValidator(address: string): Validator | undefined {
    return this.validators.get(address);
  }

  /**
   * Get all active validators
   */
  public getActiveValidators(): Validator[] {
    return Array.from(this.validators.values()).filter(v => v.active);
  }

  /**
   * Get staking information for address
   */
  public getStakingInfo(address: string): StakingInfo[] {
    return this.stakingInfo.get(address) || [];
  }

  /**
   * Get account information
   */
  public getAccount(address: string): Account | undefined {
    return this.accounts.get(address);
  }

  /**
   * Create new account
   */
  public createAccount(address: string, initialBalance: number = 0): Account {
    const account: Account = {
      address,
      balance: initialBalance,
      nonce: 0,
      staked: 0,
      stakingRewards: 0,
      isValidator: false
    };

    this.accounts.set(address, account);
    return account;
  }

  /**
   * Update account balance
   */
  public updateAccountBalance(address: string, amount: number): boolean {
    const account = this.accounts.get(address);
    if (!account) {
      return false;
    }

    account.balance += amount;
    if (account.balance < 0) {
      return false; // Insufficient funds
    }

    this.accounts.set(address, account);
    return true;
  }

  /**
   * Get network statistics
   */
  public getNetworkStats(): any {
    const activeValidators = this.getActiveValidators();
    const totalStaked = activeValidators.reduce((sum, v) => sum + v.totalStake, 0);
    const totalAccounts = this.accounts.size;
    const totalValidators = this.validators.size;

    return {
      totalValidators,
      activeValidators: activeValidators.length,
      totalStaked,
      totalAccounts,
      minStakeAmount: this.minStakeAmount,
      maxValidators: this.maxValidators,
      stakingRewardRate: this.stakingRewardRate,
      unstakingPeriod: this.unstakingPeriod
    };
  }
}
