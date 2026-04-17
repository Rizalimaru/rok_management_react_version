import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage on initial load
    const savedTheme = localStorage.getItem('appTheme');
    return savedTheme === 'dark';
  });

  useEffect(() => {
    // Save to localStorage whenever it changes
    localStorage.setItem('appTheme', isDarkMode ? 'dark' : 'light');
    
    // Optional: add a class to body for global CSS overrides if needed
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
