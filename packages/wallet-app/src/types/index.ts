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
  status?: 'pending' | 'confirmed' | 'failed';
  blockIndex?: number;
  blockHash?: string;
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

export interface WalletState {
  address: string | null;
  balance: number;
  isConnected: boolean;
  isLoading: boolean;
  privateKey?: string;
  publicKey?: string;
}

export interface TransactionHistory {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export interface ChartData {
  time: string;
  value: number;
  volume?: number;
}

export interface PriceData {
  current: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export interface StakingReward {
  amount: number;
  timestamp: number;
  validator: string;
  epoch: number;
}

export interface SwapQuote {
  inputAmount: number;
  outputAmount: number;
  minimumOutput: number;
  priceImpact: number;
  fee: number;
  route: string[];
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface BlockchainInfo {
  totalSupply: number;
  circulatingSupply: number;
  totalStaked: number;
  totalValidators: number;
  activeValidators: number;
  averageBlockTime: number;
  tps: number;
  networkHashrate: number;
  latestBlock: {
    index: number;
    hash: string;
    timestamp: number;
    transactionCount: number;
  };
  chainLength: number;
  isValid: boolean;
}
