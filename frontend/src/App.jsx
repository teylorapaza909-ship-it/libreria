import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeContext } from './context/ThemeContext';
import AppRouter from './router/AppRouter';
import { Toaster } from 'react-hot-toast';

const routerBasename = window.location.pathname.startsWith('/utiles') ? '/utiles' : '/';

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem('pos_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pos_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename={routerBasename}>
          <Toaster 
            position="top-right" 
            toastOptions={{
              style: {
                background: 'var(--surface)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-lg)',
              }
            }} 
          />
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
