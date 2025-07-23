import { Validator, Account, StakingInfo } from '../core/types';
export declare class ProofOfStake {
    private validators;
    private stakingInfo;
    private accounts;
    private minStakeAmount;
    private maxValidators;
    private stakingRewardRate;
    private unstakingPeriod;
    constructor();
    private initializeGenesisValidators;
    stake(delegator: string, validatorAddress: string, amount: number): boolean;
    unstake(delegator: string, validatorAddress: string, amount: number): boolean;
    completeUnstaking(delegator: string): number;
    selectValidator(blockIndex: number): string;
    updateValidatorAfterBlock(validatorAddress: string, blockIndex: number): void;
    distributeStakingRewards(blockReward: number, validatorAddress: string): void;
    getValidator(address: string): Validator | undefined;
    getActiveValidators(): Validator[];
    getStakingInfo(address: string): StakingInfo[];
    getAccount(address: string): Account | undefined;
    createAccount(address: string, initialBalance?: number): Account;
    updateAccountBalance(address: string, amount: number): boolean;
    getNetworkStats(): any;
}
//# sourceMappingURL=ProofOfStake.d.ts.map