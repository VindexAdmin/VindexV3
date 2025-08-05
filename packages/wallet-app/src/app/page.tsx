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
import { HDNode } from '@ethersproject/hdnode';
import crypto from 'crypto';

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
  const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false);
  const [walletInfo, setWalletInfo] = useState<{mnemonic: string; address: string} | null>(null);

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

    if (!isLogin) {
      // Password validation
      const hasUpperCase = /[A-Z]/.test(formData.password);
      const hasLowerCase = /[a-z]/.test(formData.password);
      const hasNumber = /\d/.test(formData.password);
      const hasSpecialChar = /[@$!%*?&]/.test(formData.password);
      const isLongEnough = formData.password.length >= 8;

      if (!isLongEnough || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
        setError('Password must contain at least:\n- 8 characters\n- One uppercase letter\n- One lowercase letter\n- One number\n- One special character (@$!%*?&)');
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        setSuccess('Login successful!');
        setTimeout(() => onClose(), 1500);
      } else {
        console.log('Starting registration process...', {
          email: formData.email,
          hasPassword: !!formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName
        });

        // Generate wallet using HDNode
        const randomBytes = crypto.randomBytes(16);
        const walletNode = HDNode.fromSeed(randomBytes);
        const walletAccount = walletNode.derivePath("m/44'/60'/0'/0/0");
        
        const walletData = {
          mnemonic: walletNode.mnemonic?.phrase || generateMnemonic(),
          address: walletAccount.address,
          privateKey: walletAccount.privateKey
        };

        await register(
          formData.email,
          formData.password,
          formData.firstName || undefined,
          formData.lastName || undefined,
          walletData
        );
        
        setWalletInfo({
          mnemonic: walletData.mnemonic,
          address: walletData.address
        });
        setShowRecoveryPhrase(true);
        setSuccess('Account created successfully!');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMnemonic = (): string => {
    // Using HDNode to generate a random mnemonic
    const randomBytes = crypto.randomBytes(16);
    const node = HDNode.fromSeed(randomBytes);
    return node.mnemonic?.phrase || '';
  };

  if (showRecoveryPhrase && walletInfo) {
    const [copiedPhrase, setCopiedPhrase] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState(false);
    const [checkboxChecked, setCheckboxChecked] = useState(false);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1.05, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white border-4 border-red-600 shadow-2xl rounded-2xl p-8 max-w-2xl w-full animate-pulse-once"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-yellow-200 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-yellow-400">
              <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Account Created Successfully!
            </h2>
            <p className="text-red-600 font-bold text-lg">
              ⚠️ SAVE YOUR RECOVERY PHRASE ⚠️
            </p>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
            <p className="text-yellow-900 text-sm mb-2 font-semibold">
              This is your wallet recovery phrase. Write it down and store it in a safe place.<br />
              <span className="text-red-600 font-bold">Never share it with anyone.</span>
            </p>
            <p className="text-xs text-yellow-700">If you lose this phrase, you will lose access to your wallet and funds.</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recovery Phrase (12 words):</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {walletInfo.mnemonic.split(' ').map((word, index) => (
                <div key={index} className="bg-white border border-gray-300 rounded px-3 py-2 text-sm flex items-center">
                  <span className="text-gray-400 mr-2">{index + 1}.</span>
                  <span className="font-mono text-gray-800">{word}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(walletInfo.mnemonic);
                setCopiedPhrase(true);
                setTimeout(() => setCopiedPhrase(false), 2000);
              }}
              className={`text-sm font-medium px-3 py-2 rounded transition-colors ${copiedPhrase ? 'bg-green-100 text-green-700 border border-green-400' : 'text-red-600 hover:text-white hover:bg-red-600 border border-red-200'}`}
            >
              {copiedPhrase ? 'Copied!' : 'Copy Recovery Phrase'}
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Wallet Address:</h3>
              <p className="font-mono text-xs break-all mb-2 sm:mb-0">{walletInfo.address}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(walletInfo.address);
                setCopiedAddress(true);
                setTimeout(() => setCopiedAddress(false), 2000);
              }}
              className={`text-xs font-medium px-3 py-2 rounded transition-colors mt-2 sm:mt-0 ${copiedAddress ? 'bg-green-100 text-green-700 border border-green-400' : 'text-red-600 hover:text-white hover:bg-red-600 border border-red-200'}`}
            >
              {copiedAddress ? 'Copied!' : 'Copy Address'}
            </button>
          </div>

          <div className="flex items-start space-x-2 mb-6">
            <input
              type="checkbox"
              id="confirm-saved"
              className="mt-1 accent-red-600"
              checked={checkboxChecked}
              onChange={e => setCheckboxChecked(e.target.checked)}
              required
            />
            <label htmlFor="confirm-saved" className="text-sm text-gray-700">
              I have written down my recovery phrase and stored it in a safe place.<br />
              <span className="font-semibold text-red-600">I understand that I will lose access to my wallet if I lose this phrase.</span>
            </label>
          </div>

          <button
            type="button"
            disabled={!checkboxChecked}
            onClick={() => onClose()}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${checkboxChecked ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          >
            Continue to Wallet
          </button>
        </motion.div>
      </motion.div>
    );
  }

  // ...existing code for the regular auth form...
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
        {/* ...existing code for the form... */}
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
              className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3 whitespace-pre-line"
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
