"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VindexAPI = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const Transaction_1 = require("../core/Transaction");
class VindexAPI {
    constructor(blockchain, port = 3001) {
        this.app = (0, express_1.default)();
        this.blockchain = blockchain;
        this.port = port;
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use((0, helmet_1.default)());
        this.app.use((0, cors_1.default)());
        this.app.use((0, compression_1.default)());
        this.app.use((0, morgan_1.default)('combined'));
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
    }
    setupRoutes() {
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: Date.now(),
                version: '1.0.0',
                network: 'Vindex Chain'
            });
        });
        this.app.get('/api/blockchain/info', (req, res) => {
            try {
                const stats = this.blockchain.getNetworkStats();
                const latestBlock = this.blockchain.getLatestBlock();
                res.json({
                    success: true,
                    data: {
                        ...stats,
                        latestBlock: {
                            index: latestBlock.index,
                            hash: latestBlock.hash,
                            timestamp: latestBlock.timestamp,
                            transactionCount: latestBlock.transactionCount
                        },
                        chainLength: this.blockchain.getChainLength(),
                        isValid: this.blockchain.isChainValid()
                    }
                });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        this.app.get('/api/blocks/:identifier', (req, res) => {
            try {
                const { identifier } = req.params;
                let block;
                if (!isNaN(Number(identifier))) {
                    block = this.blockchain.getBlock(Number(identifier));
                }
                else {
                    block = this.blockchain.getBlockByHash(identifier);
                }
                if (!block) {
                    return res.status(404).json({ success: false, error: 'Block not found' });
                }
                return res.json({ success: true, data: block.toJSON() });
            }
            catch (error) {
                return res.status(500).json({ success: false, error: error.message });
            }
        });
        this.app.get('/api/blocks', (req, res) => {
            try {
                const limit = Math.min(parseInt(req.query.limit) || 10, 100);
                const offset = parseInt(req.query.offset) || 0;
                const chainLength = this.blockchain.getChainLength();
                const blocks = [];
                for (let i = Math.max(0, chainLength - offset - limit); i < chainLength - offset; i++) {
                    const block = this.blockchain.getBlock(i);
                    if (block) {
                        blocks.unshift(block.toJSON());
                    }
                }
                res.json({
                    success: true,
                    data: blocks,
                    pagination: {
                        total: chainLength,
                        limit,
                        offset,
                        hasMore: offset + limit < chainLength
                    }
                });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        this.app.get('/api/transactions/:txId', (req, res) => {
            try {
                const { txId } = req.params;
                const transaction = this.blockchain.getTransaction(txId);
                if (!transaction) {
                    return res.status(404).json({ success: false, error: 'Transaction not found' });
                }
                res.json({ success: true, data: transaction });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        this.app.get('/api/transactions/pending', (req, res) => {
            try {
                const pending = this.blockchain.getPendingTransactions();
                const limit = Math.min(parseInt(req.query.limit) || 20, 100);
                res.json({
                    success: true,
                    data: pending.slice(0, limit).map(tx => tx.toJSON()),
                    total: pending.length
                });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        this.app.post('/api/transactions', (req, res) => {
            try {
                const { from, to, amount, type, data, signature } = req.body;
                if (!from || !to || typeof amount !== 'number' || amount <= 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid transaction data. Required: from, to, amount > 0'
                    });
                }
                const transaction = new Transaction_1.Transaction(from, to, amount, type, data);
                if (signature) {
                    transaction.signature = signature;
                }
                const success = this.blockchain.addTransaction(transaction);
                if (success) {
                    res.json({
                        success: true,
                        data: {
                            transactionId: transaction.id,
                            message: 'Transaction submitted successfully'
                        }
                    });
                }
                else {
                    res.status(400).json({ success: false, error: 'Failed to add transaction' });
                }
            }
            catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        });
        this.app.get('/api/accounts/:address', (req, res) => {
            try {
                const { address } = req.params;
                const balance = this.blockchain.getBalance(address);
                res.json({
                    success: true,
                    data: {
                        address,
                        balance,
                    }
                });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        this.app.post('/api/mine', (req, res) => {
            try {
                const block = this.blockchain.mineBlock();
                if (block) {
                    res.json({
                        success: true,
                        data: {
                            message: 'Block mined successfully',
                            block: block.toJSON()
                        }
                    });
                }
                else {
                    res.json({
                        success: true,
                        data: { message: 'No transactions to mine' }
                    });
                }
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        this.app.get('/api/search/:query', (req, res) => {
            try {
                const { query } = req.params;
                const results = {
                    blocks: [],
                    transactions: [],
                    addresses: []
                };
                if (!isNaN(Number(query))) {
                    const block = this.blockchain.getBlock(Number(query));
                    if (block) {
                        results.blocks.push(block.toJSON());
                    }
                }
                else if (query.length === 64) {
                    const block = this.blockchain.getBlockByHash(query);
                    if (block) {
                        results.blocks.push(block.toJSON());
                    }
                    const transaction = this.blockchain.getTransaction(query);
                    if (transaction) {
                        results.transactions.push(transaction);
                    }
                }
                res.json({ success: true, data: results });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        this.app.get('/api/stats', (req, res) => {
            try {
                const stats = this.blockchain.getNetworkStats();
                res.json({ success: true, data: stats });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        this.app.get('/api/export', (req, res) => {
            try {
                const chainData = this.blockchain.exportChain();
                res.json({ success: true, data: chainData });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                availableEndpoints: [
                    'GET /health',
                    'GET /api/blockchain/info',
                    'GET /api/blocks/:identifier',
                    'GET /api/blocks',
                    'GET /api/transactions/:txId',
                    'GET /api/transactions/pending',
                    'POST /api/transactions',
                    'GET /api/accounts/:address',
                    'POST /api/mine',
                    'GET /api/search/:query',
                    'GET /api/stats',
                    'GET /api/export'
                ]
            });
        });
        this.app.use((error, req, res, next) => {
            console.error('API Error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: Date.now()
            });
        });
    }
    start() {
        return new Promise((resolve) => {
            this.app.listen(this.port, () => {
                console.log(`🚀 Vindex Chain API running on port ${this.port}`);
                console.log(`📊 Health check: http://localhost:${this.port}/health`);
                console.log(`🔗 Blockchain info: http://localhost:${this.port}/api/blockchain/info`);
                resolve();
            });
        });
    }
    getApp() {
        return this.app;
    }
}
exports.VindexAPI = VindexAPI;
//# sourceMappingURL=VindexAPI_old.js.map