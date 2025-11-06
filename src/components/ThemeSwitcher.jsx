import React, { useState, useEffect } from 'react';

const ThemeSwitcher = () => {
  const themes = [
    { id: 'default', name: 'Dark', color: '#242424' },
    { id: 'light', name: 'Light', color: '#f8fafc' },
    { id: 'high-contrast', name: 'High Contrast', color: '#000000' },
    { id: 'blue', name: 'Blue', color: '#0f172a' },
    { id: 'purple', name: 'Purple', color: '#1a103d' },
    { id: 'green', name: 'Green', color: '#0f172a' }
  ];

  const [currentTheme, setCurrentTheme] = useState('default');

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('aframe-inspector-theme') || 'default';
    setCurrentTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleThemeChange = (themeId) => {
    setCurrentTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('aframe-inspector-theme', themeId);
  };

  return (
    <div className="theme-switcher">
      <select
        value={currentTheme}
        onChange={(e) => handleThemeChange(e.target.value)}
        className="theme-select"
      >
        {themes.map(theme => (
          <option key={theme.id} value={theme.id}>
            {theme.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ThemeSwitcher;