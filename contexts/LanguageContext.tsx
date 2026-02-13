import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback } from 'react';
import { Language, t as translate } from '@/constants/i18n';

const LANGUAGE_STORAGE_KEY = 'fintech_language';

export const [LanguageProvider, useLanguage] = createContextHook(() => {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && ['en', 'ru', 'ar', 'uz'].includes(stored)) {
        setLanguageState(stored as Language);
      }
    } catch (error) {
      console.log('Error loading language:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      console.log('Language saved:', lang);
    } catch (error) {
      console.log('Error saving language:', error);
    }
  }, []);

  const t = useCallback((key: string): string => {
    return translate(key, language);
  }, [language]);

  return {
    language,
    setLanguage,
    t,
    isLoaded,
  };
});
