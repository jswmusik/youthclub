// Supported locales for the application
export const locales = ['en', 'sv', 'da', 'nb', 'fi', 'ar', 'so', 'prs'] as const;

export type Locale = (typeof locales)[number];

// Default locale (English)
export const defaultLocale: Locale = 'en';

// RTL languages
export const rtlLocales: Locale[] = ['ar', 'prs'];

// Check if a locale is RTL
export function isRtlLocale(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

// Language display names (in their native language)
export const localeNames: Record<Locale, string> = {
  en: 'English',
  sv: 'Svenska',
  da: 'Dansk',
  nb: 'Norsk',
  fi: 'Suomi',
  ar: 'العربية',
  so: 'Soomaali',
  prs: 'دری',
};

// Language display names with flags for UI
export const localeOptions: Array<{ code: Locale; name: string; flag: string }> = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'nb', name: 'Norsk', flag: '🇳🇴' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'so', name: 'Soomaali', flag: '🇸🇴' },
  { code: 'prs', name: 'دری', flag: '🇦🇫' },
];

