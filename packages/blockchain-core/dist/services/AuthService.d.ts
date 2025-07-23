export declare class AuthService {
    static register(email: string, password: string, firstName?: string, lastName?: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            createdAt: Date;
        };
        token: string;
    }>;
    static login(email: string, password: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            createdAt: Date;
            lastLoginAt: Date;
        };
        token: string;
    }>;
    static logout(token: string): Promise<{
        success: boolean;
    }>;
    static verifyToken(token: string): Promise<{
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        isActive: boolean;
    }>;
    static generateToken(userId: string): string;
    static createWallet(userId: string, name?: string): Promise<{
        id: string;
        address: string;
        name: string | null;
        balance: import("@prisma/client/runtime/library").Decimal;
        createdAt: Date;
    }>;
    static getUserWallets(userId: string): Promise<{
        address: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        balance: import("@prisma/client/runtime/library").Decimal;
    }[]>;
}
export default AuthService;
//# sourceMappingURL=AuthService.d.ts.map