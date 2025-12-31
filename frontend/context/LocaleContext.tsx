'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import Cookies from 'js-cookie';
import { useAuth } from './AuthContext';
import { locales, defaultLocale, isRtlLocale, type Locale } from '../i18n/config';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isRtl: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

function isValidLocale(locale: string | undefined | null): locale is Locale {
  return !!locale && locales.includes(locale as Locale);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const previousLocaleRef = useRef<Locale | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize locale from various sources
  useEffect(() => {
    // Priority: 1. User preference (from API), 2. Cookie, 3. Browser, 4. Default
    let detectedLocale: Locale = defaultLocale;

    // Check user's preferred language from their profile
    if (user && isValidLocale(user.preferred_language)) {
      detectedLocale = user.preferred_language;
    } 
    // Check cookie
    else {
      const cookieLocale = Cookies.get(LOCALE_COOKIE_NAME);
      if (isValidLocale(cookieLocale)) {
        detectedLocale = cookieLocale;
      }
      // Check browser language
      else if (typeof navigator !== 'undefined') {
        const browserLang = navigator.language.split('-')[0];
        if (isValidLocale(browserLang)) {
          detectedLocale = browserLang;
        }
      }
    }

    setLocaleState(detectedLocale);
    // Save to cookie for server-side access
    Cookies.set(LOCALE_COOKIE_NAME, detectedLocale, { expires: 365 });
    
    // Mark as initialized after first load
    if (!isInitializedRef.current) {
      previousLocaleRef.current = detectedLocale;
      isInitializedRef.current = true;
    }
  }, [user]);

  // Update locale when user changes their preference and reload to apply translations
  useEffect(() => {
    if (user && isValidLocale(user.preferred_language)) {
      const newLocale = user.preferred_language;
      
      // Only reload if locale actually changed after initialization
      if (isInitializedRef.current && previousLocaleRef.current && previousLocaleRef.current !== newLocale) {
        Cookies.set(LOCALE_COOKIE_NAME, newLocale, { expires: 365 });
        // Reload to apply new translations
        window.location.reload();
        return;
      }
      
      setLocaleState(newLocale);
      Cookies.set(LOCALE_COOKIE_NAME, newLocale, { expires: 365 });
      previousLocaleRef.current = newLocale;
    }
  }, [user?.preferred_language]);

  const setLocale = useCallback((newLocale: Locale) => {
    if (isValidLocale(newLocale)) {
      setLocaleState(newLocale);
      Cookies.set(LOCALE_COOKIE_NAME, newLocale, { expires: 365 });
      // Reload to apply new translations
      // In production, you might want to use router.refresh() or a more sophisticated approach
      window.location.reload();
    }
  }, []);

  const isRtl = isRtlLocale(locale);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, isRtl }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

