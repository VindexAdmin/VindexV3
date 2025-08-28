import React, { useState, useEffect } from 'react';
import './Popup.css';

interface WalletData {
  address?: string;
  balance?: number;
  isConnected: boolean;
}

const Popup: React.FC = () => {
  const [wallet, setWallet] = useState<WalletData>({ isConnected: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      // Get wallet data from Chrome storage
      const result = await (chrome as any).storage.local.get(['walletAddress', 'isConnected']);
      
      if (result.isConnected && result.walletAddress) {
        // Fetch balance from Vindex API
        const balance = await fetchBalance(result.walletAddress);
        setWallet({
          address: result.walletAddress,
          balance,
          isConnected: true
        });
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async (address: string): Promise<number> => {
    try {
      const response = await fetch(`http://localhost:3001/api/wallet/${address}/balance`);
      const data = await response.json();
      return data.balance || 0;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return 0;
    }
  };

  const createWallet = async () => {
    setLoading(true);
    try {
      // Generate new wallet
      const response = await fetch('http://localhost:3001/api/wallet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const walletData = await response.json();
      
      // Save to Chrome storage
      await (chrome as any).storage.local.set({
        walletAddress: walletData.address,
        isConnected: true
      });
      
      setWallet({
        address: walletData.address,
        balance: 0,
        isConnected: true
      });
    } catch (error) {
      console.error('Error creating wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const openFullWallet = () => {
    (chrome as any).tabs.create({ url: 'http://localhost:3005' });
  };

  if (loading) {
    return (
      <div className="popup-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <div className="header">
        <img src="icon48.png" alt="Vindex" className="logo" />
        <h1 className="title">Vindex Wallet</h1>
      </div>

      {wallet.isConnected ? (
        <div className="wallet-connected">
          <div className="address">
            <label>Address:</label>
            <span className="address-text">
              {wallet.address?.substring(0, 6)}...{wallet.address?.substring(-4)}
            </span>
          </div>
          
          <div className="balance">
            <span className="amount">{wallet.balance?.toLocaleString() || 0}</span>
            <span className="currency">VDX</span>
          </div>

          <div className="actions">
            <button className="btn btn-primary" onClick={openFullWallet}>
              Open Wallet
            </button>
            <button className="btn btn-secondary" onClick={loadWalletData}>
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="wallet-disconnected">
          <p>No wallet connected</p>
          <button className="btn btn-primary" onClick={createWallet}>
            Create Wallet
          </button>
          <button className="btn btn-secondary" onClick={openFullWallet}>
            Import Wallet
          </button>
        </div>
      )}

      <div className="footer">
        <span>Vindex Chain v1.0.0</span>
      </div>
    </div>
  );
};

export default Popup;