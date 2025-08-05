'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import VindexAPI from './vindex-api';

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean;
  roles?: string[];
}

interface WalletData {
  mnemonic: string;
  address: string;
  privateKey: string;
}

interface Wallet {
  id: string;
  address: string;
  name: string;
  balance: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  wallets: Wallet[];
  isAuthenticated: boolean;
  isLoading: boolean;
  api: VindexAPI;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string, walletData?: WalletData) => Promise<void>;
  logout: () => Promise<void>;
  createWallet: (name?: string) => Promise<Wallet>;
  refreshProfile: () => Promise<void>;
  refreshWallets: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [api] = useState(() => new VindexAPI(''));

  const refreshProfile = async () => {
    try {
      const response = await api.getProfile();
      if (response.success) {
        setUser(response.data.user);
        setWallets(response.data.wallets || []);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setUser(null);
      setWallets([]);
    }
  };

  const refreshWallets = async () => {
    try {
      const response = await api.getWallets();
      if (response.success) {
        setWallets(response.data.wallets || []);
      }
    } catch (error) {
      console.error('Failed to fetch wallets:', error);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.login(email, password);
      if (response.success) {
        setUser(response.data.user);
        setWallets(response.data.wallets || []);
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string, walletData?: WalletData) => {
    setIsLoading(true);
    try {
      const response = await api.register(email, password, firstName, lastName);
      if (response.success) {
        setUser(response.data.user);
        setWallets(response.data.wallets || []);
        
        // Verifica si el usuario fue creado correctamente
        if (!response.data.user || !response.data.user.id) {
          throw new Error('Failed to create user account');
        }
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setWallets([]);
      setIsLoading(false);
    }
  };

  const createWallet = async (name?: string): Promise<Wallet> => {
    try {
      const response = await api.createWallet(name);
      if (response.success) {
        const newWallet = response.data.wallet;
        setWallets(prev => [...prev, newWallet]);
        return newWallet;
      }
      throw new Error('Failed to create wallet');
    } catch (error) {
      throw error;
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      if (api.isAuthenticated()) {
        try {
          await refreshProfile();
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          api.clearToken();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, [api]);

  const value: AuthContextType = {
    user,
    wallets,
    isAuthenticated: !!user,
    isLoading,
    api,
    login,
    register,
    logout,
    createWallet,
    refreshProfile,
    refreshWallets,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
