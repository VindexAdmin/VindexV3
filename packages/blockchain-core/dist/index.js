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
exports.Transaction = exports.VindexBlockchain = exports.VindexChainNode = void 0;
const VindexBlockchain_1 = require("./core/VindexBlockchain");
Object.defineProperty(exports, "VindexBlockchain", { enumerable: true, get: function () { return VindexBlockchain_1.VindexBlockchain; } });
const VindexAPI_1 = require("./api/VindexAPI");
const Transaction_1 = require("./core/Transaction");
Object.defineProperty(exports, "Transaction", { enumerable: true, get: function () { return Transaction_1.Transaction; } });
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.join(__dirname, '../../.env') });
class VindexChainNode {
    constructor() {
        this.port = parseInt(process.env.PORT || '3001');
        this.blockchain = new VindexBlockchain_1.VindexBlockchain();
        this.api = new VindexAPI_1.VindexAPI(this.blockchain, this.port);
        this.setupGracefulShutdown();
    }
    async start() {
        try {
            console.log('🔗 Starting Vindex Chain Node...');
            console.log('===============================');
            this.initializeTestData();
            await this.api.start();
            console.log('✅ Vindex Chain Node started successfully!');
            console.log(`🌐 Network: ${this.blockchain.isChainValid() ? 'Valid' : 'Invalid'}`);
            console.log(`📊 Chain Length: ${this.blockchain.getChainLength()}`);
            console.log(`💰 Total Supply: ${this.blockchain.getNetworkStats().totalSupply.toLocaleString()} VDX`);
            console.log('===============================');
            this.startBackgroundTasks();
        }
        catch (error) {
            console.error('❌ Failed to start Vindex Chain Node:', error);
            process.exit(1);
        }
    }
    initializeTestData() {
        try {
            console.log('🔄 Initializing test data...');
            const testTransactions = [
                new Transaction_1.Transaction('vindex_genesis_validator_1', 'test_user_1', 1000, 'transfer'),
                new Transaction_1.Transaction('vindex_genesis_validator_2', 'test_user_2', 2000, 'transfer'),
                new Transaction_1.Transaction('test_user_1', 'vindex_genesis_validator_1', 100, 'stake')
            ];
            testTransactions.forEach(tx => {
                tx.signTransaction('test_private_key_' + tx.from);
            });
            testTransactions.forEach(tx => {
                try {
                    this.blockchain.addTransaction(tx);
                }
                catch (error) {
                    console.warn('⚠️  Could not add test transaction:', error.message);
                }
            });
            const testBlock = this.blockchain.mineBlock();
            if (testBlock) {
                console.log(`✅ Test block mined: #${testBlock.index} with ${testBlock.transactionCount} transactions`);
            }
            console.log('✅ Test data initialized');
        }
        catch (error) {
            console.warn('⚠️  Could not initialize test data:', error.message);
        }
    }
    startBackgroundTasks() {
        setInterval(() => {
            try {
                const pendingCount = this.blockchain.getPendingTransactions().length;
                if (pendingCount > 0) {
                    console.log(`🔨 Auto-mining block with ${pendingCount} pending transactions...`);
                    const block = this.blockchain.mineBlock();
                    if (block) {
                        console.log(`✅ Block #${block.index} mined successfully`);
                    }
                }
            }
            catch (error) {
                console.error('❌ Auto-mining error:', error.message);
            }
        }, 10000);
        setInterval(() => {
            const stats = this.blockchain.getNetworkStats();
            console.log('📊 Network Stats:', {
                chainLength: this.blockchain.getChainLength(),
                pendingTx: this.blockchain.getPendingTransactions().length,
                activeValidators: stats.activeValidators,
                tps: stats.tps.toFixed(2)
            });
        }, 60000);
    }
    setupGracefulShutdown() {
        const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
        signals.forEach(signal => {
            process.on(signal, () => {
                console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
                this.shutdown();
            });
        });
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            this.shutdown();
        });
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            this.shutdown();
        });
    }
    shutdown() {
        console.log('💾 Saving blockchain state...');
        const chainData = this.blockchain.exportChain();
        console.log(`💾 Blockchain exported with ${chainData.chain.length} blocks`);
        console.log('👋 Vindex Chain Node shutdown complete');
        process.exit(0);
    }
}
exports.VindexChainNode = VindexChainNode;
if (require.main === module) {
    const node = new VindexChainNode();
    node.start().catch(error => {
        console.error('❌ Failed to start node:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map