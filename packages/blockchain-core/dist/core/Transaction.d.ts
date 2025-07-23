import { Transaction as TransactionInterface } from './types';
export declare class Transaction implements TransactionInterface {
    id: string;
    from: string;
    to: string;
    amount: number;
    fee: number;
    timestamp: number;
    signature: string;
    type: 'transfer' | 'stake' | 'unstake' | 'swap';
    data?: any;
    constructor(from: string, to: string, amount: number, type?: 'transfer' | 'stake' | 'unstake' | 'swap', data?: any);
    private calculateFee;
    getHash(): string;
    signTransaction(privateKey: string): void;
    verifySignature(publicKey: string): boolean;
    isValid(): boolean;
    toJSON(): any;
    static fromJSON(data: any): Transaction;
}
//# sourceMappingURL=Transaction.d.ts.map