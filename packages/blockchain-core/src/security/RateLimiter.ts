import { Request, Response, NextFunction } from 'express';
import { redisClient } from './RedisClient';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  onLimitReached?: (req: Request, res: Response) => void; // Callback when limit reached
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

export class RateLimiter {
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = {
      message: 'Too many requests, please try again later',
      keyGenerator: this.defaultKeyGenerator,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...options
    };
  }

  private defaultKeyGenerator(req: Request): string {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    return `rate_limit:${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 20)}`;
  }

  private getUserKeyGenerator(req: Request): string {
    const userId = (req as any).user?.id || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `rate_limit:user:${userId}:${ip}`;
  }

  public middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check if Redis is connected
        if (!redisClient.isRedisConnected()) {
          console.warn('Redis not connected, skipping rate limiting');
          return next();
        }

        const key = this.options.keyGenerator!(req);
        const windowSizeInSeconds = Math.floor(this.options.windowMs / 1000);
        
        // Get current count
        const current = await redisClient.increment(key, windowSizeInSeconds);
        
        // Get TTL for reset time calculation
        const ttl = await redisClient.ttl(key);
        const resetTime = new Date(Date.now() + (ttl * 1000));

        // Create rate limit info
        const rateLimitInfo: RateLimitInfo = {
          limit: this.options.maxRequests,
          current,
          remaining: Math.max(0, this.options.maxRequests - current),
          resetTime
        };

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': this.options.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(resetTime.getTime() / 1000).toString(),
          'X-RateLimit-Used': current.toString()
        });

        // Store rate limit info in request for potential use
        (req as any).rateLimit = rateLimitInfo;

        // Check if limit exceeded
        if (current > this.options.maxRequests) {
          if (this.options.onLimitReached) {
            this.options.onLimitReached(req, res);
          }

          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: this.options.message,
            limit: this.options.maxRequests,
            current,
            remaining: 0,
            resetTime: resetTime.toISOString()
          });
        }

        // Handle response to potentially skip counting
        const self = this;
        const originalSend = res.send;
        res.send = function(data: any) {
          const statusCode = res.statusCode;
          
          // If we should skip successful requests and this was successful
          if (self.options.skipSuccessfulRequests && statusCode < 400) {
            // Decrement the counter
            redisClient.increment(key, windowSizeInSeconds).then(newCount => {
              redisClient.set(key, (newCount - 1).toString(), windowSizeInSeconds);
            }).catch(() => {
              // Ignore errors in decrementing
            });
          }
          
          // If we should skip failed requests and this failed
          if (self.options.skipFailedRequests && statusCode >= 400) {
            // Decrement the counter
            redisClient.increment(key, windowSizeInSeconds).then(newCount => {
              redisClient.set(key, (newCount - 1).toString(), windowSizeInSeconds);
            }).catch(() => {
              // Ignore errors in decrementing
            });
          }

          return originalSend.call(this, data);
        };

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        // In case of error, allow the request to continue
        next();
      }
    };
  }

  // Static method to create common rate limiters
  static createIPLimiter(maxRequests: number, windowMs: number): RateLimiter {
    return new RateLimiter({
      maxRequests,
      windowMs,
      message: `Too many requests from this IP. Limit: ${maxRequests} requests per ${windowMs / 1000} seconds.`
    });
  }

  static createUserLimiter(maxRequests: number, windowMs: number): RateLimiter {
    const limiter = new RateLimiter({
      maxRequests,
      windowMs,
      message: `Too many requests from this user. Limit: ${maxRequests} requests per ${windowMs / 1000} seconds.`
    });
    
    // Override key generator to use user ID
    limiter.options.keyGenerator = limiter.getUserKeyGenerator;
    return limiter;
  }

  static createAPILimiter(maxRequests: number, windowMs: number): RateLimiter {
    return new RateLimiter({
      maxRequests,
      windowMs,
      message: `API rate limit exceeded. Limit: ${maxRequests} requests per ${windowMs / 1000} seconds.`,
      keyGenerator: (req) => {
        const apiKey = req.get('X-API-Key') || 'no-key';
        const ip = req.ip || 'unknown';
        return `rate_limit:api:${apiKey}:${ip}`;
      }
    });
  }

  static createStrictLimiter(maxRequests: number, windowMs: number): RateLimiter {
    return new RateLimiter({
      maxRequests,
      windowMs,
      message: 'Strict rate limit exceeded. Please wait before making more requests.',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      onLimitReached: (req, res) => {
        console.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
      }
    });
  }
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // General API rate limiting - 100 requests per minute
  general: RateLimiter.createIPLimiter(100, 60 * 1000),
  
  // Authentication endpoints - 5 attempts per 15 minutes
  auth: RateLimiter.createIPLimiter(5, 15 * 60 * 1000),
  
  // Transaction endpoints - 20 requests per minute
  transactions: RateLimiter.createUserLimiter(20, 60 * 1000),
  
  // Wallet operations - 10 requests per minute
  wallet: RateLimiter.createUserLimiter(10, 60 * 1000),
  
  // Public API - 1000 requests per hour
  publicAPI: RateLimiter.createAPILimiter(1000, 60 * 60 * 1000),
  
  // Strict limiting for sensitive operations - 3 requests per 5 minutes
  sensitive: RateLimiter.createStrictLimiter(3, 5 * 60 * 1000)
};
