import express, { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/AuthService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router: Router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs (increased for development)
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation middleware
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// POST /auth/register
router.post('/register', authLimiter, registerValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    const { email, password, firstName, lastName } = req.body;

    const result = await AuthService.register(email, password, firstName, lastName);
    
    // Create a default wallet for the new user
    const wallet = await AuthService.createWallet(result.user.id, 'Main Wallet');

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        wallet: wallet
      }
    });
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      res.status(409).json({ error: error.message });
      return;
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/login', authLimiter, loginValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }

    const { email, password } = req.body;

    const result = await AuthService.login(email, password);
    
    // Get user's wallets
    const wallets = await AuthService.getUserWallets(result.user.id);

    res.json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        wallets: wallets
      }
    });
  } catch (error: any) {
    if (error.message.includes('Invalid email or password') || error.message.includes('deactivated')) {
      res.status(401).json({ error: error.message });
      return;
    }
    
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/logout
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);

    if (token) {
      await AuthService.logout(token);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Get user's wallets
    const wallets = await AuthService.getUserWallets(userId);

    res.json({
      success: true,
      data: {
        user: req.user,
        wallets: wallets
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// POST /auth/wallet
router.post('/wallet', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { name } = req.body;
    const userId = req.user!.id;

    const wallet = await AuthService.createWallet(userId, name);

    res.status(201).json({
      success: true,
      data: { wallet }
    });
  } catch (error) {
    console.error('Wallet creation error:', error);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

// GET /auth/wallets
router.get('/wallets', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const wallets = await AuthService.getUserWallets(userId);

    res.json({
      success: true,
      data: { wallets }
    });
  } catch (error) {
    console.error('Wallets fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

export default router;
