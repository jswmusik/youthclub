'use client';

import { useEffect, ReactNode } from 'react';
import { useLocale } from '../context/LocaleContext';

interface RootLayoutClientProps {
  children: ReactNode;
}

export function RootLayoutClient({ children }: RootLayoutClientProps) {
  const { locale, isRtl } = useLocale();

  // Update document direction and lang attribute based on locale
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [locale, isRtl]);

  return <>{children}</>;
}

