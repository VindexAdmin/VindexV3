"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Block = void 0;
const crypto = __importStar(require("crypto-js"));
const merkletreejs_1 = require("merkletreejs");
class Block {
    constructor(index, transactions, previousHash, validator) {
        this.index = index;
        this.timestamp = Date.now();
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.validator = validator;
        this.nonce = 0;
        this.signature = '';
        this.transactionCount = transactions.length;
        this.totalFees = this.calculateTotalFees();
        this.reward = this.calculateBlockReward();
        this.merkleRoot = this.calculateMerkleRoot();
        this.stateRoot = this.calculateStateRoot();
        this.hash = this.calculateHash();
    }
    calculateTotalFees() {
        return this.transactions.reduce((total, tx) => total + tx.fee, 0);
    }
    calculateBlockReward() {
        if (this.transactions.length === 0) {
            return 0;
        }
        const baseReward = 10;
        const halvingInterval = 210000;
        const halvings = Math.floor(this.index / halvingInterval);
        const currentBaseReward = baseReward / Math.pow(2, halvings);
        const transactionBonus = Math.min(this.transactions.length * 0.1, 5);
        return currentBaseReward + transactionBonus + this.totalFees;
    }
    calculateMerkleRoot() {
        if (this.transactions.length === 0) {
            return crypto.SHA256('').toString();
        }
        const leaves = this.transactions.map(tx => crypto.SHA256(JSON.stringify(tx)).toString());
        const tree = new merkletreejs_1.MerkleTree(leaves, crypto.SHA256);
        return tree.getRoot().toString('hex');
    }
    calculateStateRoot() {
        const stateData = {
            blockIndex: this.index,
            timestamp: this.timestamp,
            transactionCount: this.transactionCount,
            totalFees: this.totalFees,
            validator: this.validator
        };
        return crypto.SHA256(JSON.stringify(stateData)).toString();
    }
    calculateHash() {
        return crypto.SHA256(this.index +
            this.timestamp +
            this.previousHash +
            this.merkleRoot +
            this.stateRoot +
            this.validator +
            this.nonce +
            this.transactionCount +
            this.totalFees).toString();
    }
    signBlock(privateKey) {
        const hash = this.calculateHash();
        this.signature = crypto.HmacSHA256(hash, privateKey).toString();
        this.hash = hash;
    }
    verifySignature(publicKey) {
        if (!this.signature)
            return false;
        const hash = this.calculateHash();
        const expectedSignature = crypto.HmacSHA256(hash, publicKey).toString();
        return this.signature === expectedSignature;
    }
    isValid() {
        if (this.index < 0 || !this.previousHash || !this.validator) {
            return false;
        }
        if (this.hash !== this.calculateHash()) {
            return false;
        }
        if (this.merkleRoot !== this.calculateMerkleRoot()) {
            return false;
        }
        for (const tx of this.transactions) {
            if (!tx.id || typeof tx.amount !== 'number' || tx.amount < 0) {
                return false;
            }
        }
        const now = Date.now();
        if (this.timestamp > now + 60000) {
            return false;
        }
        const calculatedFees = this.calculateTotalFees();
        if (Math.abs(this.totalFees - calculatedFees) > 0.001) {
            return false;
        }
        const calculatedReward = this.calculateBlockReward();
        if (Math.abs(this.reward - calculatedReward) > 0.001) {
            return false;
        }
        return true;
    }
    addTransaction(transaction) {
        if (this.signature) {
            return false;
        }
        if (!transaction.id || !transaction.from || !transaction.to) {
            return false;
        }
        this.transactions.push(transaction);
        this.transactionCount = this.transactions.length;
        this.totalFees = this.calculateTotalFees();
        this.reward = this.calculateBlockReward();
        this.merkleRoot = this.calculateMerkleRoot();
        this.stateRoot = this.calculateStateRoot();
        return true;
    }
    getSize() {
        return JSON.stringify(this.toJSON()).length;
    }
    toJSON() {
        return {
            index: this.index,
            timestamp: this.timestamp,
            transactions: this.transactions,
            previousHash: this.previousHash,
            hash: this.hash,
            nonce: this.nonce,
            validator: this.validator,
            signature: this.signature,
            merkleRoot: this.merkleRoot,
            stateRoot: this.stateRoot,
            transactionCount: this.transactionCount,
            totalFees: this.totalFees,
            reward: this.reward
        };
    }
    static fromJSON(data) {
        const block = new Block(data.index, data.transactions, data.previousHash, data.validator);
        block.timestamp = data.timestamp;
        block.hash = data.hash;
        block.nonce = data.nonce;
        block.signature = data.signature;
        block.merkleRoot = data.merkleRoot;
        block.stateRoot = data.stateRoot;
        block.transactionCount = data.transactionCount;
        block.totalFees = data.totalFees;
        block.reward = data.reward;
        return block;
    }
}
exports.Block = Block;
//# sourceMappingURL=Block.js.map