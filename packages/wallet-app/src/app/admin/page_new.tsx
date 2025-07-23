'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Activity, Users, Server, TrendingUp, AlertTriangle, Shield, Zap, Database, Settings, Lock, Play, Pause, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';

interface ValidatorInfo {
  id: string;
  name: string;
  address: string;
  stake: number;
  status: 'active' | 'inactive' | 'jailed';
  uptime: number;
  blocksProduced: number;
  commission: number;
  lastSeen: string;
}

interface NetworkHealth {
  status: 'healthy' | 'warning' | 'critical';
  tps: number;
  avgBlockTime: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  nodeCount: number;
  blockHeight: number;
}

interface AdminAction {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
  details: string;
}

export default function AdminDashboard() {
  const { user, api, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [networkHealth, setNetworkHealth] = useState<NetworkHealth>({
    status: 'healthy',
    tps: 2.5,
    avgBlockTime: 15,
    memoryUsage: 45,
    diskUsage: 32,
    networkLatency: 120,
    nodeCount: 3,
    blockHeight: 1250
  });

  const [stats, setStats] = useState({
    totalBlocks: 1250,
    totalTransactions: 45678,
    totalValidators: 3,
    activeValidators: 3,
    totalStake: 125000000,
    networkHashrate: '2.5 TH/s',
    circulatingSupply: 590000000,
    marketCap: 737500000
  });

  const [adminActions, setAdminActions] = useState<AdminAction[]>([
    {
      id: '1',
      action: 'Validator Status Update',
      user: 'admin@vindex.com',
      timestamp: '2024-12-20T10:30:00Z',
      status: 'success',
      details: 'Updated validator_1 commission to 5%'
    },
    {
      id: '2',
      action: 'Network Parameter Change',
      user: 'admin@vindex.com',
      timestamp: '2024-12-20T09:15:00Z',
      status: 'success',
      details: 'Adjusted block time target to 15 seconds'
    },
    {
      id: '3',
      action: 'Emergency Stop',
      user: 'admin@vindex.com',
      timestamp: '2024-12-19T16:45:00Z',
      status: 'success',
      details: 'Emergency stop initiated due to security alert'
    }
  ]);

  const isAdmin = user?.email === 'admin@vindex.com';

  useEffect(() => {
    // Mock validator data
    setValidators([
      {
        id: 'validator_1',
        name: 'Vindex Genesis Validator',
        address: 'VDX1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
        stake: 45000000,
        status: 'active',
        uptime: 99.8,
        blocksProduced: 1247,
        commission: 5,
        lastSeen: '2024-12-20T11:30:00Z'
      },
      {
        id: 'validator_2',
        name: 'Secure Stake Validator',
        address: 'VDX2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1',
        stake: 42000000,
        status: 'active',
        uptime: 99.5,
        blocksProduced: 1198,
        commission: 7,
        lastSeen: '2024-12-20T11:28:00Z'
      },
      {
        id: 'validator_3',
        name: 'DeFi Pro Validator',
        address: 'VDX3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
        stake: 38000000,
        status: 'active',
        uptime: 99.2,
        blocksProduced: 1089,
        commission: 6,
        lastSeen: '2024-12-20T11:29:00Z'
      }
    ]);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setNetworkHealth(prev => ({
        ...prev,
        tps: 2.0 + Math.random() * 1.0,
        avgBlockTime: 14 + Math.random() * 2,
        memoryUsage: 40 + Math.random() * 20,
        networkLatency: 100 + Math.random() * 50,
        blockHeight: prev.blockHeight + Math.floor(Math.random() * 2)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'warning':
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
      case 'inactive':
      case 'jailed':
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const executeAdminAction = async (action: string, params?: any) => {
    if (!isAdmin) {
      alert('Access denied. Admin privileges required.');
      return;
    }

    // Simulate admin action
    const newAction: AdminAction = {
      id: (adminActions.length + 1).toString(),
      action,
      user: user?.email || 'Unknown',
      timestamp: new Date().toISOString(),
      status: 'pending',
      details: `Executing ${action}...`
    };

    setAdminActions(prev => [newAction, ...prev]);

    // Simulate processing
    setTimeout(() => {
      setAdminActions(prev => 
        prev.map(a => 
          a.id === newAction.id 
            ? { ...a, status: 'success', details: `${action} completed successfully` }
            : a
        )
      );
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-red-600" />
              <span className="text-xl font-bold text-gray-900">Vindex Chain</span>
            </Link>
            
            <div className="flex items-center space-x-8">
              <Link href="/explorer" className="text-gray-600 hover:text-gray-900">Explorer</Link>
              <Link href="/staking" className="text-gray-600 hover:text-gray-900">Staking</Link>
              <Link href="/swap" className="text-gray-600 hover:text-gray-900">Swap</Link>
              <Link href="/admin" className="text-red-600 font-medium">Admin</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Admin Dashboard</h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto">
              Monitor and manage the Vindex blockchain network infrastructure
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Access Control */}
        {!isAuthenticated ? (
          <div className="text-center py-12">
            <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-4">Please log in to access the admin dashboard</p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              Go to Login
            </Link>
          </div>
        ) : !isAdmin ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You don't have admin privileges to access this dashboard</p>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="mb-8">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { id: 'overview', label: 'Overview', icon: Activity },
                    { id: 'validators', label: 'Validators', icon: Shield },
                    { id: 'network', label: 'Network Health', icon: Server },
                    { id: 'actions', label: 'Admin Actions', icon: Settings }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab.id
                            ? 'border-red-500 text-red-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Database className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Block Height</dt>
                          <dd className="text-lg font-medium text-gray-900">{formatNumber(networkHealth.blockHeight)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Zap className="h-8 w-8 text-yellow-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">TPS</dt>
                          <dd className="text-lg font-medium text-gray-900">{networkHealth.tps.toFixed(1)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Users className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Active Validators</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.activeValidators}/{stats.totalValidators}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <TrendingUp className="h-8 w-8 text-red-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Market Cap</dt>
                          <dd className="text-lg font-medium text-gray-900">${formatNumber(stats.marketCap)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Network Status */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Network Status</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(networkHealth.status)}`}>
                        {networkHealth.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-gray-500">Average Block Time</p>
                        <p className="text-xl font-semibold text-gray-900">{networkHealth.avgBlockTime.toFixed(1)}s</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Memory Usage</p>
                        <p className="text-xl font-semibold text-gray-900">{networkHealth.memoryUsage.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Disk Usage</p>
                        <p className="text-xl font-semibold text-gray-900">{networkHealth.diskUsage}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Network Latency</p>
                        <p className="text-xl font-semibold text-gray-900">{networkHealth.networkLatency.toFixed(0)}ms</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Connected Nodes</p>
                        <p className="text-xl font-semibold text-gray-900">{networkHealth.nodeCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Stake</p>
                        <p className="text-xl font-semibold text-gray-900">{formatNumber(stats.totalStake)} VDX</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <button
                        onClick={() => executeAdminAction('Emergency Stop')}
                        className="flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Emergency Stop
                      </button>
                      <button
                        onClick={() => executeAdminAction('Restart Network')}
                        className="flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restart Network
                      </button>
                      <button
                        onClick={() => executeAdminAction('Update Parameters')}
                        className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Update Config
                      </button>
                      <button
                        onClick={() => executeAdminAction('Backup Database')}
                        className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        <Database className="h-4 w-4 mr-2" />
                        Backup DB
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'validators' && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Validator Management</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Validator
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stake
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Blocks Produced
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Uptime
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {validators.map((validator) => (
                          <tr key={validator.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {validator.name}
                                </div>
                                <div className="text-sm text-gray-500 font-mono">
                                  {validator.address.slice(0, 20)}...
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatNumber(validator.stake)} VDX
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatNumber(validator.blocksProduced)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {validator.uptime}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(validator.status)}`}>
                                {validator.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button 
                                onClick={() => executeAdminAction(`Jail Validator ${validator.name}`)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Jail
                              </button>
                              <button 
                                onClick={() => executeAdminAction(`Unjail Validator ${validator.name}`)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Unjail
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'network' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">System Resources</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Memory Usage</span>
                          <span>{networkHealth.memoryUsage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${networkHealth.memoryUsage}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Disk Usage</span>
                          <span>{networkHealth.diskUsage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${networkHealth.diskUsage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Network Performance</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Transactions per Second</span>
                        <span className="font-medium">{networkHealth.tps.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Average Block Time</span>
                        <span className="font-medium">{networkHealth.avgBlockTime.toFixed(1)}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Network Latency</span>
                        <span className="font-medium">{networkHealth.networkLatency.toFixed(0)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Connected Peers</span>
                        <span className="font-medium">{networkHealth.nodeCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Recent Admin Actions</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Timestamp
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {adminActions.map((action) => (
                          <tr key={action.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {action.action}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {action.user}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(action.timestamp).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(action.status)}`}>
                                {action.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {action.details}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
