'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';
import { useLocale } from './LocaleContext';
import { defaultLocale, type Locale } from '../i18n/config';

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

interface IntlProviderWrapperProps {
  children: ReactNode;
}

export function IntlProviderWrapper({ children }: IntlProviderWrapperProps) {
  const { locale } = useLocale();
  const [messages, setMessages] = useState(messagesMap[defaultLocale]);

  useEffect(() => {
    // Get messages for the current locale, fallback to English
    const localeMessages = messagesMap[locale] || messagesMap[defaultLocale];
    setMessages(localeMessages);
  }, [locale]);

  return (
    <NextIntlClientProvider 
      locale={locale} 
      messages={messages}
      timeZone="Europe/Stockholm"
    >
      {children}
    </NextIntlClientProvider>
  );
}

