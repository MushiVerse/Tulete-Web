import React, { createContext, useContext, useEffect, useState } from 'react';

type AdminTheme = 'dark' | 'light';

interface AdminThemeContextType {
  theme: AdminTheme;
  toggleTheme: () => void;
  setTheme: (theme: AdminTheme) => void;
}

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

export const AdminThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AdminTheme>(() => {
    try {
      const saved = localStorage.getItem('tulete_admin_theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  const setTheme = (newTheme: AdminTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('tulete_admin_theme', newTheme);
    } catch (e) {}
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <div className={theme === 'dark' ? 'dark-theme' : 'light-theme'}>
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
};

export const useAdminTheme = () => {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error('useAdminTheme must be used within an AdminThemeProvider');
  }
  return context;
};
