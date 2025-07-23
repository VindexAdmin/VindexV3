'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../lib/auth-context';
import SimplePasswordInput from '../components/ui/SimplePasswordInput';
import WalletPanel from '../components/ui/WalletPanel';
import Navigation from '../components/ui/Navigation';
import { Wallet as WalletIcon } from 'lucide-react';

interface AuthFormProps {
  onClose: () => void;
  isLogin: boolean;
  onToggle: () => void;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
}

const AuthModal = ({ onClose, isLogin, onToggle }: AuthFormProps) => {
  const { login, register, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      setIsLoading(false);
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!isLogin && formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        setSuccess('Login successful!');
      } else {
        await register(
          formData.email,
          formData.password,
          formData.firstName || undefined,
          formData.lastName || undefined
        );
        setSuccess('Account created successfully! Your wallet has been automatically created.');
      }
      
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMnemonic = (): string => {
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
      'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual'
    ];
    return Array.from({ length: 12 }, () => words[Math.floor(Math.random() * words.length)]).join(' ');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-600">
            {isLogin ? 'Sign in to your Vindex account' : 'Join the Vindex ecosystem'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name"
                value={formData.firstName || ''}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={formData.lastName || ''}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>
          )}

          <input
            type="email"
            placeholder="Email address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            required
          />

          <SimplePasswordInput
            placeholder="Password"
            value={formData.password}
            onChange={(value) => setFormData({ ...formData, password: value })}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />

          {!isLogin && (
            <SimplePasswordInput
              placeholder="Confirm Password"
              value={formData.confirmPassword || ''}
              onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-600 text-sm text-center bg-green-50 border border-green-200 rounded-lg p-3"
            >
              {success}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={onToggle}
              className="text-red-600 hover:text-red-700 font-medium ml-1"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function LandingPage() {
  const { user, wallets, isAuthenticated, logout, isLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showWalletPanel, setShowWalletPanel] = useState(false);

  const features = [
    {
      icon: '🔒',
      title: 'Secure Wallet',
      description: 'Military-grade encryption protects your VDX tokens and private keys.'
    },
    {
      icon: '⚡',
      title: 'Fast Transactions',
      description: 'Experience lightning-fast transactions with minimal fees on Proof of Stake.'
    },
    {
      icon: '💎',
      title: 'Staking Rewards',
      description: 'Earn up to 8% APY by staking your VDX tokens and securing the network.'
    },
    {
      icon: '🔄',
      title: 'Built-in DEX',
      description: 'Swap tokens seamlessly with our integrated decentralized exchange.'
    },
    {
      icon: '📊',
      title: 'Analytics Dashboard',
      description: 'Track your portfolio performance and network statistics in real-time.'
    },
    {
      icon: '🌐',
      title: 'Cross-Chain Compatible',
      description: 'Bridge your assets across multiple blockchain networks effortlessly.'
    }
  ];

  const stats = [
    { value: '1B', label: 'Total Supply', description: 'VDX Tokens' },
    { value: '590M', label: 'Circulating', description: 'Available' },
    { value: '3', label: 'Validators', description: 'Securing Network' },
    { value: '8%', label: 'Staking APY', description: 'Annual Rewards' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navigation 
        onOpenAuth={(isLogin) => {
          setIsLogin(isLogin);
          setShowAuth(true);
        }}
        onOpenWallet={() => setShowWalletPanel(true)}
      />

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-red-50 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-5xl md:text-7xl font-bold text-gray-900 mb-6"
            >
              The Future of
              <span className="text-red-600 block">Decentralized Finance</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto"
            >
              Experience lightning-fast transactions, secure staking, and seamless token swaps
              on the most advanced Proof of Stake blockchain ecosystem.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <button
                onClick={() => {
                  setIsLogin(false);
                  setShowAuth(true);
                }}
                className="bg-red-600 text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-red-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                Create Wallet
              </button>
              <Link
                href="/explorer"
                className="border-2 border-red-600 text-red-600 px-8 py-4 rounded-xl text-lg font-medium hover:bg-red-600 hover:text-white transform hover:scale-105 transition-all duration-200"
              >
                Explore Network
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-red-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-lg font-medium text-gray-900 mb-1">
                  {stat.label}
                </div>
                <div className="text-sm text-gray-600">
                  {stat.description}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Built for the Future
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover the powerful features that make Vindex Chain the ideal platform
              for your decentralized finance needs.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
              Join thousands of users who are already building the future of finance
              with Vindex Chain.
            </p>
            <button
              onClick={() => {
                setIsLogin(false);
                setShowAuth(true);
              }}
              className="bg-white text-red-600 px-8 py-4 rounded-xl text-lg font-medium hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Create Your Wallet Now
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">V</span>
                </div>
                <span className="text-xl font-bold">Vindex Chain</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                The next-generation blockchain platform empowering decentralized finance
                with security, speed, and scalability.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Twitter
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Discord
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  GitHub
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Telegram
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <div className="space-y-2">
                <Link href="/wallet" className="block text-gray-400 hover:text-white transition-colors">
                  Wallet
                </Link>
                <Link href="/explorer" className="block text-gray-400 hover:text-white transition-colors">
                  Explorer
                </Link>
                <Link href="/staking" className="block text-gray-400 hover:text-white transition-colors">
                  Staking
                </Link>
                <Link href="/swap" className="block text-gray-400 hover:text-white transition-colors">
                  Swap
                </Link>
                <Link href="/bridge" className="block text-gray-400 hover:text-white transition-colors">
                  Bridge
                </Link>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <div className="space-y-2">
                <Link href="/docs" className="block text-gray-400 hover:text-white transition-colors">
                  Documentation
                </Link>
                <Link href="/whitepaper" className="block text-gray-400 hover:text-white transition-colors">
                  Whitepaper
                </Link>
                <Link href="/admin" className="block text-gray-400 hover:text-white transition-colors">
                  Admin Dashboard
                </Link>
                <Link href="/support" className="block text-gray-400 hover:text-white transition-colors">
                  Support
                </Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Vindex Chain. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          isLogin={isLogin}
          onToggle={() => setIsLogin(!isLogin)}
        />
      )}

      {/* Wallet Panel */}
      <WalletPanel
        isOpen={showWalletPanel}
        onClose={() => setShowWalletPanel(false)}
      />
    </div>
  );
}
