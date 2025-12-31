import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { LuSun, LuMoon } from 'react-icons/lu';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <LuMoon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      ) : (
        <LuSun className="w-5 h-5 text-yellow-400" />
      )}
    </button>
  );
};

export default ThemeToggle;