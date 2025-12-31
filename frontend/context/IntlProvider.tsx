'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useLocale } from './LocaleContext';
import { defaultLocale, locales, type Locale } from '../i18n/config';

// Import all message files
import enMessages from '../messages/en.json';
import svMessages from '../messages/sv.json';
import daMessages from '../messages/da.json';
import nbMessages from '../messages/nb.json';
import fiMessages from '../messages/fi.json';
import arMessages from '../messages/ar.json';
import soMessages from '../messages/so.json';
import prsMessages from '../messages/prs.json';

// Map of all available messages
const messagesMap: Record<Locale, typeof enMessages> = {
  en: enMessages,
  sv: svMessages,
  da: daMessages,
  nb: nbMessages,
  fi: fiMessages,
  ar: arMessages,
  so: soMessages,
  prs: prsMessages,
};

const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

function isValidLocale(locale: string | undefined | null): locale is Locale {
  return !!locale && locales.includes(locale as Locale);
}

// Helper to get initial locale from cookie or browser
function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  
  const cookieLocale = Cookies.get(LOCALE_COOKIE_NAME);
  if (isValidLocale(cookieLocale)) {
    return cookieLocale;
  }
  
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language.split('-')[0];
    if (isValidLocale(browserLang)) {
      return browserLang;
    }
  }
  
  return defaultLocale;
}

interface IntlProviderWrapperProps {
  children: ReactNode;
}

export function IntlProviderWrapper({ children }: IntlProviderWrapperProps) {
  const { locale } = useLocale();
  // Initialize with locale from cookie/browser to avoid English flash
  const initialLocale = getInitialLocale();
  const [currentLocale, setCurrentLocale] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState(() => {
    return messagesMap[initialLocale] || messagesMap[defaultLocale];
  });

  useEffect(() => {
    // Only sync if locale from useLocale() is different from defaultLocale
    // This prevents overwriting Swedish with English during LocaleProvider initialization
    // If locale is still defaultLocale, LocaleProvider hasn't initialized yet, so keep using initial locale
    if (locale !== defaultLocale || initialLocale === defaultLocale) {
      const localeMessages = messagesMap[locale] || messagesMap[defaultLocale];
      setCurrentLocale(locale);
      setMessages(localeMessages);
    }
  }, [locale, initialLocale]);

  return (
    <NextIntlClientProvider 
      locale={currentLocale} 
      messages={messages}
      timeZone="Europe/Stockholm"
    >
      {children}
    </NextIntlClientProvider>
  );
}

