import { Request, Response, NextFunction } from 'express';
import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import helmet from 'helmet';
import cors from 'cors';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class SecurityMiddleware {
  /**
   * Helmet configuration for security headers
   */
  static helmet() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  /**
   * CORS configuration
   */
  static cors() {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
    
    return cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
    });
  }

  /**
   * Input sanitization middleware
   */
  static sanitizeInput() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Recursive function to sanitize objects
      const sanitize = (obj: any): any => {
        if (typeof obj === 'string') {
          // Remove potentially dangerous characters
          return obj
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript: URLs
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .trim();
        } else if (Array.isArray(obj)) {
          return obj.map(sanitize);
        } else if (obj !== null && typeof obj === 'object') {
          const sanitized: any = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              sanitized[key] = sanitize(obj[key]);
            }
          }
          return sanitized;
        }
        return obj;
      };

      if (req.body) {
        req.body = sanitize(req.body);
      }
      if (req.query) {
        req.query = sanitize(req.query);
      }
      if (req.params) {
        req.params = sanitize(req.params);
      }

      next();
    };
  }

  /**
   * Request size limiting
   */
  static limitRequestSize(maxSize: string = '10mb') {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = req.get('content-length');
      if (contentLength) {
        const sizeInBytes = parseInt(contentLength);
        const maxSizeInBytes = this.parseSize(maxSize);
        
        if (sizeInBytes > maxSizeInBytes) {
          return res.status(413).json({
            error: 'Request entity too large',
            maxSize
          });
        }
      }
      return next();
    };
  }

  /**
   * Parse size string to bytes
   */
  private static parseSize(size: string): number {
    const units: { [key: string]: number } = {
      'b': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };

    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
    if (!match) return 10 * 1024 * 1024; // Default 10MB

    const value = parseFloat(match[1]);
    const unit = match[2];
    return Math.floor(value * units[unit]);
  }

  /**
   * Request ID middleware for tracking
   */
  static requestId() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const requestId = req.get('X-Request-ID') || this.generateRequestId();
      (req as any).requestId = requestId;
      res.set('X-Request-ID', requestId);
      next();
    };
  }

  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Validation result handler
   */
  static handleValidationErrors() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const validationErrors: ValidationError[] = errors.array().map(error => ({
          field: error.type === 'field' ? (error as any).path : 'unknown',
          message: error.msg,
          value: error.type === 'field' ? (error as any).value : undefined
        }));

        res.status(400).json({
          error: 'Validation failed',
          details: validationErrors
        });
        return;
      }
      next();
    };
  }
}

// Common validation chains
export const ValidationRules = {
  // Authentication validations
  email: () => body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),

  password: () => body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),

  twoFactorCode: () => body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('2FA code must be 6 digits'),

  // Blockchain validations
  address: () => body('address')
    .isLength({ min: 40, max: 42 })
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Must be a valid blockchain address'),

  amount: () => body('amount')
    .isFloat({ min: 0.000001 })
    .withMessage('Amount must be a positive number'),

  transactionHash: () => param('hash')
    .isLength({ min: 64, max: 66 })
    .matches(/^(0x)?[a-fA-F0-9]{64}$/)
    .withMessage('Must be a valid transaction hash'),

  blockIndex: () => param('index')
    .isInt({ min: 0 })
    .withMessage('Block index must be a non-negative integer'),

  // API validations
  apiKey: () => query('apiKey')
    .isLength({ min: 32, max: 64 })
    .isAlphanumeric()
    .withMessage('API key must be alphanumeric and 32-64 characters'),

  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  // Wallet validations
  walletName: () => body('name')
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Wallet name must be alphanumeric with spaces, hyphens, or underscores'),

  privateKey: () => body('privateKey')
    .isLength({ min: 64, max: 66 })
    .matches(/^(0x)?[a-fA-F0-9]{64}$/)
    .withMessage('Must be a valid private key'),

  // Staking validations
  stakingAmount: () => body('amount')
    .isFloat({ min: 100 })
    .withMessage('Minimum staking amount is 100 VDX'),

  validatorAddress: () => body('validator')
    .isLength({ min: 40, max: 42 })
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Must be a valid validator address'),

  // General validations
  id: () => param('id')
    .isUUID()
    .withMessage('Must be a valid UUID'),

  string: (field: string, min: number = 1, max: number = 255) => body(field)
    .isLength({ min, max })
    .withMessage(`${field} must be between ${min} and ${max} characters`),

  optionalString: (field: string, max: number = 255) => body(field)
    .optional()
    .isLength({ max })
    .withMessage(`${field} must not exceed ${max} characters`),

  boolean: (field: string) => body(field)
    .isBoolean()
    .withMessage(`${field} must be a boolean value`),

  integer: (field: string, min?: number, max?: number) => {
    let validation = body(field).isInt();
    if (min !== undefined) validation = validation.isInt({ min });
    if (max !== undefined) validation = validation.isInt({ max });
    return validation.withMessage(`${field} must be an integer${min !== undefined ? ` >= ${min}` : ''}${max !== undefined ? ` <= ${max}` : ''}`);
  }
};

// Validation chains for specific endpoints
export const EndpointValidations = {
  register: [
    ValidationRules.email(),
    ValidationRules.password(),
    ValidationRules.string('firstName', 2, 50),
    ValidationRules.string('lastName', 2, 50),
    SecurityMiddleware.handleValidationErrors()
  ],

  login: [
    ValidationRules.email(),
    body('password').notEmpty().withMessage('Password is required'),
    SecurityMiddleware.handleValidationErrors()
  ],

  verify2FA: [
    ValidationRules.twoFactorCode(),
    body('tempToken').notEmpty().withMessage('Temporary token is required'),
    SecurityMiddleware.handleValidationErrors()
  ],

  sendTransaction: [
    ValidationRules.address(),
    body('to').custom((value, { req }) => {
      if (value === req.body.from) {
        throw new Error('Cannot send to the same address');
      }
      return true;
    }),
    ValidationRules.amount(),
    ValidationRules.optionalString('data', 1000),
    SecurityMiddleware.handleValidationErrors()
  ],

  createWallet: [
    ValidationRules.walletName(),
    ValidationRules.password(),
    SecurityMiddleware.handleValidationErrors()
  ],

  stake: [
    ValidationRules.stakingAmount(),
    ValidationRules.validatorAddress(),
    SecurityMiddleware.handleValidationErrors()
  ],

  getTransaction: [
    ValidationRules.transactionHash(),
    SecurityMiddleware.handleValidationErrors()
  ],

  getBlock: [
    ValidationRules.blockIndex(),
    SecurityMiddleware.handleValidationErrors()
  ]
};
