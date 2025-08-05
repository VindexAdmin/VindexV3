import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Type definitions for Bridge API
export interface BridgeConfig {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface CreateBridgeRequest {
  fromNetwork: string;
  toNetwork: string;
  fromAmount: number;
  toAddress: string;
  slippage?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface BridgeTransaction {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fromNetwork: string;
  toNetwork: string;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  bridgeFee: number;
  txHash?: string;
  destinationTxHash?: string;
  timestamp: number;
  estimatedCompletion?: number;
  retryAttempt?: number;
  totalAttempts?: number;
  error?: string;
  progress?: number;
  confirmations?: number;
  requiredConfirmations?: number;
}

export interface ValidationRequest {
  fromNetwork: string;
  toNetwork: string;
  fromAmount: number;
  userAddress: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  estimatedGas: number;
  minimumAmount: number;
  maximumAmount: number;
  exchangeRate: number;
  totalFee: number;
}

export interface NetworkConfiguration {
  id: string;
  name: string;
  symbol: string;
  chainId: number;
  status: 'active' | 'maintenance' | 'disabled';
  exchangeRate: number;
  fee: number;
  minAmount: number;
  maxAmount: number;
  estimatedTime: string;
  contractAddress: string;
  explorerUrl: string;
}

export interface BridgeStatistics {
  totalTransactions: number;
  totalVolume: number;
  recentTransactionCount: number;
  successRate: number;
  averageRetries: number;
  retrySuccessRate: number;
  networkStats: Record<string, {
    totalVolume: number;
    transactionCount: number;
    successRate: number;
  }>;
}

export interface HistoryQuery {
  limit?: number;
  offset?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'all';
  fromNetwork?: string;
  toNetwork?: string;
}

export interface HistoryResult {
  transactions: BridgeTransaction[];
  total: number;
  hasMore: boolean;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

export class BridgeAPIError extends Error {
  public code: number;
  public details?: any;

