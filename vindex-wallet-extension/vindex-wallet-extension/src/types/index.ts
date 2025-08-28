// Chrome extension types
export interface WalletData {
  address?: string;
  balance?: number;
  isConnected: boolean;
  privateKey?: string;
  publicKey?: string;
}

export interface VindexTransaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  fee: number;
  timestamp: number;
  signature: string;
}

export interface VindexBlock {
  index: number;
  timestamp: number;
  transactions: VindexTransaction[];
  previousHash: string;
  hash: string;
  validator: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Legacy types (keeping for compatibility)
export interface Wallet {
    address: string;
    balance: number;
    transactions: Transaction[];
}

export interface Transaction {
    id: string;
    amount: number;
    date: Date;
    type: 'incoming' | 'outgoing';
}

export interface UserSettings {
    theme: 'light' | 'dark';
    notificationsEnabled: boolean;
}

export interface PopupState {
    wallet: Wallet | null;
    loading: boolean;
    error: string | null;
}

export interface OptionsState {
    settings: UserSettings;
}