import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminContextType {
  adminKey: string | null;
  isAdmin: boolean;
  login: (key: string) => boolean;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminKey, setAdminKey] = useState<string | null>(() => {
    return localStorage.getItem('bbs_admin_key');
  });

  const isAdmin = Boolean(adminKey);

  const login = (key: string) => {
    if (!key) return false;
    localStorage.setItem('bbs_admin_key', key);
    setAdminKey(key);
    return true;
  };

  const logout = () => {
    localStorage.removeItem('bbs_admin_key');
    setAdminKey(null);
  };

  return (
    <AdminContext.Provider value={{ adminKey, isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within an AdminProvider');
  return context;
};
