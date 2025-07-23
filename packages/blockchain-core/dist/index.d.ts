import { VindexBlockchain } from './core/VindexBlockchain';
import { Transaction } from './core/Transaction';
declare class VindexChainNode {
    private blockchain;
    private api;
    private port;
    constructor();
    start(): Promise<void>;
    private initializeTestData;
    private startBackgroundTasks;
    private setupGracefulShutdown;
    private shutdown;
}
export { VindexChainNode, VindexBlockchain, Transaction };
//# sourceMappingURL=index.d.ts.map