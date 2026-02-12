import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback } from 'react';
import Colors, { ThemeColors } from '@/constants/colors';

const THEME_STORAGE_KEY = 'fintech_theme_mode';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [isDark, setIsDark] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored !== null) {
        setIsDark(stored === 'dark');
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const toggleTheme = useCallback(async () => {
    const newValue = !isDark;
    setIsDark(newValue);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newValue ? 'dark' : 'light');
      console.log('Theme saved:', newValue ? 'dark' : 'light');
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  }, [isDark]);

  const setDarkMode = useCallback(async (value: boolean) => {
    setIsDark(value);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, value ? 'dark' : 'light');
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  }, []);

  const colors: ThemeColors = isDark ? Colors.dark : Colors.light;

  return {
    isDark,
    isLoaded,
    colors,
    toggleTheme,
    setDarkMode,
  };
});
