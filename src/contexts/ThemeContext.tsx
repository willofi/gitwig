import React, { createContext, useContext } from 'react';

export const ThemeContext = createContext<{ isDark: boolean }>({ isDark: true });
export const useTheme = () => useContext(ThemeContext);
