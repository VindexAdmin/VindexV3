"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authenticate = void 0;
const AuthService_1 = require("../services/AuthService");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }
        const token = authHeader.substring(7);
        try {
            const user = await AuthService_1.AuthService.verifyToken(token);
            req.user = user;
            next();
        }
        catch (error) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Authentication error' });
        return;
    }
};
exports.authenticate = authenticate;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const user = await AuthService_1.AuthService.verifyToken(token);
                req.user = user;
            }
            catch (error) {
            }
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map