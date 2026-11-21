import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { customerAuthApi, CustomerProfile } from '../services/customerAuthApi';

interface CustomerAuthContextType {
  customer: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; customer?: CustomerProfile; error?: string }>;
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    termsAccepted: boolean;
    marketingOptIn?: boolean;
  }) => Promise<{ success: boolean; customer?: CustomerProfile; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (key: string, login: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  refreshCustomer: () => Promise<void>;
  
  // Auth modal management
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'register' | 'forgot';
  setAuthModalTab: (tab: 'login' | 'register' | 'forgot') => void;
  openAuthModal: (tab?: 'login' | 'register' | 'forgot') => void;

  // Wishlist
  wishlist: Array<string | number>;
  toggleWishlist: (productId: string | number) => void;
  isInWishlist: (productId: string | number) => boolean;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Customer Wishlist (stored locally and synced with customer meta when logged in)
  const [wishlist, setWishlist] = useState<Array<string | number>>(() => {
    try {
      const stored = localStorage.getItem('irepair_customer_wishlist');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const refreshCustomer = useCallback(async () => {
    try {
      const data = await customerAuthApi.getMe();
      if (data && data.authenticated && data.customer) {
        setCustomer(data.customer);
        setIsAuthenticated(true);
      } else {
        setCustomer(null);
        setIsAuthenticated(false);
      }
    } catch {
      setCustomer(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCustomer();
  }, [refreshCustomer]);

  // Wishlist persistence
  useEffect(() => {
    try {
      localStorage.setItem('irepair_customer_wishlist', JSON.stringify(wishlist));
    } catch {
      // ignore storage errors
    }
  }, [wishlist]);

  const toggleWishlist = useCallback((productId: string | number) => {
    setWishlist((prev) => {
      const exists = prev.some((id) => String(id) === String(productId));
      if (exists) {
        return prev.filter((id) => String(id) !== String(productId));
      } else {
        return [...prev, productId];
      }
    });
  }, []);

  const isInWishlist = useCallback((productId: string | number) => {
    return wishlist.some((id) => String(id) === String(productId));
  }, [wishlist]);

  const login = async (email: string, password: string, rememberMe: boolean = true) => {
    setIsLoading(true);
    try {
      const res = await customerAuthApi.login({ email, password, rememberMe });
      if (res.customer) {
        setCustomer(res.customer);
        setIsAuthenticated(true);
        setAuthModalOpen(false);
        return { success: true, customer: res.customer };
      }
      return { success: false, error: 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Invalid credentials' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    termsAccepted: boolean;
    marketingOptIn?: boolean;
  }) => {
    setIsLoading(true);
    try {
      const res = await customerAuthApi.register(data);
      if (res.customer) {
        setCustomer(res.customer);
        setIsAuthenticated(true);
        setAuthModalOpen(false);
        return { success: true, customer: res.customer };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await customerAuthApi.logout();
      setCustomer(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout error:', err);
      setCustomer(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    const res = await customerAuthApi.forgotPassword(email);
    return { success: true, message: res.message || 'Password reset email sent if account exists.' };
  };

  const resetPassword = async (key: string, loginUser: string, newPassword: string) => {
    const res = await customerAuthApi.resetPassword({ key, login: loginUser, newPassword });
    return { success: true, message: res.message || 'Password has been reset successfully.' };
  };

  const openAuthModal = (tab: 'login' | 'register' | 'forgot' = 'login') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        refreshCustomer,
        authModalOpen,
        setAuthModalOpen,
        authModalTab,
        setAuthModalTab,
        openAuthModal,
        wishlist,
        toggleWishlist,
        isInWishlist,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = (): CustomerAuthContextType => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
