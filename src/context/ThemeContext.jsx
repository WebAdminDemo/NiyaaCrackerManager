// ============================================================
// FILE: src/context/ThemeContext.js
// ============================================================
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

const ThemeContext = createContext({ darkMode: false, toggleTheme: () => {} });
const THEME_KEY = 'niyaa_theme';

export const ThemeProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved) return saved === 'dark';
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-bs-theme', darkMode ? 'dark' : 'light');
        localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
        // Also update the body class for custom CSS
        document.body.style.background = darkMode ? '#0f0c1a' : '#f8f5ff';
        document.body.style.color = darkMode ? '#d4c4e8' : '#2d1b4e';
    }, [darkMode]);

    const value = useMemo(
        () => ({
            darkMode,
            toggleTheme: () => setDarkMode((d) => !d),
        }),
        [darkMode]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};