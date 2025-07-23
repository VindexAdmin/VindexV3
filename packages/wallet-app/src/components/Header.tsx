'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, Menu, X, Shield, Search, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface HeaderProps {
  isConnected: boolean;
  address?: string;
  balance?: number;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function Header({ isConnected, address, balance, onConnect, onDisconnect }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatBalance = (bal: number) => {
    if (bal >= 1000000) {
      return (bal / 1000000).toFixed(2) + 'M';
    } else if (bal >= 1000) {
      return (bal / 1000).toFixed(2) + 'K';
    } else {
      return bal.toFixed(2);
    }
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-lg shadow-lg border-b border-vindex-gray-200' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className="w-10 h-10 bg-vindex-gradient rounded-lg flex items-center justify-center shadow-vindex group-hover:shadow-vindex-lg transition-all duration-200">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-vindex-red rounded-full animate-pulse"></div>
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gradient-vindex">Vindex</h1>
              <p className="text-xs text-vindex-gray-500 -mt-1">Chain Wallet</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link 
              href="/wallet" 
              className="text-vindex-gray-700 hover:text-vindex-red transition-colors duration-200 font-medium"
            >
              Wallet
            </Link>
            <Link 
              href="/staking" 
              className="text-vindex-gray-700 hover:text-vindex-red transition-colors duration-200 font-medium"
            >
              Staking
            </Link>
            <Link 
              href="/swap" 
              className="text-vindex-gray-700 hover:text-vindex-red transition-colors duration-200 font-medium"
            >
              Swap
            </Link>
            <Link 
              href="/explorer" 
              className="text-vindex-gray-700 hover:text-vindex-red transition-colors duration-200 font-medium"
            >
              Explorer
            </Link>
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <input
                type="text"
                placeholder="Search transactions, blocks..."
                className="w-64 pl-10 pr-4 py-2 border border-vindex-gray-300 rounded-lg focus:ring-2 focus:ring-vindex-red focus:border-transparent bg-white text-sm"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-vindex-gray-400" />
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 text-vindex-gray-600 hover:text-vindex-red transition-colors duration-200 relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-vindex-red rounded-full text-xs"></span>
            </motion.button>

            {/* Wallet Status */}
            {isConnected ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-vindex-gray-900">
                    {balance !== undefined ? `${formatBalance(balance)} VDX` : '0.00 VDX'}
                  </p>
                  <p className="text-xs text-vindex-gray-500">
                    {address ? formatAddress(address) : ''}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onDisconnect}
                  className="flex items-center space-x-2 bg-vindex-red text-white px-4 py-2 rounded-lg hover:bg-vindex-red-dark transition-all duration-200 shadow-vindex"
                >
                  <Wallet className="w-4 h-4" />
                  <span className="hidden sm:inline">Connected</span>
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onConnect}
                className="btn-vindex flex items-center space-x-2"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </motion.button>
            )}

            {/* Mobile Menu Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-vindex-gray-600 hover:text-vindex-red transition-colors duration-200"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-vindex-gray-200 shadow-lg"
          >
            <div className="px-4 py-6 space-y-4">
              {/* Mobile Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border border-vindex-gray-300 rounded-lg focus:ring-2 focus:ring-vindex-red focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-vindex-gray-400" />
              </div>

              {/* Mobile Navigation */}
              <nav className="space-y-3">
                <Link 
                  href="/wallet"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-vindex-gray-700 hover:text-vindex-red transition-colors duration-200 font-medium py-2"
                >
                  Wallet
                </Link>
                <Link 
                  href="/staking"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-vindex-gray-700 hover:text-vindex-red transition-colors duration-200 font-medium py-2"
                >
                  Staking
                </Link>
                <Link 
                  href="/swap"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-vindex-gray-700 hover:text-vindex-red transition-colors duration-200 font-medium py-2"
                >
                  Swap
                </Link>
                <Link 
                  href="/explorer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-vindex-gray-700 hover:text-vindex-red transition-colors duration-200 font-medium py-2"
                >
                  Explorer
                </Link>
              </nav>

              {/* Mobile Wallet Info */}
              {isConnected && address && (
                <div className="pt-4 border-t border-vindex-gray-200">
                  <div className="bg-vindex-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-vindex-gray-900">
                      Balance: {balance !== undefined ? `${formatBalance(balance)} VDX` : '0.00 VDX'}
                    </p>
                    <p className="text-xs text-vindex-gray-500 mt-1">
                      {formatAddress(address)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
