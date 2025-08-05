import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { redisClient } from './RedisClient';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
  failedLoginAttempts: number;
  accountLocked: boolean;
  lockoutUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResult {
  success: boolean;
  message: string;
  user?: Partial<User>;
  token?: string;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

export class AuthenticationService {
  private jwtSecret: string;
  private jwtExpiry: string = '24h';
  private maxFailedAttempts: number = 5;
  private lockoutDuration: number = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    
    if (this.jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
      console.warn('WARNING: Using default JWT secret. Change JWT_SECRET environment variable in production!');
    }
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common patterns
    const commonPatterns = [
      /(.)\1{2,}/, // Repeated characters
      /123|234|345|456|567|678|789|890/, // Sequential numbers
      /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i, // Sequential letters
      /password|123456|qwerty|admin|user|test|guest/i // Common passwords
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        errors.push('Password contains common patterns and is not secure');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(identifier: string): Promise<boolean> {
    try {
      return await redisClient.isAccountLocked(identifier);
    } catch (error) {
      console.error('Error checking account lock status:', error);
      return false;
    }
  }

  /**
   * Lock account after failed attempts
   */
  async lockAccount(identifier: string): Promise<void> {
    try {
      await redisClient.lockAccount(identifier, this.lockoutDuration / 1000);
      console.warn(`Account locked: ${identifier}`);
    } catch (error) {
      console.error('Error locking account:', error);
    }
  }

  /**
   * Handle failed login attempt
   */
  async handleFailedLogin(identifier: string): Promise<void> {
    try {
      const attempts = await redisClient.incrementFailedAttempts(identifier, 900); // 15 minutes
      
      if (attempts >= this.maxFailedAttempts) {
        await this.lockAccount(identifier);
      }
    } catch (error) {
      console.error('Error handling failed login:', error);
    }
  }

  /**
   * Clear failed login attempts
   */
  async clearFailedAttempts(identifier: string): Promise<void> {
    try {
      await redisClient.clearFailedAttempts(identifier);
    } catch (error) {
      console.error('Error clearing failed attempts:', error);
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(payload: any): string {
    return jwt.sign(payload, this.jwtSecret, { 
      expiresIn: this.jwtExpiry,
      issuer: 'vindex-chain',
      audience: 'vindex-users'
    } as jwt.SignOptions);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'vindex-chain',
        audience: 'vindex-users'
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate temporary token for 2FA process
   */
  generateTempToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'temp-2fa' }, 
      this.jwtSecret, 
      { 
        expiresIn: '10m',
        issuer: 'vindex-chain',
        audience: 'vindex-2fa'
      } as jwt.SignOptions
    );
  }

  /**
   * Setup 2FA for user
   */
  setup2FA(userId: string, serviceName: string = 'Vindex Chain'): TwoFactorSetup {
    const secret = speakeasy.generateSecret({
      name: `${serviceName} (${userId})`,
      issuer: serviceName,
      length: 32
    });

    return {
      secret: secret.base32!,
      qrCodeUrl: secret.otpauth_url!,
      manualEntryKey: secret.base32!
    };
  }

  /**
   * Generate QR code for 2FA setup
   */
  async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify 2FA token
   */
  verify2FA(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps of tolerance
    });
  }

  /**
   * Generate backup codes for 2FA
   */
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Hash backup codes for storage
   */
  async hashBackupCodes(codes: string[]): Promise<string[]> {
    const hashedCodes: string[] = [];
    
    for (const code of codes) {
      const hash = await this.hashPassword(code);
      hashedCodes.push(hash);
    }
    
    return hashedCodes;
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(code: string, hashedCodes: string[]): Promise<{ isValid: boolean; usedIndex?: number }> {
    for (let i = 0; i < hashedCodes.length; i++) {
      const isValid = await this.verifyPassword(code, hashedCodes[i]);
      if (isValid) {
        return { isValid: true, usedIndex: i };
      }
    }
    
    return { isValid: false };
  }

  /**
   * Session management
   */
  async createSession(userId: string, sessionData: any): Promise<string> {
    const sessionId = this.generateSessionId();
    const sessionInfo = {
      userId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ...sessionData
    };

    await redisClient.setSession(sessionId, sessionInfo, 86400); // 24 hours
    return sessionId;
  }

  async getSession(sessionId: string): Promise<any | null> {
    return await redisClient.getSession(sessionId);
  }

  async updateSession(sessionId: string, data: any): Promise<void> {
    const existingSession = await redisClient.getSession(sessionId);
    if (existingSession) {
      const updatedSession = {
        ...existingSession,
        ...data,
        lastActivity: new Date().toISOString()
      };
      await redisClient.setSession(sessionId, updatedSession, 86400);
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    await redisClient.deleteSession(sessionId);
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Rate limiting for authentication
   */
  async canAttemptLogin(identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: Date | null }> {
    try {
      const attempts = await redisClient.getFailedAttempts(identifier);
      const remaining = Math.max(0, this.maxFailedAttempts - attempts);
      
      if (remaining === 0) {
        const ttl = await redisClient.ttl(`failed_attempts:${identifier}`);
        const resetTime = ttl > 0 ? new Date(Date.now() + (ttl * 1000)) : null;
        return { allowed: false, remaining: 0, resetTime };
      }
      
      return { allowed: true, remaining, resetTime: null };
    } catch (error) {
      console.error('Error checking login attempts:', error);
      return { allowed: true, remaining: this.maxFailedAttempts, resetTime: null };
    }
  }
}
