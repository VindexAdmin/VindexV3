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
exports.Transaction = void 0;
const crypto = __importStar(require("crypto-js"));
const uuid_1 = require("uuid");
class Transaction {
    constructor(from, to, amount, type = 'transfer', data) {
        this.id = (0, uuid_1.v4)();
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.type = type;
        this.data = data;
        this.timestamp = Date.now();
        this.fee = this.calculateFee();
        this.signature = '';
    }
    calculateFee() {
        const baseFee = 0.001;
        const percentageFee = this.amount * 0.0001;
        let typeFee = 0;
        switch (this.type) {
            case 'transfer':
                typeFee = baseFee;
                break;
            case 'stake':
                typeFee = baseFee * 2;
                break;
            case 'unstake':
                typeFee = baseFee * 3;
                break;
            case 'swap':
                typeFee = baseFee * 1.5;
                break;
        }
        const largeTxFee = this.amount > 1000 ? this.amount * 0.0005 : 0;
        return Math.max(typeFee + percentageFee + largeTxFee, baseFee);
    }
    getHash() {
        return crypto.SHA256(this.from +
            this.to +
            this.amount +
            this.fee +
            this.timestamp +
            this.type +
            JSON.stringify(this.data || {})).toString();
    }
    signTransaction(privateKey) {
        const hash = this.getHash();
        this.signature = crypto.HmacSHA256(hash, privateKey).toString();
    }
    verifySignature(publicKey) {
        if (!this.signature)
            return false;
        const hash = this.getHash();
        const expectedSignature = crypto.HmacSHA256(hash, publicKey).toString();
        return this.signature === expectedSignature;
    }
    isValid() {
        if (!this.from || !this.to || this.amount <= 0 || this.fee < 0) {
            return false;
        }
        if (this.from === this.to && this.type !== 'stake') {
            return false;
        }
        const now = Date.now();
        const maxAge = 10 * 60 * 1000;
        if (this.timestamp < now - maxAge || this.timestamp > now + 60000) {
            return false;
        }
        switch (this.type) {
            case 'stake':
                return this.amount >= 100;
            case 'unstake':
                return this.amount > 0;
            case 'swap':
                return this.data && this.data.tokenA && this.data.tokenB;
            default:
                return true;
        }
    }
    toJSON() {
        return {
            id: this.id,
            from: this.from,
            to: this.to,
            amount: this.amount,
            fee: this.fee,
            timestamp: this.timestamp,
            signature: this.signature,
            type: this.type,
            data: this.data
        };
    }
    static fromJSON(data) {
        const tx = new Transaction(data.from, data.to, data.amount, data.type, data.data);
        tx.id = data.id;
        tx.fee = data.fee;
        tx.timestamp = data.timestamp;
        tx.signature = data.signature;
        return tx;
    }
}
exports.Transaction = Transaction;
//# sourceMappingURL=Transaction.js.map