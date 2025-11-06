import React, { useState, useEffect } from 'react';

const ThemeSwitcher = () => {
  const themes = [
    { id: 'default', name: 'Dark', color: '#242424' },
    { id: 'light', name: 'Light', color: '#f8fafc' },
    { id: 'high-contrast', name: 'High Contrast', color: '#000000' },
    { id: 'blue', name: 'Blue', color: '#0f172a' },
    { id: 'purple', name: 'Purple', color: '#1a103d' },
    { id: 'green', name: 'Green', color: '#0f172a' },
    { id: 'cyberpunk', name: 'Cyberpunk', color: '#0a0a0a' },
    { id: 'warm', name: 'Warm', color: '#2d1810' },
    { id: 'ocean', name: 'Ocean', color: '#0c4a6e' },
    { id: 'nordic', name: 'Nordic', color: '#2e3440' },
    { id: 'candy', name: 'Candy', color: '#fff8dc' },
    { id: 'gruvbox', name: 'Gruvbox', color: '#282828' },
    { id: 'neon-dreams', name: 'Neon Dreams', color: '#000000' }
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