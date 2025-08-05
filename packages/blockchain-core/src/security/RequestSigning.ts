import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface RequestSignatureConfig {
  secret: string;
  tolerance: number; // Time tolerance in seconds
  requiredHeaders: string[];
  excludePaths?: string[];
}

export interface SignedRequest extends Request {
  signature?: {
    timestamp: number;
    signature: string;
    valid: boolean;
  };
}

export class RequestSigningMiddleware {
  private config: RequestSignatureConfig;

  constructor(config: RequestSignatureConfig) {
    this.config = {
      tolerance: config.tolerance || 300, // 5 minutes default
      requiredHeaders: config.requiredHeaders || ['x-timestamp', 'x-signature'],
      excludePaths: config.excludePaths || ['/health', '/ping'],
      secret: config.secret
    };
  }

  /**
   * Middleware to validate request signatures
   */
  validateSignature() {
    return (req: SignedRequest, res: Response, next: NextFunction) => {
      // Skip validation for excluded paths
      if (this.config.excludePaths?.includes(req.path)) {
        return next();
      }

      try {
        const timestamp = req.get('x-timestamp');
        const signature = req.get('x-signature');

        if (!timestamp || !signature) {
          return res.status(401).json({
            error: 'Missing required signature headers',
            required: this.config.requiredHeaders
          });
        }

        const requestTimestamp = parseInt(timestamp);
        const currentTime = Math.floor(Date.now() / 1000);

        // Check timestamp tolerance
        if (Math.abs(currentTime - requestTimestamp) > this.config.tolerance) {
          return res.status(401).json({
            error: 'Request timestamp outside tolerance window',
            tolerance: this.config.tolerance
          });
        }

        // Generate expected signature
        const payload = this.createSignaturePayload(req, requestTimestamp);
        const expectedSignature = this.generateSignature(payload);

        // Verify signature
        const isValid = this.verifySignature(signature, expectedSignature);

        // Attach signature info to request
        req.signature = {
          timestamp: requestTimestamp,
          signature,
          valid: isValid
        };

        if (!isValid) {
          return res.status(401).json({
            error: 'Invalid request signature'
          });
        }

        return next();
      } catch (error) {
        return res.status(500).json({
          error: 'Signature validation failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }

  /**
   * Create signature payload from request
   */
  private createSignaturePayload(req: Request, timestamp: number): string {
    const method = req.method;
    const path = req.path;
    const body = req.body ? JSON.stringify(req.body) : '';
    const query = new URLSearchParams(req.query as any).toString();

    return `${method}|${path}|${query}|${body}|${timestamp}`;
  }

  /**
   * Generate HMAC signature
   */
  private generateSignature(payload: string): string {
    return crypto
      .createHmac('sha256', this.config.secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify signature with timing-safe comparison
   */
  private verifySignature(provided: string, expected: string): boolean {
    if (provided.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(provided, 'hex'),
      Buffer.from(expected, 'hex')
    );
  }

  /**
   * Generate signature for outgoing requests (utility method)
   */
  static signRequest(
    method: string,
    path: string,
    query: string,
    body: string,
    secret: string,
    timestamp?: number
  ): { timestamp: number; signature: string } {
    const requestTimestamp = timestamp || Math.floor(Date.now() / 1000);
    const payload = `${method}|${path}|${query}|${body}|${requestTimestamp}`;
    
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return {
      timestamp: requestTimestamp,
      signature
    };
  }
}

/**
 * API Key authentication middleware
 */
export class APIKeyMiddleware {
  private validKeys: Set<string>;
  private keyPermissions: Map<string, string[]>;

  constructor(keys: { key: string; permissions?: string[] }[]) {
    this.validKeys = new Set(keys.map(k => k.key));
    this.keyPermissions = new Map();
    
    keys.forEach(({ key, permissions = [] }) => {
      this.keyPermissions.set(key, permissions);
    });
  }

  /**
   * Validate API key middleware
   */
  validateAPIKey(requiredPermission?: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const apiKey = req.get('x-api-key') || req.query.apiKey as string;

      if (!apiKey) {
        return res.status(401).json({
          error: 'API key required',
          header: 'x-api-key'
        });
      }

      if (!this.validKeys.has(apiKey)) {
        return res.status(401).json({
          error: 'Invalid API key'
        });
      }

      // Check permissions if required
      if (requiredPermission) {
        const permissions = this.keyPermissions.get(apiKey) || [];
        if (!permissions.includes(requiredPermission) && !permissions.includes('*')) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            required: requiredPermission
          });
        }
      }

      // Attach API key info to request
      (req as any).apiKey = {
        key: apiKey,
        permissions: this.keyPermissions.get(apiKey) || []
      };

      return next();
    };
  }

  /**
   * Add new API key
   */
  addKey(key: string, permissions: string[] = []): void {
    this.validKeys.add(key);
    this.keyPermissions.set(key, permissions);
  }

  /**
   * Remove API key
   */
  removeKey(key: string): void {
    this.validKeys.delete(key);
    this.keyPermissions.delete(key);
  }

  /**
   * Update key permissions
   */
  updatePermissions(key: string, permissions: string[]): void {
    if (this.validKeys.has(key)) {
      this.keyPermissions.set(key, permissions);
    }
  }

  /**
   * Generate new API key
   */
  static generateAPIKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

/**
 * Request logging middleware for security auditing
 */
export class SecurityLoggerMiddleware {
  private sensitiveFields = [
    'password',
    'privateKey',
    'secret',
    'token',
    'authorization',
    'cookie'
  ];

  /**
   * Log security-relevant requests
   */
  logSecurityEvents() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      const requestId = (req as any).requestId || 'unknown';

      // Log request
      this.logRequest(req, requestId);

      // Capture response
      const originalSend = res.send;
      res.send = function(body: any) {
        const duration = Date.now() - start;
        SecurityLoggerMiddleware.prototype.logResponse(req, res, duration, requestId, body);
        return originalSend.call(this, body);
      };

      return next();
    };
  }

  private logRequest(req: Request, requestId: string): void {
    const logData = {
      requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      headers: this.sanitizeHeaders(req.headers),
      query: req.query,
      body: this.sanitizeBody(req.body)
    };

    console.log('[SECURITY] Request:', JSON.stringify(logData, null, 2));
  }

  private logResponse(req: Request, res: Response, duration: number, requestId: string, body: any): void {
    const logData = {
      requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      responseSize: Buffer.byteLength(JSON.stringify(body || ''))
    };

    // Log as warning if status >= 400
    if (res.statusCode >= 400) {
      console.warn('[SECURITY] Response Error:', JSON.stringify(logData, null, 2));
    } else {
      console.log('[SECURITY] Response:', JSON.stringify(logData, null, 2));
    }
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(headers)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(body)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeBody(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private isSensitiveField(field: string): boolean {
    const lowerField = field.toLowerCase();
    return this.sensitiveFields.some(sensitive => 
      lowerField.includes(sensitive)
    );
  }
}

/**
 * IP whitelist/blacklist middleware
 */
export class IPFilterMiddleware {
  private whitelist: Set<string>;
  private blacklist: Set<string>;

  constructor(options: { whitelist?: string[]; blacklist?: string[] } = {}) {
    this.whitelist = new Set(options.whitelist || []);
    this.blacklist = new Set(options.blacklist || []);
  }

  /**
   * Filter requests by IP address
   */
  filterByIP() {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = req.ip || req.connection.remoteAddress || '';

      // Check blacklist first
      if (this.blacklist.has(clientIP)) {
        return res.status(403).json({
          error: 'IP address is blacklisted',
          ip: clientIP
        });
      }

      // Check whitelist if configured
      if (this.whitelist.size > 0 && !this.whitelist.has(clientIP)) {
        return res.status(403).json({
          error: 'IP address not whitelisted',
          ip: clientIP
        });
      }

      return next();
    };
  }

  /**
   * Add IP to whitelist
   */
  addToWhitelist(ip: string): void {
    this.whitelist.add(ip);
  }

  /**
   * Add IP to blacklist
   */
  addToBlacklist(ip: string): void {
    this.blacklist.add(ip);
  }

  /**
   * Remove IP from whitelist
   */
  removeFromWhitelist(ip: string): void {
    this.whitelist.delete(ip);
  }

  /**
   * Remove IP from blacklist
   */
  removeFromBlacklist(ip: string): void {
    this.blacklist.delete(ip);
  }
}
