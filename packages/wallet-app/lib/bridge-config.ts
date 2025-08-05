/**
 * Vindex Bridge API Configuration
 * 
 * Environment-specific configurations for Bridge API client
 */

export interface BridgeAPIConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimits: {
    createTransaction: number;
    checkStatus: number;
    validate: number;
    retry: number;
  };
  networks: {
    supported: string[];
    defaultPriority: 'low' | 'normal' | 'high';
  };
  monitoring: {
    healthCheckInterval: number;
    metricsEnabled: boolean;
    errorReporting: boolean;
  };
}

const DEVELOPMENT_CONFIG: BridgeAPIConfig = {
  baseURL: 'http://localhost:3001/api/v1',
  timeout: 60000, // 1 minute for development
  retryAttempts: 5,
  retryDelay: 1000,
  rateLimits: {
    createTransaction: 20, // per minute
    checkStatus: 200,
    validate: 100,
    retry: 10
  },
  networks: {
    supported: ['VDX', 'SOL', 'XRP', 'SUI'],
    defaultPriority: 'normal'
  },
  monitoring: {
    healthCheckInterval: 30000, // 30 seconds
    metricsEnabled: true,
    errorReporting: true
  }
};

const PRODUCTION_CONFIG: BridgeAPIConfig = {
  baseURL: 'https://bridge.vindexchain.com/api/v1',
  timeout: 30000, // 30 seconds for production
  retryAttempts: 3,
  retryDelay: 2000,
  rateLimits: {
    createTransaction: 10, // per minute
    checkStatus: 100,
    validate: 50,
    retry: 5
  },
  networks: {
    supported: ['VDX', 'SOL', 'XRP', 'SUI'],
    defaultPriority: 'normal'
  },
  monitoring: {
    healthCheckInterval: 60000, // 1 minute
    metricsEnabled: true,
    errorReporting: true
  }
};

const TESTNET_CONFIG: BridgeAPIConfig = {
  baseURL: 'https://testnet-bridge.vindexchain.com/api/v1',
  timeout: 45000,
  retryAttempts: 3,
  retryDelay: 1500,
  rateLimits: {
    createTransaction: 15,
    checkStatus: 150,
    validate: 75,
    retry: 8
  },
  networks: {
    supported: ['VDX', 'SOL', 'XRP', 'SUI'],
    defaultPriority: 'normal'
  },
  monitoring: {
    healthCheckInterval: 45000,
    metricsEnabled: true,
    errorReporting: true
  }
};

/**
 * Get configuration based on environment
 */
export function getBridgeAPIConfig(): BridgeAPIConfig {
  const environment = process.env.NODE_ENV || 'development';
  const network = process.env.NEXT_PUBLIC_NETWORK || 'development';

  switch (environment) {
    case 'production':
      return network === 'testnet' ? TESTNET_CONFIG : PRODUCTION_CONFIG;
    case 'development':
    case 'test':
    default:
      return DEVELOPMENT_CONFIG;
  }
}

/**
 * Validate configuration
 */
export function validateBridgeAPIConfig(config: BridgeAPIConfig): boolean {
  const errors: string[] = [];

  if (!config.baseURL) {
    errors.push('baseURL is required');
  }

  if (config.timeout < 5000) {
    errors.push('timeout must be at least 5 seconds');
  }

  if (config.retryAttempts < 0 || config.retryAttempts > 10) {
    errors.push('retryAttempts must be between 0 and 10');
  }

  if (config.networks.supported.length === 0) {
    errors.push('at least one supported network is required');
  }

  if (errors.length > 0) {
    console.error('❌ Bridge API Configuration errors:', errors);
    return false;
  }

  return true;
}

/**
 * Network-specific configurations
 */
export const NETWORK_CONFIGS = {
  VDX: {
    chainId: 1337,
    rpcUrl: 'http://localhost:3001',
    explorerUrl: 'http://localhost:3002/explorer',
    confirmations: 12,
    blockTime: 5000 // 5 seconds
  },
  SOL: {
    chainId: 101,
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://explorer.solana.com',
    confirmations: 32,
    blockTime: 400 // 400ms
  },
  XRP: {
    chainId: 0,
    rpcUrl: 'https://s1.ripple.com:51234',
    explorerUrl: 'https://xrpscan.com',
    confirmations: 5,
    blockTime: 4000 // 4 seconds
  },
  SUI: {
    chainId: 1,
    rpcUrl: 'https://fullnode.mainnet.sui.io:443',
    explorerUrl: 'https://explorer.sui.io',
    confirmations: 15,
    blockTime: 3000 // 3 seconds
  }
} as const;

/**
 * Error code mappings
 */
export const BRIDGE_ERROR_CODES = {
  1001: 'Invalid network configuration',
  1002: 'Insufficient balance',
  1003: 'Amount below minimum',
  1004: 'Amount above maximum',
  1005: 'Network maintenance',
  1006: 'High slippage detected',
  1007: 'Transaction timeout',
  1008: 'Wallet not connected',
  1009: 'Invalid signature',
  1010: 'Rate limit exceeded'
} as const;

/**
 * Default Bridge API configuration
 */
export const DEFAULT_BRIDGE_CONFIG = getBridgeAPIConfig();

export default {
  getBridgeAPIConfig,
  validateBridgeAPIConfig,
  NETWORK_CONFIGS,
  BRIDGE_ERROR_CODES,
  DEFAULT_BRIDGE_CONFIG
};
