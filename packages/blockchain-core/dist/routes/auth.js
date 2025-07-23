"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const AuthService_1 = require("../services/AuthService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
const registerValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    (0, express_validator_1.body)('firstName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name must be between 1 and 50 characters'),
    (0, express_validator_1.body)('lastName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name must be between 1 and 50 characters'),
];
const loginValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required'),
];
router.post('/register', authLimiter, registerValidation, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
            return;
        }
        const { email, password, firstName, lastName } = req.body;
        const result = await AuthService_1.AuthService.register(email, password, firstName, lastName);
        const wallet = await AuthService_1.AuthService.createWallet(result.user.id, 'Main Wallet');
        res.status(201).json({
            success: true,
            data: {
                user: result.user,
                token: result.token,
                wallet: wallet
            }
        });
    }
    catch (error) {
        if (error.message.includes('already exists')) {
            res.status(409).json({ error: error.message });
            return;
        }
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
router.post('/login', authLimiter, loginValidation, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
            return;
        }
        const { email, password } = req.body;
        const result = await AuthService_1.AuthService.login(email, password);
        const wallets = await AuthService_1.AuthService.getUserWallets(result.user.id);
        res.json({
            success: true,
            data: {
                user: result.user,
                token: result.token,
                wallets: wallets
            }
        });
    }
    catch (error) {
        if (error.message.includes('Invalid email or password') || error.message.includes('deactivated')) {
            res.status(401).json({ error: error.message });
            return;
        }
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});
router.post('/logout', auth_1.authenticate, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.substring(7);
        if (token) {
            await AuthService_1.AuthService.logout(token);
        }
        res.json({ success: true, message: 'Logged out successfully' });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const wallets = await AuthService_1.AuthService.getUserWallets(userId);
        res.json({
            success: true,
            data: {
                user: req.user,
                wallets: wallets
            }
        });
    }
    catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
router.post('/wallet', auth_1.authenticate, async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.id;
        const wallet = await AuthService_1.AuthService.createWallet(userId, name);
        res.status(201).json({
            success: true,
            data: { wallet }
        });
    }
    catch (error) {
        console.error('Wallet creation error:', error);
        res.status(500).json({ error: 'Failed to create wallet' });
    }
});
router.get('/wallets', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const wallets = await AuthService_1.AuthService.getUserWallets(userId);
        res.json({
            success: true,
            data: { wallets }
        });
    }
    catch (error) {
        console.error('Wallets fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch wallets' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map