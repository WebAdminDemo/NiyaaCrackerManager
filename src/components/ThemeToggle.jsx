import React, { memo, useCallback } from 'react';
import { Button } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = memo(() => {
    const { darkMode, toggleTheme } = useTheme();

    // toggleTheme is already stable if the context provider memoizes it,
    // but we wrap it just in case.
    const handleToggle = useCallback(() => {
        toggleTheme();
    }, [toggleTheme]);

    return (
        <Button
            variant={darkMode ? 'light' : 'dark'}
            size="sm"
            onClick={handleToggle}
            className="d-flex align-items-center gap-1 rounded-pill px-3"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <i className={`bi ${darkMode ? 'bi-sun-fill' : 'bi-moon-fill'}`}></i>
            <span className="d-none d-sm-inline">{darkMode ? 'Light' : 'Dark'}</span>
        </Button>
    );
});

ThemeToggle.displayName = 'ThemeToggle';

export default ThemeToggle;