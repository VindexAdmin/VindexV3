import React, { useState, useEffect } from 'react';
import './Options.css';

interface ExtensionSettings {
  apiEndpoint: string;
  networkId: string;
  autoConnect: boolean;
}

const Options: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>({
    apiEndpoint: 'http://localhost:3001/api',
    networkId: 'vindex-mainnet',
    autoConnect: true
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const result = await (chrome as any).storage.local.get(['apiEndpoint', 'networkId', 'autoConnect']);
    setSettings({
      apiEndpoint: result.apiEndpoint || 'http://localhost:3001/api',
      networkId: result.networkId || 'vindex-mainnet',
      autoConnect: result.autoConnect ?? true
    });
  };

  const saveSettings = async () => {
    await (chrome as any).storage.local.set(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetWallet = async () => {
    if (confirm('This will remove all wallet data. Are you sure?')) {
      await (chrome as any).storage.local.clear();
      alert('Wallet data cleared successfully');
    }
  };

  return (
    <div className="options-container">
      <h1>Vindex Wallet Settings</h1>
      
      <div className="section">
        <h2>Network Settings</h2>
        
        <div className="field">
          <label>API Endpoint:</label>
          <input
            type="text"
            value={settings.apiEndpoint}
            onChange={(e) => setSettings({...settings, apiEndpoint: e.target.value})}
          />
        </div>
        
        <div className="field">
          <label>Network ID:</label>
          <select
            value={settings.networkId}
            onChange={(e) => setSettings({...settings, networkId: e.target.value})}
          >
            <option value="vindex-mainnet">Vindex Mainnet</option>
            <option value="vindex-testnet">Vindex Testnet</option>
            <option value="vindex-devnet">Vindex Devnet</option>
          </select>
        </div>
      </div>

      <div className="section">
        <h2>Connection Settings</h2>
        
        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={settings.autoConnect}
              onChange={(e) => setSettings({...settings, autoConnect: e.target.checked})}
            />
            Auto-connect to trusted sites
          </label>
        </div>
      </div>

      <div className="section">
        <h2>Wallet Management</h2>
        
        <button className="btn btn-danger" onClick={resetWallet}>
          Reset Wallet
        </button>
        
        <p className="warning">
          ⚠️ This will permanently delete all wallet data including private keys.
        </p>
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={saveSettings}>
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default Options;
