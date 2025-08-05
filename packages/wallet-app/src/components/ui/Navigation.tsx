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
    { href: '/', label: 'Home' },
    { href: '/explorer', label: 'Explorer' },
    { href: '/staking', label: 'Staking' },
    { href: '/swap', label: 'Swap' },
    { href: '/bridge', label: 'Bridge' },
    { href: '/governance', label: 'Governance' },
    { href: '/validators', label: 'Validators', validatorOnly: true },
    { href: '/admin', label: 'Admin', adminOnly: true }
  ];

  const isActiveLink = (href: string) => {
    if (!pathname) return false;
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
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-white font-extrabold text-2xl tracking-tight">V</span>
              </div>
              <span className="text-2xl font-extrabold text-gray-900 tracking-tight group-hover:text-red-600 transition-colors">Vindex Chain</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {navigationItems.map((item) => {
                // Verificar roles específicos
                if (item.adminOnly && user?.email !== 'admin@vindex.com') return null;
                if (item.validatorOnly && !user?.roles?.includes('validator') && user?.email !== 'admin@vindex.com') return null;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-5 py-2 rounded-xl text-base font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm border border-transparent ${
                      isActiveLink(item.href)
                        ? 'bg-red-600 text-white shadow-lg scale-105 border-red-600'
                        : 'bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 hover:scale-105'
                    }`}
                    style={{ boxShadow: isActiveLink(item.href) ? '0 2px 12px rgba(220,38,38,0.12)' : undefined }}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
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
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleWalletClick}
                      className="flex items-center gap-2 text-base font-semibold bg-gradient-to-r from-red-500 to-red-700 text-white px-5 py-2 rounded-xl shadow-lg hover:from-red-600 hover:to-red-800 transition-all duration-200 border border-red-600 hover:scale-105"
                    >
                      <WalletIcon className="w-5 h-5" />
                      <span>
                        {wallets.length} {wallets.length === 1 ? 'Wallet' : 'Wallets'}
                      </span>
                    </motion.button>

                    {/* Logout Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={logout}
                      className="text-base font-semibold text-gray-600 hover:text-red-600 px-5 py-2 rounded-xl hover:bg-red-50 transition-colors border border-transparent hover:border-red-600"
                    >
                      Logout
                    </motion.button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    {/* Sign In Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAuthClick(true)}
                      className="text-base font-semibold text-gray-600 hover:text-red-600 px-5 py-2 rounded-xl hover:bg-red-50 transition-colors border border-transparent hover:border-red-600"
                    >
                      Sign In
                    </motion.button>

                    {/* Get Started Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAuthClick(false)}
                      className="bg-gradient-to-r from-red-500 to-red-700 text-white px-6 py-2 rounded-xl hover:from-red-600 hover:to-red-800 transition-colors font-semibold text-base shadow-lg border border-red-600 hover:scale-105"
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
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActiveLink(item.href)
                        ? 'bg-red-100 text-red-700'
                        : 'text-gray-600 hover:text-red-600 hover:bg-gray-50'
                    }`}
                  >
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
