'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Wallet as WalletIcon, 
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import WalletPanel from './WalletPanel';

interface NavigationProps {
  onOpenAuth?: (isLogin: boolean) => void;
  onOpenWallet?: () => void;
}

export default function Navigation({ onOpenAuth, onOpenWallet }: NavigationProps) {
  const { user, wallets, isAuthenticated, logout } = useAuth();
  const [showWalletPanel, setShowWalletPanel] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const pathname = usePathname();

  const navigationItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/explorer', label: 'Explorer', icon: '🔍' },
    { href: '/staking', label: 'Staking', icon: '💎' },
    { href: '/swap', label: 'Swap', icon: '🔄' },
    { href: '/bridge', label: 'Bridge', icon: '🌉' },
    { href: '/admin', label: 'Admin', icon: '⚙️' }
  ];

  const isActiveLink = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const handleWalletClick = () => {
    setShowWalletPanel(true);
    onOpenWallet?.();
  };

  const handleAuthClick = (isLogin: boolean) => {
    onOpenAuth?.(isLogin);
    setShowMobileMenu(false);
  };

  return (
    <>
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-lg border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Vindex Chain</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActiveLink(item.href)
                      ? 'bg-red-100 text-red-700 shadow-sm'
                      : 'text-gray-600 hover:text-red-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Right Side - Auth/User Area */}
            <div className="flex items-center space-x-3">
              
              {/* Desktop Auth/User */}
              <div className="hidden md:flex items-center space-x-3">
                {isAuthenticated ? (
                  <div className="flex items-center space-x-3">
                    {/* Welcome Message */}
                    <div className="text-sm">
                      <span className="text-gray-600">Welcome, </span>
                      <span className="font-semibold text-gray-900">
                        {user?.firstName || user?.email?.split('@')[0] || 'User'}
                      </span>
                    </div>

                    {/* Wallet Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleWalletClick}
                      className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 px-3 py-2 rounded-lg transition-all duration-200 border hover:border-red-200"
                    >
                      <WalletIcon className="w-4 h-4" />
                      <span className="font-medium">
                        {wallets.length} {wallets.length === 1 ? 'Wallet' : 'Wallets'}
                      </span>
                    </motion.button>

                    {/* Logout Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={logout}
                      className="text-sm text-gray-600 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Logout
                    </motion.button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    {/* Sign In Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAuthClick(true)}
                      className="text-sm text-gray-600 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Sign In
                    </motion.button>

                    {/* Get Started Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAuthClick(false)}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                    >
                      Get Started
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.button>
            </div>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-200 py-4"
            >
              <div className="flex flex-col space-y-2">
                
                {/* Mobile Navigation Items */}
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActiveLink(item.href)
                        ? 'bg-red-100 text-red-700'
                        : 'text-gray-600 hover:text-red-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}

                {/* Mobile Auth Section */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  {isAuthenticated ? (
                    <div className="space-y-2">
                      {/* User Info */}
                      <div className="px-4 py-2">
                        <p className="text-sm text-gray-600">Welcome,</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {user?.firstName || user?.email?.split('@')[0] || 'User'}
                        </p>
                      </div>

                      {/* Wallet Button */}
                      <button
                        onClick={() => {
                          handleWalletClick();
                          setShowMobileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <WalletIcon className="w-5 h-5" />
                        <span>{wallets.length} {wallets.length === 1 ? 'Wallet' : 'Wallets'}</span>
                      </button>

                      {/* Logout Button */}
                      <button
                        onClick={() => {
                          logout();
                          setShowMobileMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Sign In Button */}
                      <button
                        onClick={() => handleAuthClick(true)}
                        className="w-full text-left px-4 py-3 text-sm text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        Sign In
                      </button>

                      {/* Get Started Button */}
                      <button
                        onClick={() => handleAuthClick(false)}
                        className="w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                      >
                        Get Started
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Wallet Panel */}
      <WalletPanel
        isOpen={showWalletPanel}
        onClose={() => setShowWalletPanel(false)}
      />
    </>
  );
}
