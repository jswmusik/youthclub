import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, locales, type Locale } from './config';

export default getRequestConfig(async () => {
  // For now, we use the default locale
  // Later this will be enhanced to read from user preferences or cookies
  const locale: Locale = defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});

