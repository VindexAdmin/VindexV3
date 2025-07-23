import express from 'express';
import { VindexBlockchain } from '../core/VindexBlockchain';
export declare class VindexAPI {
    private app;
    private blockchain;
    private port;
    constructor(blockchain: VindexBlockchain, port?: number);
    private setupMiddleware;
    private setupRoutes;
    start(): Promise<void>;
    getApp(): express.Application;
}
//# sourceMappingURL=VindexAPI_old.d.ts.map