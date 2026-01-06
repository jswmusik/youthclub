// frontend/app/(public)/page.tsx
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import HeroSection from './components/HeroSection';
import KPITicker from './components/KPITicker';
import EventsSection from './components/EventsSection';
import PostsSection from './components/PostsSection';
import TestimonialsSection from './components/TestimonialsSection';
import CustomersSection from './components/CustomersSection';
import CTASection from './components/CTASection';
import { defaultLocale, type Locale } from '@/i18n/config';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
const LOCALE_COOKIE = 'NEXT_LOCALE';

// Get locale from cookies
async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  return (cookieLocale as Locale) || defaultLocale;
}

// Fetch SEO settings from backend with language support
async function getSeoSettings(lang?: string) {
  try {
    const params = lang ? `?lang=${lang}` : '';
    const res = await fetch(`${API_URL}/marketing/public/seo-settings/${params}`, {
      next: { revalidate: 60 }, // Revalidate every minute
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error('Failed to fetch SEO settings:', error);
    return null;
  }
}

// Map locale to Open Graph locale format
const localeToOgLocale: Record<string, string> = {
  'sv': 'sv_SE',
  'en': 'en_US',
  'da': 'da_DK',
  'nb': 'nb_NO',
  'fi': 'fi_FI',
  'ar': 'ar_SA',
  'so': 'so_SO',
  'prs': 'fa_AF',
};

// Generate dynamic metadata with language support
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const settings = await getSeoSettings(locale);

  const title = settings?.page_title || 'Ungdomsappen - Hitta aktiviteter nära dig';
  const description = settings?.meta_description || 
    'Upptäck aktiviteter, evenemang och fritidsgårdar nära dig. Ungdomsappen samlar allt för unga på ett ställe.';
  const keywords = settings?.keywords || 'ungdomsappen, fritidsgård, aktiviteter, ungdom, evenemang';

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: settings?.og_title || title,
      description: settings?.og_description || description,
      images: settings?.og_image ? [settings.og_image] : [],
      type: 'website',
      locale: localeToOgLocale[locale] || 'sv_SE',
    },
    twitter: {
      card: 'summary_large_image',
      title: settings?.og_title || title,
      description: settings?.og_description || description,
      images: settings?.og_image ? [settings.og_image] : [],
    },
  };
}

export default function PublicHomePage() {
  return (
    <>
      {/* Hero Section with Search */}
      <HeroSection />

      {/* KPI Ticker - Platform Stats */}
      <KPITicker />

      {/* Events Section - "Happening Now" */}
      <section id="events">
        <EventsSection />
      </section>

      {/* Latest Posts Section */}
      <section id="posts">
        <PostsSection />
      </section>

      {/* Testimonials */}
      <TestimonialsSection />

      {/* About Section */}
      <section id="about" className="py-20 px-4 bg-[var(--dark-800)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[var(--brand-light)] mb-6 font-heading">
                Vad är Ungdomsappen?
              </h2>
              <p className="text-[var(--brand-light)]/70 text-lg mb-6 leading-relaxed">
                Ungdomsappen är en digital plattform som samlar alla aktiviteter, 
                evenemang och fritidsgårdar för unga på ett ställe. Oavsett om du 
                söker efter sportaktiviteter, kreativa workshops eller bara vill 
                hänga med vänner - vi har något för alla.
              </p>
              <ul className="space-y-4">
                {[
                  'Hitta aktiviteter nära dig',
                  'Anmäl dig till evenemang enkelt',
                  'Upptäck nya fritidsgårdar',
                  'Få personliga rekommendationer',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[var(--brand-light)]/80">
                    <div className="w-6 h-6 rounded-full bg-[var(--brand-primary)]/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20 p-8 border border-[var(--dark-500)]">
                <div className="w-full h-full rounded-2xl bg-[var(--dark-700)] flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                      <span className="text-5xl font-bold text-[var(--dark-900)]">U</span>
                    </div>
                    <p className="text-[var(--brand-light)]/60">App preview</p>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-[var(--brand-primary)]/10 blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-[var(--brand-purple)]/10 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Customer Logos Section */}
      <CustomersSection />

      {/* Final CTA */}
      <CTASection />
    </>
  );
}

