import React, { useEffect } from 'react';
import { useAdmin } from './context/AdminContext';

interface AdminGateProps {
  children: React.ReactNode;
  onRequireLogin: () => void;
}

export const AdminGate: React.FC<AdminGateProps> = ({ children, onRequireLogin }) => {
  const { adminUser, loading } = useAdmin();

  useEffect(() => {
    if (!loading && !adminUser) {
      onRequireLogin();
    }
  }, [loading, adminUser, onRequireLogin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="w-8 h-8 rounded-full border-2 border-[#DF0C88] border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-slate-400">Verifying secure admin session...</span>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return null;
  }

  return <>{children}</>;
};
