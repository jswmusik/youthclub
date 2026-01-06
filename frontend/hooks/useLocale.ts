// hooks/useLocale.ts
/**
 * Hook to get the current locale for API calls.
 * Uses the locale from next-intl or falls back to the cookie value.
 */
import { useLocale as useNextIntlLocale } from 'next-intl';
import Cookies from 'js-cookie';
import { defaultLocale, type Locale } from '@/i18n/config';

const LOCALE_COOKIE = 'NEXT_LOCALE';

/**
 * Get the current locale from next-intl
 */
export function useLocale(): Locale {
  try {
    // This works in components wrapped with NextIntlClientProvider
    const locale = useNextIntlLocale();
    return locale as Locale;
  } catch {
    // Fallback: read from cookie or use default
    const cookieLocale = Cookies.get(LOCALE_COOKIE);
    return (cookieLocale as Locale) || defaultLocale;
  }
}

/**
 * Get the current locale from cookie (for use outside of React components)
 */
export function getLocaleFromCookie(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }
  const cookieLocale = Cookies.get(LOCALE_COOKIE);
  return (cookieLocale as Locale) || defaultLocale;
}

/**
 * Set the locale cookie
 */
export function setLocaleCookie(locale: Locale): void {
  Cookies.set(LOCALE_COOKIE, locale, { path: '/', expires: 30 }); // 30 days
}

export default useLocale;

