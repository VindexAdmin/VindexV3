"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProofOfStake = void 0;
class ProofOfStake {
    constructor() {
        this.validators = new Map();
        this.stakingInfo = new Map();
        this.accounts = new Map();
        this.minStakeAmount = 100;
        this.maxValidators = 21;
        this.stakingRewardRate = 0.08;
        this.unstakingPeriod = 7 * 24 * 60 * 60 * 1000;
        this.initializeGenesisValidators();
    }
    initializeGenesisValidators() {
        const genesisValidators = [
            {
                address: 'vindex_genesis_validator_1',
                stake: 1000000,
                commission: 0.05
            },
            {
                address: 'vindex_genesis_validator_2',
                stake: 800000,
                commission: 0.04
            },
            {
                address: 'vindex_genesis_validator_3',
                stake: 600000,
                commission: 0.06
            }
        ];
        genesisValidators.forEach(genesis => {
            const validator = {
                address: genesis.address,
                stake: genesis.stake,
                totalStake: genesis.stake,
                commission: genesis.commission,
                active: true,
                blocksProduced: 0,
                lastActiveBlock: 0
            };
            this.validators.set(genesis.address, validator);
            const account = {
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
    stake(delegator, validatorAddress, amount) {
        if (amount < this.minStakeAmount) {
            throw new Error(`Minimum stake amount is ${this.minStakeAmount} VDX`);
        }
        const delegatorAccount = this.accounts.get(delegator);
        if (!delegatorAccount || delegatorAccount.balance < amount) {
            throw new Error('Insufficient balance for staking');
        }
        let validator = this.validators.get(validatorAddress);
        if (!validator) {
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
                commission: 0.05,
                active: false,
                blocksProduced: 0,
                lastActiveBlock: 0
            };
            this.validators.set(validatorAddress, validator);
        }
        delegatorAccount.balance -= amount;
        delegatorAccount.staked += amount;
        validator.totalStake += amount;
        if (validatorAddress === delegator) {
            validator.stake += amount;
        }
        if (validator.totalStake >= this.minStakeAmount && !validator.active) {
            validator.active = true;
        }
        const stakingInfoList = this.stakingInfo.get(delegator) || [];
        const existingStake = stakingInfoList.find(s => s.validator === validatorAddress);
        if (existingStake) {
            existingStake.stakedAmount += amount;
        }
        else {
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
    unstake(delegator, validatorAddress, amount) {
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
        stakeInfo.stakedAmount -= amount;
        stakeInfo.unstakeTime = Date.now() + this.unstakingPeriod;
        validator.totalStake -= amount;
        if (validatorAddress === delegator) {
            validator.stake -= amount;
        }
        if (validator.totalStake < this.minStakeAmount) {
            validator.active = false;
        }
        delegatorAccount.staked -= amount;
        if (stakeInfo.stakedAmount === 0) {
            const index = stakingInfoList.indexOf(stakeInfo);
            stakingInfoList.splice(index, 1);
        }
        return true;
    }
    completeUnstaking(delegator) {
        const delegatorAccount = this.accounts.get(delegator);
        if (!delegatorAccount) {
            throw new Error('Delegator account not found');
        }
        const stakingInfoList = this.stakingInfo.get(delegator) || [];
        let totalUnstaked = 0;
        const now = Date.now();
        stakingInfoList.forEach(stakeInfo => {
            if (stakeInfo.unstakeTime && stakeInfo.unstakeTime <= now) {
                totalUnstaked += stakeInfo.stakedAmount;
                delegatorAccount.balance += stakeInfo.stakedAmount;
                delete stakeInfo.unstakeTime;
            }
        });
        if (totalUnstaked > 0) {
            this.accounts.set(delegator, delegatorAccount);
        }
        return totalUnstaked;
    }
    selectValidator(blockIndex) {
        const activeValidators = Array.from(this.validators.values())
            .filter(v => v.active && v.totalStake >= this.minStakeAmount);
        if (activeValidators.length === 0) {
            throw new Error('No active validators available');
        }
        const totalStake = activeValidators.reduce((sum, v) => sum + v.totalStake, 0);
        const seed = blockIndex * 1103515245 + 12345;
        const random = (seed % 2147483647) / 2147483647;
        const target = random * totalStake;
        let cumulativeStake = 0;
        for (const validator of activeValidators) {
            cumulativeStake += validator.totalStake;
            if (cumulativeStake >= target) {
                return validator.address;
            }
        }
        return activeValidators[0].address;
    }
    updateValidatorAfterBlock(validatorAddress, blockIndex) {
        const validator = this.validators.get(validatorAddress);
        if (validator) {
            validator.blocksProduced++;
            validator.lastActiveBlock = blockIndex;
            this.validators.set(validatorAddress, validator);
        }
    }
    distributeStakingRewards(blockReward, validatorAddress) {
        const validator = this.validators.get(validatorAddress);
        if (!validator)
            return;
        const commission = blockReward * validator.commission;
        const delegatorRewards = blockReward - commission;
        const validatorAccount = this.accounts.get(validatorAddress);
        if (validatorAccount) {
            validatorAccount.stakingRewards += commission;
            this.accounts.set(validatorAddress, validatorAccount);
        }
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
    getValidator(address) {
        return this.validators.get(address);
    }
    getActiveValidators() {
        return Array.from(this.validators.values()).filter(v => v.active);
    }
    getStakingInfo(address) {
        return this.stakingInfo.get(address) || [];
    }
    getAccount(address) {
        return this.accounts.get(address);
    }
    createAccount(address, initialBalance = 0) {
        const account = {
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
    updateAccountBalance(address, amount) {
        const account = this.accounts.get(address);
        if (!account) {
            return false;
        }
        account.balance += amount;
        if (account.balance < 0) {
            return false;
        }
        this.accounts.set(address, account);
        return true;
    }
    getNetworkStats() {
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
exports.ProofOfStake = ProofOfStake;
//# sourceMappingURL=ProofOfStake.js.map