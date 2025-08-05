// Security Core Exports
export { RedisClient } from './RedisClient';
export { RateLimiter } from './RateLimiter';
export { AuthenticationService } from './AuthenticationService';

// Security Middleware Exports
export { 
  SecurityMiddleware, 
  ValidationRules, 
  EndpointValidations,
  ValidationError 
} from './SecurityMiddleware';

// Request Security Exports
export { 
  RequestSigningMiddleware,
  APIKeyMiddleware,
  SecurityLoggerMiddleware,
  IPFilterMiddleware,
  RequestSignatureConfig,
  SignedRequest
} from './RequestSigning';

// Configuration Types
export interface SecurityConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
  };
  cors: {
    allowedOrigins: string[];
    credentials: boolean;
  };
  apiKeys: {
    key: string;
    permissions: string[];
  }[];
  requestSigning: {
    secret: string;
    tolerance: number;
  };
}

// Default security configuration
export const defaultSecurityConfig: Partial<SecurityConfig> = {
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0
  },
  jwt: {
    secret: '', // Must be configured
    expiresIn: '1h',
    refreshSecret: '', // Must be configured
    refreshExpiresIn: '7d'
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false
  },
  cors: {
    allowedOrigins: ['http://localhost:3000'],
    credentials: true
  },
  apiKeys: [],
  requestSigning: {
    secret: '', // Must be configured
    tolerance: 300 // 5 minutes
  }
};
