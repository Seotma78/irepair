import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'editor';
  must_change_password: boolean;
}

interface AdminContextType {
  adminUser: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
  updateUser: (user: AdminUser) => void;
  refreshUser: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('admin_token');
    if (!savedToken) {
      setAdminUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'same-origin',
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      });

      if (res.ok) {
        const raw = await res.text();
        const data = raw ? JSON.parse(raw) : null;
        if (data?.user) {
          setAdminUser(data.user);
          setToken(savedToken);
        } else {
          localStorage.removeItem('admin_token');
          setAdminUser(null);
          setToken(null);
        }
      } else {
        localStorage.removeItem('admin_token');
        setAdminUser(null);
        setToken(null);
      }
    } catch (e) {
      console.error('Failed to verify admin auth:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (newToken: string, user: AdminUser) => {
    localStorage.setItem('admin_token', newToken);
    setToken(newToken);
    setAdminUser(user);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (e) {}
    localStorage.removeItem('admin_token');
    setToken(null);
    setAdminUser(null);
  };

  const updateUser = (user: AdminUser) => {
    setAdminUser(user);
  };

  return (
    <AdminContext.Provider
      value={{
        adminUser,
        token,
        loading,
        login,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
