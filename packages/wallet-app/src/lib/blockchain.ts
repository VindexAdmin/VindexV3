import axios from 'axios';
import { APIResponse, PaginatedResponse, Transaction, Block, BlockchainInfo, NetworkStats } from '@/types';

const API_BASE_URL = process.env.BLOCKCHAIN_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`🔍 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export class BlockchainAPI {
  /**
   * Check API health
   */
  static async checkHealth(): Promise<boolean> {
    try {
      const response = await api.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get blockchain information
   */
  static async getBlockchainInfo(): Promise<BlockchainInfo> {
    const response = await api.get<APIResponse<BlockchainInfo>>('/api/blockchain/info');
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch blockchain info');
    }
    
    return response.data.data;
  }

  /**
   * Get network statistics
   */
  static async getNetworkStats(): Promise<NetworkStats> {
    const response = await api.get<APIResponse<NetworkStats>>('/api/stats');
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch network stats');
    }
    
    return response.data.data;
  }

  /**
   * Get latest blocks
   */
  static async getBlocks(limit = 10, offset = 0): Promise<PaginatedResponse<Block>> {
    const response = await api.get<APIResponse<PaginatedResponse<Block>>>('/api/blocks', {
      params: { limit, offset }
    });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch blocks');
    }
    
    return response.data.data;
  }

  /**
   * Get block by index or hash
   */
  static async getBlock(identifier: string | number): Promise<Block> {
    const response = await api.get<APIResponse<Block>>(`/api/blocks/${identifier}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Block not found');
    }
    
    return response.data.data;
  }

  /**
   * Get transaction by ID
   */
  static async getTransaction(txId: string): Promise<Transaction> {
    const response = await api.get<APIResponse<Transaction>>(`/api/transactions/${txId}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Transaction not found');
    }
    
    return response.data.data;
  }

  /**
   * Get pending transactions
   */
  static async getPendingTransactions(limit = 20): Promise<Transaction[]> {
    const response = await api.get<APIResponse<{ data: Transaction[], total: number }>>('/api/transactions/pending', {
      params: { limit }
    });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch pending transactions');
    }
    
    return response.data.data.data;
  }

  /**
   * Submit a new transaction
   */
  static async submitTransaction(transaction: {
    from: string;
    to: string;
    amount: number;
    type?: string;
    data?: any;
    signature?: string;
  }): Promise<{ transactionId: string; message: string }> {
    const response = await api.post<APIResponse<{ transactionId: string; message: string }>>('/api/transactions', transaction);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to submit transaction');
    }
    
    return response.data.data;
  }

  /**
   * Get account information
   */
  static async getAccount(address: string): Promise<{ address: string; balance: number }> {
    const response = await api.get<APIResponse<{ address: string; balance: number }>>(`/api/accounts/${address}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Account not found');
    }
    
    return response.data.data;
  }

  /**
   * Search blockchain data
   */
  static async search(query: string): Promise<{
    blocks: Block[];
    transactions: Transaction[];
    addresses: string[];
  }> {
    const response = await api.get<APIResponse<{
      blocks: Block[];
      transactions: Transaction[];
      addresses: string[];
    }>>(`/api/search/${encodeURIComponent(query)}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Search failed');
    }
    
    return response.data.data;
  }

  /**
   * Mine a new block (admin/testing)
   */
  static async mineBlock(): Promise<{ message: string; block?: Block }> {
    const response = await api.post<APIResponse<{ message: string; block?: Block }>>('/api/mine');
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to mine block');
    }
    
    return response.data.data;
  }

  /**
   * Export blockchain data (admin)
   */
  static async exportBlockchain(): Promise<any> {
    const response = await api.get<APIResponse<any>>('/api/export');
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to export blockchain');
    }
    
    return response.data.data;
  }
}

export default BlockchainAPI;
