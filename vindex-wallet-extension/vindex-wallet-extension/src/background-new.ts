// Background script for Vindex Wallet Extension
// Handles extension lifecycle, messaging, and blockchain interactions

const VINDEX_API_BASE = 'http://localhost:3001/api';

// Extension installation
(chrome as any).runtime.onInstalled.addListener((details: any) => {
    console.log('Vindex Wallet Extension installed', details);
    
    // Initialize default settings
    (chrome as any).storage.local.set({
        apiEndpoint: VINDEX_API_BASE,
        networkId: 'vindex-mainnet',
        autoConnect: true
    });
});

// Message handling between popup, content scripts, and websites
(chrome as any).runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
    console.log('Background received message:', request);

    switch (request.action) {
        case 'getWalletInfo':
            handleGetWalletInfo(sendResponse);
            break;
            
        case 'createWallet':
            handleCreateWallet(request.data, sendResponse);
            break;
            
        case 'sendTransaction':
            handleSendTransaction(request.data, sendResponse);
            break;
            
        case 'getBalance':
            handleGetBalance(request.data, sendResponse);
            break;
            
        case 'connectToSite':
            handleConnectToSite(request.data, sender, sendResponse);
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
    
    return true; // Indicates async response
});

// Wallet info retrieval
async function handleGetWalletInfo(sendResponse: (response: any) => void) {
    try {
        const storage = await (chrome as any).storage.local.get(['walletAddress', 'isConnected']);
        
        if (storage.isConnected && storage.walletAddress) {
            const balance = await fetchBalance(storage.walletAddress);
            sendResponse({
                success: true,
                data: {
                    address: storage.walletAddress,
                    balance,
                    isConnected: true
                }
            });
        } else {
            sendResponse({
                success: true,
                data: { isConnected: false }
            });
        }
    } catch (error) {
        sendResponse({ success: false, error: (error as Error).message });
    }
}

// Wallet creation
async function handleCreateWallet(data: any, sendResponse: (response: any) => void) {
    try {
        const response = await fetch(`${VINDEX_API_BASE}/wallet/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const walletData = await response.json();
        
        if (walletData.success) {
            await (chrome as any).storage.local.set({
                walletAddress: walletData.data.address,
                isConnected: true
            });
            
            sendResponse({ success: true, data: walletData.data });
        } else {
            sendResponse({ success: false, error: walletData.error });
        }
    } catch (error) {
        sendResponse({ success: false, error: (error as Error).message });
    }
}

// Transaction sending
async function handleSendTransaction(data: any, sendResponse: (response: any) => void) {
    try {
        const response = await fetch(`${VINDEX_API_BASE}/transactions/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        sendResponse(result);
    } catch (error) {
        sendResponse({ success: false, error: (error as Error).message });
    }
}

// Balance fetching
async function fetchBalance(address: string): Promise<number> {
    try {
        const response = await fetch(`${VINDEX_API_BASE}/wallet/${address}/balance`);
        const data = await response.json();
        return data.balance || 0;
    } catch (error) {
        console.error('Error fetching balance:', error);
        return 0;
    }
}

// Handle balance requests
async function handleGetBalance(data: any, sendResponse: (response: any) => void) {
    try {
        const balance = await fetchBalance(data.address);
        sendResponse({ success: true, data: { balance } });
    } catch (error) {
        sendResponse({ success: false, error: (error as Error).message });
    }
}

// Handle website connection requests
async function handleConnectToSite(data: any, sender: any, sendResponse: (response: any) => void) {
    try {
        // Check if extension is already connected
        const storage = await (chrome as any).storage.local.get(['walletAddress', 'isConnected', 'connectedSites']);
        
        if (!storage.isConnected) {
            sendResponse({ success: false, error: 'No wallet connected' });
            return;
        }
        
        const connectedSites = storage.connectedSites || [];
        const siteUrl = new URL(sender.tab?.url || '').origin;
        
        // Add site to connected sites if not already connected
        if (!connectedSites.includes(siteUrl)) {
            connectedSites.push(siteUrl);
            await (chrome as any).storage.local.set({ connectedSites });
        }
        
        sendResponse({
            success: true,
            data: {
                address: storage.walletAddress,
                connected: true
            }
        });
    } catch (error) {
        sendResponse({ success: false, error: (error as Error).message });
    }
}

// Handle external connections (for dApps)
(chrome as any).runtime.onConnectExternal.addListener((port: any) => {
    console.log('External connection established:', port);
    
    port.onMessage.addListener(async (message: any) => {
        switch (message.type) {
            case 'REQUEST_CONNECTION':
                // Handle dApp connection request
                break;
            case 'REQUEST_TRANSACTION':
                // Handle transaction request from dApp
                break;
        }
    });
});
