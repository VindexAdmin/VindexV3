'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, ExternalLink, AlertCircle, CheckCircle, Copy, LogOut, ChevronDown } from 'lucide-react';
import { phantomWalletService, type WalletConnection } from '../../../lib/phantom-wallet-service';
import { solflareWalletService, type SolflareWalletInfo } from '../../../lib/solflare-wallet-service';

interface WalletConnectorProps {
  onConnectionChange?: (connection: UnifiedConnection | null) => void;
  className?: string;
  preferredWallet?: 'phantom' | 'solflare';
}

type WalletType = 'phantom' | 'solflare';

interface UnifiedConnection {
  address: string;
  balance: number;
  isConnected: boolean;
  walletType: WalletType;
  network?: string;
}

export default function WalletConnector({ onConnectionChange, className = '', preferredWallet = 'phantom' }: WalletConnectorProps) {
  const [connection, setConnection] = useState<UnifiedConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [showWalletSelection, setShowWalletSelection] = useState(false);

  useEffect(() => {
    initializeConnection();
    
    // Set up event listeners for both wallets
    const phantomUnsubscribe = phantomWalletService.onAccountChanged((address) => {
      if (address && connection?.walletType === 'phantom') {
        updatePhantomConnection();
      } else if (!address && connection?.walletType === 'phantom') {
        handleDisconnect();
      }
    });

    const handleSolflareDisconnect = () => {
      if (connection?.walletType === 'solflare') {
        setConnection(null);
        setError(null);
        onConnectionChange?.(null);
      }
    };

    const handleSolflareAccountChange = (walletInfo: SolflareWalletInfo | null) => {
      if (walletInfo && connection?.walletType === 'solflare') {
        const unifiedConnection: UnifiedConnection = {
          address: walletInfo.publicKey,
          balance: walletInfo.balance || 0,
          isConnected: walletInfo.isConnected,
          walletType: 'solflare'
        };
        setConnection(unifiedConnection);
        onConnectionChange?.(unifiedConnection);
      }
    };

    solflareWalletService.on('disconnect', handleSolflareDisconnect);
    solflareWalletService.on('accountChanged', handleSolflareAccountChange);

    return () => {
      phantomUnsubscribe();
      solflareWalletService.off('disconnect', handleSolflareDisconnect);
      solflareWalletService.off('accountChanged', handleSolflareAccountChange);
    };
  }, [connection?.walletType, onConnectionChange]);

  const initializeConnection = async () => {
    try {
      // Try Phantom first
      const phantomConnection = await phantomWalletService.connectSilently();
      if (phantomConnection) {
        const unifiedConnection: UnifiedConnection = {
          address: phantomConnection.address,
          balance: phantomConnection.balance || 0,
          isConnected: phantomConnection.isConnected,
          network: phantomConnection.network,
          walletType: 'phantom'
        };
        setConnection(unifiedConnection);
        onConnectionChange?.(unifiedConnection);
        return;
      }

      // Check if Solflare is connected
      if (solflareWalletService.isConnected()) {
        const solflareInfo = solflareWalletService.getWalletInfo();
        if (solflareInfo) {
          const unifiedConnection: UnifiedConnection = {
            address: solflareInfo.publicKey,
            balance: solflareInfo.balance || 0,
            isConnected: true,
            walletType: 'solflare'
          };
          setConnection(unifiedConnection);
          onConnectionChange?.(unifiedConnection);
        }
      }
    } catch (error) {
      console.error('Silent connection failed:', error);
    }
  };

  const updatePhantomConnection = async () => {
    try {
      const currentConnection = phantomWalletService.getConnection();
      if (currentConnection) {
        const balance = await phantomWalletService.getBalance();
        const unifiedConnection: UnifiedConnection = {
          address: currentConnection.address,
          balance: balance || 0,
          isConnected: currentConnection.isConnected,
          network: currentConnection.network,
          walletType: 'phantom'
        };
        setConnection(unifiedConnection);
        onConnectionChange?.(unifiedConnection);
      }
    } catch (error) {
      console.error('Failed to update Phantom connection:', error);
    }
  };

  const handleConnectPhantom = async () => {
    if (!phantomWalletService.isInstalled()) {
      window.open(phantomWalletService.getInstallUrl(), '_blank');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setShowWalletSelection(false);

    try {
      const phantomConnection = await phantomWalletService.connect();
      const unifiedConnection: UnifiedConnection = {
        address: phantomConnection.address,
        balance: phantomConnection.balance || 0,
        isConnected: phantomConnection.isConnected,
        network: phantomConnection.network,
        walletType: 'phantom'
      };
      setConnection(unifiedConnection);
      onConnectionChange?.(unifiedConnection);
    } catch (error: any) {
      console.error('Phantom connection failed:', error);
      setError(error.message || 'Failed to connect Phantom wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectSolflare = async () => {
    if (!solflareWalletService.isInstalled()) {
      window.open('https://solflare.com', '_blank');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setShowWalletSelection(false);

    try {
      const solflareInfo = await solflareWalletService.connect();
      const unifiedConnection: UnifiedConnection = {
        address: solflareInfo.publicKey,
        balance: solflareInfo.balance || 0,
        isConnected: true,
        walletType: 'solflare'
      };
      setConnection(unifiedConnection);
      onConnectionChange?.(unifiedConnection);
    } catch (error: any) {
      console.error('Solflare connection failed:', error);
      setError(error.message || 'Failed to connect Solflare wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (connection?.walletType === 'phantom') {
        await phantomWalletService.disconnect();
      } else if (connection?.walletType === 'solflare') {
        await solflareWalletService.disconnect();
      }
      
      setConnection(null);
      setError(null);
      onConnectionChange?.(null);
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const handleCopyAddress = async () => {
    if (connection?.address) {
      try {
        await navigator.clipboard.writeText(connection.address);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy address:', error);
      }
    }
  };

  const handleRequestAirdrop = async () => {
    if (!connection || connection.walletType !== 'phantom') return;
    
    try {
      setError(null);
      await phantomWalletService.requestAirdrop(1);
      // Refresh balance after airdrop
      setTimeout(() => updatePhantomConnection(), 5000);
    } catch (error: any) {
      setError(error.message || 'Airdrop failed');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getWalletIcon = (walletType: WalletType) => {
    switch (walletType) {
      case 'phantom':
        return '👻';
      case 'solflare':
        return '☀️';
      default:
        return '🔗';
    }
  };

  const getWalletName = (walletType: WalletType) => {
    switch (walletType) {
      case 'phantom':
        return 'Phantom';
      case 'solflare':
        return 'Solflare';
      default:
        return 'Wallet';
    }
  };

  if (connection?.isConnected) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getWalletIcon(connection.walletType)}</span>
              <span className="font-medium text-gray-900">{getWalletName(connection.walletType)}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600">Connected</span>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Disconnect"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Address:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">{formatAddress(connection.address)}</span>
              <button
                onClick={handleCopyAddress}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={showCopied ? "Copied!" : "Copy address"}
              >
                {showCopied ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Balance:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{connection.balance.toFixed(4)} SOL</span>
              {connection.walletType === 'phantom' && (
                <button
                  onClick={handleRequestAirdrop}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  title="Request testnet SOL"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <Wallet className="w-5 h-5" />
          <span className="font-medium">Connect Wallet</span>
        </div>

        {showWalletSelection ? (
          <div className="space-y-2">
            <button
              onClick={handleConnectPhantom}
              disabled={isConnecting}
              className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">👻</span>
                <div className="text-left">
                  <p className="font-medium">Phantom</p>
                  <p className="text-sm text-gray-500">
                    {phantomWalletService.isInstalled() ? 'Detected' : 'Install required'}
                  </p>
                </div>
              </div>
              {!phantomWalletService.isInstalled() && <ExternalLink className="w-4 h-4 text-gray-400" />}
            </button>

            <button
              onClick={handleConnectSolflare}
              disabled={isConnecting}
              className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">☀️</span>
                <div className="text-left">
                  <p className="font-medium">Solflare</p>
                  <p className="text-sm text-gray-500">
                    {solflareWalletService.isInstalled() ? 'Detected' : 'Install required'}
                  </p>
                </div>
              </div>
              {!solflareWalletService.isInstalled() && <ExternalLink className="w-4 h-4 text-gray-400" />}
            </button>

            <button
              onClick={() => setShowWalletSelection(false)}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowWalletSelection(true)}
            disabled={isConnecting}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Connecting...
              </>
            ) : (
              <>
                Select Wallet
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        )}

        {error && (
          <div className="flex items-center justify-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export type { UnifiedConnection };
