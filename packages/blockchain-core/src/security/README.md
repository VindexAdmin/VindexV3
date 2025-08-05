# Vindex Security System Documentation

## Overview

The Vindex Security System provides comprehensive security measures for the blockchain platform, including:

- **Redis-based Rate Limiting** - Prevent DDoS attacks and abuse
- **2FA Authentication** - Two-factor authentication with TOTP
- **Input Validation** - Sanitize and validate all user inputs
- **Request Signing** - Verify request authenticity
- **API Key Management** - Secure API access control
- **Security Logging** - Audit trail for security events
- **IP Filtering** - Whitelist/blacklist IP addresses

## Quick Start

### 1. Basic Setup

```typescript
import { 
  VindexSecurity, 
  SecurityConfig, 
  SecurityMiddleware,
  RateLimiter 
} from './security';

// Configure security
const config: SecurityConfig = {
  redis: {
    host: 'localhost',
    port: 6379,
    password: process.env.REDIS_PASSWORD
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiresIn: '7d'
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },
  cors: {
    allowedOrigins: ['http://localhost:3000'],
    credentials: true
  },
  apiKeys: [
    { key: 'api_key_123', permissions: ['read', 'write'] }
  ],
  requestSigning: {
    secret: process.env.REQUEST_SIGNING_SECRET!,
    tolerance: 300 // 5 minutes
  }
};

// Initialize security system
const security = new VindexSecurity(config);
```

### 2. Express.js Integration

```typescript
import express from 'express';
import { SecurityMiddleware, RateLimiter } from './security';

const app = express();

// Apply security middleware
app.use(SecurityMiddleware.helmet()); // Security headers
app.use(SecurityMiddleware.cors()); // CORS configuration
app.use(SecurityMiddleware.sanitizeInput()); // Input sanitization
app.use(SecurityMiddleware.requestId()); // Request tracking
app.use(SecurityMiddleware.limitRequestSize('10mb')); // Size limits

// Rate limiting
const rateLimiter = new RateLimiter(redisClient);
app.use('/api', rateLimiter.createIPLimiter()); // General rate limiting
app.use('/api/auth', rateLimiter.createStrictLimiter()); // Strict for auth

// API key validation for protected routes
app.use('/api/protected', apiKeyMiddleware.validateAPIKey('read'));
```

## Core Components

### 1. Rate Limiting

Prevent abuse and DDoS attacks with Redis-based rate limiting:

```typescript
import { RateLimiter } from './security';

const rateLimiter = new RateLimiter(redisClient);

// Different types of rate limiters
app.use('/api', rateLimiter.createIPLimiter()); // By IP address
app.use('/api/user', rateLimiter.createUserLimiter()); // By user ID
app.use('/api/key', rateLimiter.createAPILimiter()); // By API key
app.use('/auth', rateLimiter.createStrictLimiter()); // Strict limits

// Custom rate limiter
app.use(rateLimiter.createCustomLimiter({
  keyGenerator: (req) => req.ip,
  windowMs: 60000, // 1 minute
  maxRequests: 30,
  message: 'Too many requests'
}));
```

### 2. Authentication with 2FA

Secure user authentication with two-factor authentication:

```typescript
import { AuthenticationService } from './security';

const authService = new AuthenticationService(jwtSecret, redisClient);

// Register new user
const registration = await authService.register('user@example.com', 'password123');

// Setup 2FA
const twoFASetup = await authService.setup2FA(registration.user.id);
console.log('Scan this QR code:', twoFASetup.qrCode);

// Enable 2FA after user scans QR code
await authService.enable2FA(registration.user.id, '123456'); // TOTP code

// Login with 2FA
const loginResult = await authService.login('user@example.com', 'password123');
if (loginResult.requires2FA) {
  // User needs to provide 2FA code
  const finalResult = await authService.verify2FA(loginResult.tempToken, '123456');
  console.log('JWT Token:', finalResult.token);
}
```

### 3. Input Validation

Validate and sanitize all user inputs:

```typescript
import { ValidationRules, EndpointValidations } from './security';

// Pre-built validation chains
app.post('/auth/register', EndpointValidations.register, (req, res) => {
  // Request is validated and sanitized
});

app.post('/transaction', EndpointValidations.sendTransaction, (req, res) => {
  // Blockchain address and amount validated
});

// Custom validation
app.post('/custom', [
  ValidationRules.email(),
  ValidationRules.string('name', 1, 50),
  ValidationRules.amount(),
  SecurityMiddleware.handleValidationErrors()
], (req, res) => {
  // Custom validation applied
});
```

### 4. Request Signing

Verify request authenticity with HMAC signatures:

```typescript
import { RequestSigningMiddleware } from './security';

const requestSigning = new RequestSigningMiddleware({
  secret: 'your-signing-secret',
  tolerance: 300, // 5 minutes
  excludePaths: ['/health', '/ping']
});

// Apply to sensitive routes
app.use('/api/sensitive', requestSigning.validateSignature());

// Client-side: Sign requests
const signature = RequestSigningMiddleware.signRequest(
  'POST',
  '/api/sensitive',
  'param=value',
  JSON.stringify(requestBody),
  'your-signing-secret'
);

// Add headers to request
fetch('/api/sensitive', {
  method: 'POST',
  headers: {
    'X-Timestamp': signature.timestamp.toString(),
    'X-Signature': signature.signature,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
});
```

### 5. API Key Management

