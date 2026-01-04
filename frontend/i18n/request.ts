import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, type Locale } from './config';

const LOCALE_COOKIE = 'NEXT_LOCALE';

export default getRequestConfig(async () => {
  // Read locale from cookie (set by middleware or user preference)
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  
  // Validate the cookie value is a valid locale
  const locale: Locale = cookieLocale && locales.includes(cookieLocale as Locale)
    ? (cookieLocale as Locale)
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});