  constructor(message: string, code: number, details?: any) {
    super(message);
    this.name = 'BridgeAPIError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Vindex Bridge API Client
 * 
 * Provides type-safe access to the Vindex Bridge API with automatic retries,
 * error handling, and comprehensive transaction management.
 */
export class VindexBridgeAPIClient {
  private client: AxiosInstance;
  private config: Required<BridgeConfig>;

  constructor(config: BridgeConfig = {}) {
    this.config = {
      apiKey: config.apiKey || '',
      baseURL: config.baseURL || 'http://localhost:3001/api/v1',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🌉 Bridge API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('🚨 Bridge API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor with retry logic
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Bridge API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        const config = error.config;
        
        // Retry logic for network errors
        if (
          error.code === 'NETWORK_ERROR' || 
          error.code === 'TIMEOUT' ||
          (error.response?.status >= 500 && error.response?.status < 600)
        ) {
          config.__retryCount = config.__retryCount || 0;
          
          if (config.__retryCount < this.config.retryAttempts) {
            config.__retryCount++;
            const delay = this.config.retryDelay * Math.pow(2, config.__retryCount - 1);
            
            console.log(`🔄 Retrying Bridge API request (${config.__retryCount}/${this.config.retryAttempts}) in ${delay}ms`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.client(config);
          }
        }

        console.error('❌ Bridge API Response Error:', error.response?.data || error.message);
        
        // Transform error to BridgeAPIError
        const apiError = new BridgeAPIError(
          error.response?.data?.error || error.message || 'Bridge API Error',
          error.response?.data?.code || error.response?.status || 0,
          error.response?.data?.details
        );
        
        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Set authentication headers
   */
  public setAuth(walletAddress: string, signature: string, chainId?: number): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${signature}`;
    this.client.defaults.headers.common['X-Wallet-Address'] = walletAddress;
    if (chainId) {
      this.client.defaults.headers.common['X-Chain-ID'] = chainId.toString();
    }
  }

  /**
   * Create a new bridge transaction
   */
  public async createTransaction(request: CreateBridgeRequest): Promise<BridgeTransaction> {
    try {
      const response: AxiosResponse<APIResponse<BridgeTransaction>> = await this.client.post('/bridge/create', request);
      
      if (!response.data.success || !response.data.data) {
        throw new BridgeAPIError(response.data.error || 'Failed to create transaction', response.data.code || 400);
      }
      
      return response.data.data;
    } catch (error) {
      if (error instanceof BridgeAPIError) throw error;
      throw new BridgeAPIError('Failed to create bridge transaction', 500, error);
    }
  }

  /**
   * Get transaction status
   */
  public async getTransactionStatus(transactionId: string): Promise<BridgeTransaction> {
    try {
      const response: AxiosResponse<APIResponse<BridgeTransaction>> = await this.client.get(`/bridge/status/${transactionId}`);
      
      if (!response.data.success || !response.data.data) {
        throw new BridgeAPIError(response.data.error || 'Transaction not found', response.data.code || 404);
      }
      
      return response.data.data;
    } catch (error) {
      if (error instanceof BridgeAPIError) throw error;
      throw new BridgeAPIError('Failed to get transaction status', 500, error);
    }
  }

  /**
   * Validate bridge transaction parameters
   */
  public async validateTransaction(request: ValidationRequest): Promise<ValidationResult> {
    try {
      const response: AxiosResponse<APIResponse<ValidationResult>> = await this.client.post('/bridge/validate', request);
      
      if (!response.data.success || !response.data.data) {
        throw new BridgeAPIError(response.data.error || 'Validation failed', response.data.code || 400);
      }
      
      return response.data.data;
    } catch (error) {
      if (error instanceof BridgeAPIError) throw error;
      throw new BridgeAPIError('Failed to validate transaction', 500, error);
    }
  }

  /**
   * Get supported networks
   */
  public async getSupportedNetworks(): Promise<NetworkConfiguration[]> {
    try {
      const response: AxiosResponse<APIResponse<NetworkConfiguration[]>> = await this.client.get('/bridge/networks');
      
      if (!response.data.success || !response.data.data) {
        throw new BridgeAPIError(response.data.error || 'Failed to get networks', response.data.code || 500);
      }
      
      return response.data.data;
    } catch (error) {
      if (error instanceof BridgeAPIError) throw error;
      throw new BridgeAPIError('Failed to get supported networks', 500, error);
    }
  }

  /**
   * Get transaction history
   */
  public async getTransactionHistory(query: HistoryQuery = {}): Promise<HistoryResult> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response: AxiosResponse<APIResponse<HistoryResult>> = await this.client.get(`/bridge/history?${params}`);
      
      if (!response.data.success || !response.data.data) {
        throw new BridgeAPIError(response.data.error || 'Failed to get history', response.data.code || 500);
      }
      
      return response.data.data;
    } catch (error) {
      if (error instanceof BridgeAPIError) throw error;
      throw new BridgeAPIError('Failed to get transaction history', 500, error);
    }
  }

  /**
   * Get bridge statistics
   */
  public async getStatistics(): Promise<BridgeStatistics> {
    try {
      const response: AxiosResponse<APIResponse<BridgeStatistics>> = await this.client.get('/bridge/stats');
      
      if (!response.data.success || !response.data.data) {
        throw new BridgeAPIError(response.data.error || 'Failed to get statistics', response.data.code || 500);
      }
      
      return response.data.data;
    } catch (error) {
      if (error instanceof BridgeAPIError) throw error;
      throw new BridgeAPIError('Failed to get bridge statistics', 500, error);
    }
  }

  /**
   * Retry a failed transaction
   */
  public async retryTransaction(transactionId: string, options: RetryOptions = {}): Promise<BridgeTransaction> {
    try {
      const response: AxiosResponse<APIResponse<BridgeTransaction>> = await this.client.post(`/bridge/retry/${transactionId}`, options);
      
      if (!response.data.success || !response.data.data) {
        throw new BridgeAPIError(response.data.error || 'Failed to retry transaction', response.data.code || 400);
      }
      
      return response.data.data;
    } catch (error) {
      if (error instanceof BridgeAPIError) throw error;
      throw new BridgeAPIError('Failed to retry transaction', 500, error);
    }
  }

  /**
   * Get bulk transaction status
   */
  public async getBulkTransactionStatus(transactionIds: string[]): Promise<BridgeTransaction[]> {
    try {
      const response: AxiosResponse<APIResponse<BridgeTransaction[]>> = await this.client.post('/bridge/status/bulk', {
        transactionIds
      });
      
      if (!response.data.success || !response.data.data) {
        throw new BridgeAPIError(response.data.error || 'Failed to get bulk status', response.data.code || 400);
      }
      
      return response.data.data;
    } catch (error) {
      if (error instanceof BridgeAPIError) throw error;
      throw new BridgeAPIError('Failed to get bulk transaction status', 500, error);
    }
  }

  /**
   * Subscribe to transaction updates (using polling)
   */
  public async subscribeToTransaction(
    transactionId: string, 
    callback: (transaction: BridgeTransaction) => void,
    interval: number = 5000
  ): Promise<() => void> {
    let isActive = true;
    
    const poll = async () => {
      if (!isActive) return;
      
      try {
        const transaction = await this.getTransactionStatus(transactionId);
        callback(transaction);
        
        // Continue polling if transaction is still pending/processing
        if (transaction.status === 'pending' || transaction.status === 'processing') {
          setTimeout(poll, interval);
        }
      } catch (error) {
        console.error('Transaction polling error:', error);
        setTimeout(poll, interval * 2); // Slower retry on error
      }
    };
    
    poll();
    
    // Return unsubscribe function
    return () => {
      isActive = false;
    };
  }

  /**
   * Estimate bridge time
   */
  public async estimateBridgeTime(fromNetwork: string, toNetwork: string): Promise<number> {
    const networks = await this.getSupportedNetworks();
    const fromNet = networks.find(n => n.id === fromNetwork);
    const toNet = networks.find(n => n.id === toNetwork);
    
    if (!fromNet || !toNet) {
      throw new BridgeAPIError('Unsupported network', 1001);
    }
    
    // Simple estimation based on network configurations
    const baseTime = 120000; // 2 minutes base
    const networkMultiplier = fromNet.id === 'VDX' ? 1 : 1.5;
    
    return baseTime * networkMultiplier;
  }

  /**
   * Calculate exchange rate
   */
  public async calculateExchangeRate(fromNetwork: string, toNetwork: string): Promise<number> {
    const networks = await this.getSupportedNetworks();
    const fromNet = networks.find(n => n.id === fromNetwork);
    const toNet = networks.find(n => n.id === toNetwork);
    
    if (!fromNet || !toNet) {
      throw new BridgeAPIError('Unsupported network', 1001);
    }
    
    // Calculate rate: from -> VDX -> to
    const fromToVDX = fromNet.exchangeRate;
    const vdxToTo = 1 / toNet.exchangeRate;
    
    return fromToVDX * vdxToTo;
  }
}

// Export singleton instance
export const bridgeAPIClient = new VindexBridgeAPIClient();

export default VindexBridgeAPIClient;