Control access with API keys and permissions:

```typescript
import { APIKeyMiddleware } from './security';

const apiKeys = [
  { key: 'read_key_123', permissions: ['read'] },
  { key: 'admin_key_456', permissions: ['*'] }, // Full access
  { key: 'write_key_789', permissions: ['read', 'write'] }
];

const apiKeyMiddleware = new APIKeyMiddleware(apiKeys);

// Require API key
app.use('/api', apiKeyMiddleware.validateAPIKey());

// Require specific permission
app.post('/api/admin', apiKeyMiddleware.validateAPIKey('admin'));
app.get('/api/data', apiKeyMiddleware.validateAPIKey('read'));

// Generate new API key
const newKey = APIKeyMiddleware.generateAPIKey();
apiKeyMiddleware.addKey(newKey, ['read']);
```

### 6. Security Logging

Audit security events and track requests:

```typescript
import { SecurityLoggerMiddleware } from './security';

const securityLogger = new SecurityLoggerMiddleware();

// Log all security-relevant requests
app.use(securityLogger.logSecurityEvents());

// Logs include:
// - Request ID, timestamp, method, path
// - IP address, user agent
// - Sanitized headers and body (sensitive data redacted)
// - Response status and timing
```

### 7. IP Filtering

Control access by IP address:

```typescript
import { IPFilterMiddleware } from './security';

const ipFilter = new IPFilterMiddleware({
  whitelist: ['192.168.1.0/24', '10.0.0.1'],
  blacklist: ['192.168.1.100']
});

// Apply IP filtering
app.use(ipFilter.filterByIP());

// Dynamic IP management
ipFilter.addToBlacklist('suspicious.ip.address');
ipFilter.addToWhitelist('trusted.ip.address');
```

## Security Best Practices

### 1. Environment Variables

Store sensitive configuration in environment variables:

```bash
# .env
JWT_SECRET=your-very-long-random-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
REDIS_PASSWORD=your-redis-password
REQUEST_SIGNING_SECRET=your-request-signing-secret
API_ENCRYPTION_KEY=your-api-encryption-key
```

### 2. Redis Security

Secure your Redis instance:

```typescript
const redisConfig = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.NODE_ENV === 'production' ? {} : undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
};
```

### 3. Production Considerations

```typescript
// Production security configuration
const productionConfig: SecurityConfig = {
  redis: {
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT!),
    password: process.env.REDIS_PASSWORD,
    tls: {} // Enable TLS in production
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '15m', // Shorter in production
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiresIn: '7d'
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50, // Stricter in production
    skipSuccessfulRequests: true
  },
  cors: {
    allowedOrigins: [process.env.FRONTEND_URL!],
    credentials: true
  }
};
```

### 4. Error Handling

Handle security errors gracefully:

```typescript
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'rate_limit_exceeded') {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: err.retryAfter
    });
  }

  if (err.type === 'invalid_signature') {
    return res.status(401).json({
      error: 'Request signature invalid'
    });
  }

  // Log security errors
  console.error('[SECURITY ERROR]', {
    error: err.message,
    requestId: (req as any).requestId,
    ip: req.ip,
    path: req.path
  });

  res.status(500).json({ error: 'Internal server error' });
});
```

## Monitoring and Alerts

### 1. Rate Limit Monitoring

```typescript
// Monitor rate limit violations
const rateLimitViolations = await redisClient.get('rate_limit_violations');
if (parseInt(rateLimitViolations) > 100) {
  // Alert: Potential DDoS attack
  console.warn('High rate limit violations detected');
}
```

### 2. Failed Authentication Tracking

```typescript
// Track failed login attempts
const failedAttempts = await authService.getFailedAttempts('user@example.com');
if (failedAttempts > 5) {
  // Account lockout triggered
  console.warn('Account locked due to failed attempts');
}
```

### 3. Security Metrics

```typescript
// Collect security metrics
const metrics = {
  activeUsers: await redisClient.scard('active_users'),
  lockedAccounts: await redisClient.scard('locked_accounts'),
  rateLimitViolations: await redisClient.get('rate_limit_violations'),
  invalidSignatures: await redisClient.get('invalid_signatures')
};

console.log('Security Metrics:', metrics);
```

## Testing

### 1. Rate Limiting Tests

```typescript
// Test rate limiting
for (let i = 0; i < 101; i++) {
  const response = await fetch('/api/test');
  if (i === 100) {
    expect(response.status).toBe(429); // Rate limited
  }
}
```

### 2. Authentication Tests

```typescript
// Test 2FA flow
const user = await authService.register('test@example.com', 'password123');
const setup = await authService.setup2FA(user.user.id);
await authService.enable2FA(user.user.id, totpCode);

const login = await authService.login('test@example.com', 'password123');
expect(login.requires2FA).toBe(true);

const final = await authService.verify2FA(login.tempToken, totpCode);
expect(final.token).toBeDefined();
```

### 3. Input Validation Tests

```typescript
// Test input sanitization
const maliciousInput = '<script>alert("xss")</script>';
const response = await fetch('/api/test', {
  method: 'POST',
  body: JSON.stringify({ name: maliciousInput }),
  headers: { 'Content-Type': 'application/json' }
});

// Should be sanitized
expect(response.status).toBe(400);
```

This comprehensive security system provides enterprise-grade protection for the Vindex blockchain platform. All components work together to create multiple layers of security, ensuring the platform is protected against common attacks and vulnerabilities.
