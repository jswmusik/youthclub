import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale, type Locale } from './i18n/config';

const LOCALE_COOKIE = 'NEXT_LOCALE';

// Map countries to their primary language
const countryToLocale: Record<string, Locale> = {
  'DK': 'da', // Denmark -> Danish
  'NO': 'nb', // Norway -> Norwegian Bokmål
  'SE': 'sv', // Sweden -> Swedish
  'FI': 'fi', // Finland -> Finnish (or Swedish for Swedish-speaking Finns)
  'GB': 'en', // United Kingdom -> English
  'US': 'en', // United States -> English
  'AU': 'en', // Australia -> English
  'SA': 'ar', // Saudi Arabia -> Arabic
  'AE': 'ar', // UAE -> Arabic
  'SO': 'so', // Somalia -> Somali
  'AF': 'prs', // Afghanistan -> Dari
};

/**
 * Parse Accept-Language header and find the best matching locale
 * Example header: "da-DK,da;q=0.9,en;q=0.8,nb;q=0.7"
 */
function getLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null;

  // Parse Accept-Language header
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, priority = 'q=1'] = lang.trim().split(';');
      return {
        code: code.split('-')[0].toLowerCase(), // Get base language (da from da-DK)
        priority: parseFloat(priority.replace('q=', '')) || 1
      };
    })
    .sort((a, b) => b.priority - a.priority);

  // Find first matching locale
  for (const lang of languages) {
    if (locales.includes(lang.code as Locale)) {
      return lang.code as Locale;
    }
  }

  return null;
}

/**
 * Get locale from geo-IP country (Vercel provides this header)
 */
function getLocaleFromCountry(country: string | null): Locale | null {
  if (!country) return null;
  return countryToLocale[country.toUpperCase()] || null;
}

export function middleware(request: NextRequest) {
  // Skip middleware for static files, API routes, and Next.js internals
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next();
  }

  // Check for existing cookie (user has already chosen a language)
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value as Locale | undefined;
  
  if (cookieLocale && locales.includes(cookieLocale)) {
    // User has a valid preference, continue without changes
    return NextResponse.next();
  }

  // No cookie - detect locale from various sources
  let detectedLocale: Locale = defaultLocale;

  // Priority 1: Geo-IP based detection (Vercel/Cloudflare headers)
  const country = request.headers.get('x-vercel-ip-country') || 
                  request.headers.get('cf-ipcountry');
  const geoLocale = getLocaleFromCountry(country);
  
  if (geoLocale) {
    detectedLocale = geoLocale;
  } else {
    // Priority 2: Accept-Language header (browser preference)
    const acceptLanguage = request.headers.get('accept-language');
    const browserLocale = getLocaleFromAcceptLanguage(acceptLanguage);
    
    if (browserLocale) {
      detectedLocale = browserLocale;
    }
  }

  // Set the cookie for future requests
  const response = NextResponse.next();
  response.cookies.set(LOCALE_COOKIE, detectedLocale, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
    sameSite: 'lax',
    // Secure in production
    secure: process.env.NODE_ENV === 'production'
  });

  return response;
}

export const config = {
  // Match all paths except static files and API routes
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

