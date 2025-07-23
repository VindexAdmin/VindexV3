"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});
class AuthService {
    static async register(email, password, firstName, lastName) {
        try {
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });
            if (existingUser) {
                throw new Error('User already exists with this email');
            }
            const passwordHash = await bcryptjs_1.default.hash(password, 12);
            const user = await prisma.user.create({
                data: {
                    email,
                    passwordHash,
                    firstName,
                    lastName
                }
            });
            const token = this.generateToken(user.id);
            await prisma.userSession.create({
                data: {
                    userId: user.id,
                    token,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });
            return {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    createdAt: user.createdAt
                },
                token
            };
        }
        catch (error) {
            throw error;
        }
    }
    static async login(email, password) {
        try {
            const user = await prisma.user.findUnique({
                where: { email }
            });
            if (!user) {
                throw new Error('Invalid email or password');
            }
            if (!user.isActive) {
                throw new Error('Account is deactivated');
            }
            const isValidPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
            if (!isValidPassword) {
                throw new Error('Invalid email or password');
            }
            const token = this.generateToken(user.id);
            await prisma.userSession.create({
                data: {
                    userId: user.id,
                    token,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() }
            });
            return {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    createdAt: user.createdAt,
                    lastLoginAt: new Date()
                },
                token
            };
        }
        catch (error) {
            throw error;
        }
    }
    static async logout(token) {
        try {
            await prisma.userSession.updateMany({
                where: { token },
                data: { isActive: false }
            });
            return { success: true };
        }
        catch (error) {
            throw error;
        }
    }
    static async verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const session = await prisma.userSession.findFirst({
                where: {
                    token,
                    isActive: true,
                    expiresAt: { gt: new Date() }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            isActive: true
                        }
                    }
                }
            });
            if (!session) {
                throw new Error('Invalid or expired token');
            }
            if (!session.user.isActive) {
                throw new Error('Account is deactivated');
            }
            await prisma.userSession.update({
                where: { id: session.id },
                data: { lastUsedAt: new Date() }
            });
            return session.user;
        }
        catch (error) {
            throw error;
        }
    }
    static generateToken(userId) {
        return jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    }
    static async createWallet(userId, name) {
        try {
            const privateKey = crypto_1.default.randomBytes(32).toString('hex');
            const publicKey = crypto_1.default.createHash('sha256').update(privateKey).digest('hex');
            const address = 'VDX' + crypto_1.default.createHash('sha256').update(publicKey).digest('hex').substring(0, 40);
            const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
            const cipher = crypto_1.default.createCipher('aes-256-cbc', encryptionKey);
            let encryptedPrivateKey = cipher.update(privateKey, 'utf8', 'hex');
            encryptedPrivateKey += cipher.final('hex');
            const wallet = await prisma.wallet.create({
                data: {
                    userId,
                    address,
                    publicKey,
                    encryptedPrivateKey,
                    name: name || 'Main Wallet'
                }
            });
            return {
                id: wallet.id,
                address: wallet.address,
                name: wallet.name,
                balance: wallet.balance,
                createdAt: wallet.createdAt
            };
        }
        catch (error) {
            console.error('Create wallet error:', error);
            throw error;
        }
    }
    static async getUserWallets(userId) {
        try {
            const wallets = await prisma.wallet.findMany({
                where: {
                    userId,
                    isActive: true
                },
                select: {
                    id: true,
                    address: true,
                    name: true,
                    balance: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            return wallets;
        }
        catch (error) {
            throw error;
        }
    }
}
exports.AuthService = AuthService;
exports.default = AuthService;
//# sourceMappingURL=AuthService.js.map