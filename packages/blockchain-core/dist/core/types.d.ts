export interface Transaction {
    id: string;
    from: string;
    to: string;
    amount: number;
    fee: number;
    timestamp: number;
    signature: string;
    type: 'transfer' | 'stake' | 'unstake' | 'swap';
    data?: any;
}
export interface Block {
    index: number;
    timestamp: number;
    transactions: Transaction[];
    previousHash: string;
    hash: string;
    nonce: number;
    validator: string;
    signature: string;
    merkleRoot: string;
    stateRoot: string;
    transactionCount: number;
    totalFees: number;
    reward: number;
}
export interface Account {
    address: string;
    balance: number;
    nonce: number;
    staked: number;
    stakingRewards: number;
    isValidator: boolean;
}
export interface Validator {
    address: string;
    stake: number;
    totalStake: number;
    commission: number;
    active: boolean;
    blocksProduced: number;
    lastActiveBlock: number;
}
export interface StakingInfo {
    address: string;
    stakedAmount: number;
    validator: string;
    rewards: number;
    unstakeTime?: number;
}
export interface NetworkStats {
    totalSupply: number;
    circulatingSupply: number;
    totalStaked: number;
    totalValidators: number;
    activeValidators: number;
    averageBlockTime: number;
    tps: number;
    networkHashrate: number;
}
export interface SwapPair {
    tokenA: string;
    tokenB: string;
    reserveA: number;
    reserveB: number;
    fee: number;
    totalLiquidity: number;
}
export interface PeerInfo {
    id: string;
    address: string;
    port: number;
    version: string;
    lastSeen: number;
    isValidator: boolean;
}
//# sourceMappingURL=types.d.ts.map