import { Block as BlockInterface, Transaction } from './types';
export declare class Block implements BlockInterface {
    index: number;
    timestamp: number;
    transactions: Transaction[];
    previousHash: string;
    hash: string;
    nonce: number;
    validator: string;
    signature: string;
    merkleRoot: string;
    stateRoot: string;
    transactionCount: number;
    totalFees: number;
    reward: number;
    constructor(index: number, transactions: Transaction[], previousHash: string, validator: string);
    private calculateTotalFees;
    private calculateBlockReward;
    private calculateMerkleRoot;
    private calculateStateRoot;
    calculateHash(): string;
    signBlock(privateKey: string): void;
    verifySignature(publicKey: string): boolean;
    isValid(): boolean;
    addTransaction(transaction: Transaction): boolean;
    getSize(): number;
    toJSON(): any;
    static fromJSON(data: any): Block;
}
//# sourceMappingURL=Block.d.ts.map