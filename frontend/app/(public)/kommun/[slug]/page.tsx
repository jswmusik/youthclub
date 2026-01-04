// frontend/app/(public)/kommun/[slug]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  MapPin, 
  Calendar, 
  Users, 
  ArrowRight, 
  Building2,
  Sparkles,
  ChevronRight
} from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ungdomsappen.se';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
interface LocalPageData {
  id: number;
  slug: string;
  title: string;
  meta_description: string;
  h1_title: string;
  hero_tagline: string;
  intro_content: string;
  main_content: string;
  cta_content: string;
  og_title: string;
  og_description: string;
  og_image: string | null;
  hero_image: string | null;
  hero_image_alt: string | null;
  twitter_card: string;
  twitter_title: string;
  twitter_description: string;
  twitter_image: string | null;
  focus_keyphrase: string;
  canonical_url: string;
  location_name: string;
  location_slug: string;
  location_region: string;
  location_population: number;
  location_latitude: number;
  location_longitude: number;
  show_nearby_clubs: boolean;
  show_nearby_events: boolean;
  show_platform_stats: boolean;
  show_testimonials: boolean;
  nearby_radius_km: number;
  page_type: string;
  target_audience: string;
  published_at: string;
  nearby_clubs?: NearbyClub[];
  nearby_events?: NearbyEvent[];
  platform_stats?: PlatformStats;
  faq_items?: Array<{ question: string; answer: string }>;
  word_count?: number;
  reading_time_minutes?: number;
}

interface NearbyClub {
  id: number;
  name: string;
  slug: string;
  municipality_name: string;
  municipality_slug: string;
  distance_km: number;
  address: string;
  description: string;
  hero_image: string | null;
  avatar: string | null;
}

interface NearbyEvent {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  start_date_formatted: string;
  location_name: string;
  club_name: string | null;
  club_slug: string | null;
  municipality_name: string;
  distance_km: number;
}

interface PlatformStats {
  total_clubs: number;
  total_municipalities: number;
  total_visits: number;
  total_members: number;
  upcoming_events: number;
  events_this_month: number;
  stats_period: string;
}

// Fetch page data
async function fetchLocalPage(slug: string): Promise<LocalPageData | null> {
  try {
    const response = await fetch(`${API_URL}/api/seo/public/local-page/${slug}/`, {
      cache: 'no-store' // Don't cache - fetch fresh data each time
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching local page:', error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pageData = await fetchLocalPage(slug);
  
  if (!pageData) {
    return {
      title: 'Sidan hittades inte | Ungdomsappen',
      description: 'Den begärda sidan kunde inte hittas.',
    };
  }
  
  const canonicalUrl = pageData.canonical_url || `${BASE_URL}/kommun/${slug}`;
  
  return {
    title: pageData.title,
    description: pageData.meta_description,
    keywords: pageData.focus_keyphrase ? [pageData.focus_keyphrase, pageData.location_name, 'fritidsgård', 'ungdomar'] : undefined,
    authors: [{ name: 'Ungdomsappen' }],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      locale: 'sv_SE',
      url: canonicalUrl,
      siteName: 'Ungdomsappen',
      title: pageData.og_title || pageData.title,
      description: pageData.og_description || pageData.meta_description,
      images: pageData.og_image ? [
        {
          url: pageData.og_image.startsWith('http') ? pageData.og_image : `${API_URL}${pageData.og_image}`,
          width: 1200,
          height: 630,
          alt: pageData.hero_image_alt || pageData.h1_title,
        }
      ] : [
        {
          url: `${BASE_URL}/og-default.jpg`,
          width: 1200,
          height: 630,
          alt: pageData.h1_title,
        }
      ],
    },
    twitter: {
      card: (pageData.twitter_card as 'summary' | 'summary_large_image') || 'summary_large_image',
      title: pageData.twitter_title || pageData.og_title || pageData.title,
      description: pageData.twitter_description || pageData.og_description || pageData.meta_description,
      images: pageData.twitter_image 
        ? [pageData.twitter_image.startsWith('http') ? pageData.twitter_image : `${API_URL}${pageData.twitter_image}`]
        : pageData.og_image 
          ? [pageData.og_image.startsWith('http') ? pageData.og_image : `${API_URL}${pageData.og_image}`]
          : [`${BASE_URL}/og-default.jpg`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

// Simple markdown to HTML converter with proper heading structure
function renderMarkdown(content: string): string {
  if (!content) return '';
  
  return content
    // Headers - convert ## to h2, ### to h3
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-[var(--brand-light)] mt-8 mb-4">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-[var(--brand-light)] mt-10 mb-6">$1</h2>')
    // Bold
    .replace(/\*\*(.*)\*\*/gim, '<strong class="text-[var(--brand-light)] font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li class="ml-4 text-[var(--brand-light)]/80">$1</li>')
    // Paragraphs (lines that don't start with < and aren't empty)
    .replace(/^(?!<|$)(.*$)/gim, '<p class="text-[var(--brand-light)]/80 leading-relaxed mb-4">$1</p>')
    // Wrap consecutive li elements in ul
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc list-inside space-y-2 mb-6">$&</ul>')
    // Clean up empty paragraphs
    .replace(/<p class="[^"]*"><\/p>/g, '');
}

// Stats Card Component
function StatCard({ icon: Icon, value, label, color }: { 
  icon: any; 
  value: string | number; 
  label: string;
  color: string;
}) {
  return (
    <div className="bg-[var(--dark-800)]/50 backdrop-blur-sm border border-[var(--dark-700)] rounded-xl p-4 text-center">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-2 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-2xl font-bold text-[var(--brand-light)]">
        {typeof value === 'number' ? value.toLocaleString('sv-SE') : value}
      </div>
      <div className="text-sm text-[var(--brand-light)]/60">{label}</div>
    </div>
  );
}

// Club Card Component
function ClubCard({ club }: { club: NearbyClub }) {
  const imageUrl = club.hero_image || club.avatar;
  
  return (
    <Link 
      href={`/${club.municipality_slug}/${club.slug}`}
      className="group block bg-[var(--dark-800)]/50 backdrop-blur-sm border border-[var(--dark-700)] rounded-xl overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all duration-300"
    >
      {/* Hero Image */}
      {imageUrl ? (
        <div className="relative h-32 w-full overflow-hidden">
          <Image
            src={imageUrl.startsWith('http') ? imageUrl : `${API_URL}${imageUrl}`}
            alt={`${club.name} i ${club.municipality_name}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-900)]/80 to-transparent" />
          <span className="absolute top-2 right-2 text-xs text-[var(--brand-light)] bg-[var(--dark-900)]/70 px-2 py-1 rounded-full backdrop-blur-sm">
            {club.distance_km} km
          </span>
        </div>
      ) : (
        <div className="relative h-24 w-full bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20 flex items-center justify-center">
          <Building2 className="w-10 h-10 text-[var(--brand-primary)]/50" />
          <span className="absolute top-2 right-2 text-xs text-[var(--brand-light)]/60 bg-[var(--dark-900)]/50 px-2 py-1 rounded-full">
            {club.distance_km} km
          </span>
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-start gap-3 mb-2">
          {/* Avatar */}
          {club.avatar && !club.hero_image ? null : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
              {club.avatar ? (
                <Image
                  src={club.avatar.startsWith('http') ? club.avatar : `${API_URL}${club.avatar}`}
                  alt={club.name}
                  width={40}
                  height={40}
                  className="rounded-lg object-cover w-10 h-10"
                  unoptimized
                />
              ) : (
                <Building2 className="w-5 h-5 text-white" />
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[var(--brand-light)] group-hover:text-[var(--brand-primary)] transition-colors truncate">
              {club.name}
            </h3>
            <p className="text-sm text-[var(--brand-light)]/60">{club.municipality_name}</p>
          </div>
        </div>
        
        {club.description && (
          <p className="text-sm text-[var(--brand-light)]/70 line-clamp-2 mb-3">
            {club.description}
          </p>
        )}
        
        <div className="flex items-center text-[var(--brand-primary)] text-sm font-medium group-hover:gap-2 transition-all">
          <span>Besök</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}

// Event Card Component
function EventCard({ event }: { event: NearbyEvent }) {
  return (
    <Link 
      href={`/events/${event.slug}`}
      className="group flex items-center gap-4 bg-[var(--dark-800)]/50 backdrop-blur-sm border border-[var(--dark-700)] rounded-xl p-4 hover:border-[var(--brand-primary)]/50 transition-all duration-300"
    >
      <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex flex-col items-center justify-center text-white">
        <span className="text-xs font-medium uppercase">
          {new Date(event.start_date).toLocaleDateString('sv-SE', { month: 'short' })}
        </span>
        <span className="text-lg font-bold">
          {new Date(event.start_date).getDate()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[var(--brand-light)] group-hover:text-[var(--brand-primary)] transition-colors truncate">
          {event.title}
        </h3>
        <p className="text-sm text-[var(--brand-light)]/60">
          {event.location_name} • {event.distance_km} km
        </p>
      </div>
      <ArrowRight className="w-5 h-5 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] transition-colors" />
    </Link>
  );
}

// FAQ Section Component
function FAQSection({ items }: { items: Array<{ question: string; answer: string }> }) {
  if (!items || items.length === 0) return null;
  
  return (
    <section className="py-12" itemScope itemType="https://schema.org/FAQPage">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-[var(--brand-light)] mb-8 font-heading">
          Vanliga frågor
        </h2>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div 
              key={index}
              className="bg-[var(--dark-800)]/50 backdrop-blur-sm border border-[var(--dark-700)] rounded-xl p-5"
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
            >
              <h3 
                className="font-semibold text-[var(--brand-light)] mb-2"
                itemProp="name"
              >
                {item.question}
              </h3>
              <div 
                itemScope
                itemProp="acceptedAnswer"
                itemType="https://schema.org/Answer"
              >
                <p 
                  className="text-[var(--brand-light)]/70"
                  itemProp="text"
                >
                  {item.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Main Page Component (Server Component)
export default async function LocalLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pageData = await fetchLocalPage(slug);
  
  if (!pageData) {
    notFound();
  }
  
  // Generate JSON-LD Schema
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      // WebPage
      {
        '@type': 'WebPage',
        '@id': `${BASE_URL}/kommun/${pageData.slug}`,
        url: `${BASE_URL}/kommun/${pageData.slug}`,
        name: pageData.title,
        description: pageData.meta_description,
        isPartOf: { '@id': `${BASE_URL}/#website` },
        about: {
          '@type': 'Place',
          name: pageData.location_name,
          address: {
            '@type': 'PostalAddress',
            addressLocality: pageData.location_name,
            addressRegion: pageData.location_region,
            addressCountry: 'SE',
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: pageData.location_latitude,
            longitude: pageData.location_longitude,
          },
        },
        breadcrumb: { '@id': `${BASE_URL}/kommun/${pageData.slug}#breadcrumb` },
        ...(pageData.hero_image && {
          primaryImageOfPage: {
            '@type': 'ImageObject',
            url: pageData.hero_image.startsWith('http') ? pageData.hero_image : `${API_URL}${pageData.hero_image}`,
            caption: pageData.hero_image_alt || pageData.h1_title,
          }
        }),
      },
      // BreadcrumbList
      {
        '@type': 'BreadcrumbList',
        '@id': `${BASE_URL}/kommun/${pageData.slug}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Hem', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'Kommuner', item: `${BASE_URL}/kommuner` },
          { '@type': 'ListItem', position: 3, name: pageData.location_name, item: `${BASE_URL}/kommun/${pageData.slug}` },
        ],
      },
      // WebSite
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        url: BASE_URL,
        name: 'Ungdomsappen',
        publisher: { '@id': `${BASE_URL}/#organization` },
      },
      // Organization
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#organization`,
        name: 'Ungdomsappen',
        url: BASE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${BASE_URL}/logo.png`,
        },
      },
      // FAQPage if FAQ items exist
      ...(pageData.faq_items && pageData.faq_items.length > 0 ? [{
        '@type': 'FAQPage',
        mainEntity: pageData.faq_items.map(item => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }] : []),
      // LocalBusiness entries for nearby clubs
      ...(pageData.nearby_clubs || []).slice(0, 5).map((club) => ({
        '@type': 'LocalBusiness',
        '@id': `${BASE_URL}/${club.municipality_slug}/${club.slug}`,
        name: club.name,
        description: club.description,
        address: {
          '@type': 'PostalAddress',
          streetAddress: club.address,
          addressLocality: club.municipality_name,
          addressCountry: 'SE',
        },
        url: `${BASE_URL}/${club.municipality_slug}/${club.slug}`,
      })),
    ],
  };
  
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />
      
      {/* Hero Section with Image */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        {/* Hero Image Background */}
        {pageData.hero_image ? (
          <div className="absolute inset-0">
            <Image
              src={pageData.hero_image.startsWith('http') ? pageData.hero_image : `${API_URL}${pageData.hero_image}`}
              alt={pageData.hero_image_alt || `Fritidsgårdar i ${pageData.location_name}`}
              fill
              className="object-cover"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--dark-900)]/80 via-[var(--dark-900)]/70 to-[var(--dark-900)]" />
          </div>
        ) : (
          <>
            {/* Fallback gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--brand-primary)]/10 via-transparent to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[var(--brand-primary)]/5 rounded-full blur-3xl" />
          </>
        )}
        
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav 
            className="flex items-center gap-2 text-sm text-[var(--brand-light)]/60 mb-8"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-[var(--brand-primary)] transition-colors">Hem</Link>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
            <Link href="/kommuner" className="hover:text-[var(--brand-primary)] transition-colors">Kommuner</Link>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
            <span className="text-[var(--brand-light)]">{pageData.location_name}</span>
          </nav>
          
          {/* Title - H1 is critical for SEO */}
          <header className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-4 py-2 rounded-full text-sm font-medium mb-6">
              <MapPin className="w-4 h-4" aria-hidden="true" />
              <span>{pageData.location_region}</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--brand-light)] mb-6 font-heading">
              {pageData.h1_title}
            </h1>
            
            {pageData.hero_tagline && (
              <p className="text-xl text-[var(--brand-light)]/70 max-w-2xl mx-auto">
                {pageData.hero_tagline}
              </p>
            )}
            
            {/* Reading time indicator */}
            {pageData.reading_time_minutes && (
              <p className="text-sm text-[var(--brand-light)]/50 mt-4">
                Lästid: ca {pageData.reading_time_minutes} min
              </p>
            )}
          </header>
          
          {/* Platform Stats */}
          {pageData.show_platform_stats && pageData.platform_stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <StatCard 
                icon={Building2} 
                value={pageData.platform_stats.total_clubs} 
                label="Fritidsgårdar" 
                color="bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)]"
              />
              <StatCard 
                icon={Users} 
                value={pageData.platform_stats.total_members} 
                label="Aktiva medlemmar" 
                color="bg-gradient-to-br from-green-500 to-emerald-600"
              />
              <StatCard 
                icon={Calendar} 
                value={pageData.platform_stats.upcoming_events} 
                label="Kommande event" 
                color="bg-gradient-to-br from-orange-500 to-amber-600"
              />
              <StatCard 
                icon={Sparkles} 
                value={pageData.platform_stats.total_visits} 
                label="Besök/månad" 
                color="bg-gradient-to-br from-pink-500 to-rose-600"
              />
            </div>
          )}
        </div>
      </section>
      
      {/* Main Content - Article structure for SEO */}
      <article className="py-12 bg-[var(--dark-800)]/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content Column */}
            <div className="lg:col-span-2">
              {/* Intro - Lead paragraph */}
              {pageData.intro_content && (
                <div className="mb-8">
                  <p className="text-lg text-[var(--brand-light)]/80 leading-relaxed font-medium">
                    {pageData.intro_content}
                  </p>
                </div>
              )}
              
              {/* Main Content with proper heading structure */}
              <div 
                className="prose-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(pageData.main_content) }}
              />
              
              {/* CTA Section */}
              {pageData.cta_content && (
                <aside className="mt-12 p-6 bg-gradient-to-br from-[var(--brand-primary)]/10 to-[var(--brand-purple)]/10 rounded-2xl border border-[var(--brand-primary)]/20">
                  <p className="text-[var(--brand-light)]/80 mb-4">{pageData.cta_content}</p>
                  <Link 
                    href="/events"
                    className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--dark-900)] font-semibold px-6 py-3 rounded-xl transition-colors"
                  >
                    Hitta aktiviteter
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </aside>
              )}
            </div>
            
            {/* Sidebar */}
            <aside className="space-y-8">
              {/* Location Info */}
              <div className="bg-[var(--dark-800)]/50 backdrop-blur-sm border border-[var(--dark-700)] rounded-xl p-5">
                <h2 className="font-semibold text-[var(--brand-light)] mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[var(--brand-primary)]" aria-hidden="true" />
                  Om {pageData.location_name}
                </h2>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[var(--brand-light)]/60">Region</dt>
                    <dd className="text-[var(--brand-light)]">{pageData.location_region}</dd>
                  </div>
                  {pageData.location_population && (
                    <div className="flex justify-between">
                      <dt className="text-[var(--brand-light)]/60">Befolkning</dt>
                      <dd className="text-[var(--brand-light)]">
                        {pageData.location_population.toLocaleString('sv-SE')} inv.
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
              
              {/* Quick Links */}
              <nav className="bg-[var(--dark-800)]/50 backdrop-blur-sm border border-[var(--dark-700)] rounded-xl p-5">
                <h2 className="font-semibold text-[var(--brand-light)] mb-4">Snabblänkar</h2>
                <div className="space-y-2">
                  <Link 
                    href={`/events?municipality=${pageData.location_slug}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--dark-700)] transition-colors group"
                  >
                    <span className="text-[var(--brand-light)]/80 group-hover:text-[var(--brand-light)]">
                      Evenemang i {pageData.location_name}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)]" aria-hidden="true" />
                  </Link>
                  <Link 
                    href="/kommuner"
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--dark-700)] transition-colors group"
                  >
                    <span className="text-[var(--brand-light)]/80 group-hover:text-[var(--brand-light)]">
                      Alla kommuner
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)]" aria-hidden="true" />
                  </Link>
                </div>
              </nav>
            </aside>
          </div>
        </div>
      </article>
      
      {/* Nearby Clubs Section */}
      {pageData.show_nearby_clubs && pageData.nearby_clubs && pageData.nearby_clubs.length > 0 && (
        <section className="py-16" aria-labelledby="nearby-clubs-heading">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 id="nearby-clubs-heading" className="text-2xl font-bold text-[var(--brand-light)] font-heading">
                Fritidsgårdar nära {pageData.location_name}
              </h2>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm text-[var(--brand-light)]/70 bg-[var(--dark-800)]/60 border border-[var(--dark-700)]/50 backdrop-blur-sm">
                Inom {pageData.nearby_radius_km} km
              </span>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageData.nearby_clubs.map((club) => (
                <ClubCard key={club.id} club={club} />
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* Nearby Events Section */}
      {pageData.show_nearby_events && pageData.nearby_events && pageData.nearby_events.length > 0 && (
        <section className="py-16 bg-[var(--dark-800)]/30" aria-labelledby="nearby-events-heading">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 id="nearby-events-heading" className="text-2xl font-bold text-[var(--brand-light)] font-heading">
                Kommande evenemang
              </h2>
              <Link 
                href={`/events?municipality=${pageData.location_slug}`}
                className="text-[var(--brand-primary)] hover:underline text-sm font-medium flex items-center gap-1"
              >
                Visa alla
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
            
            <div className="space-y-3">
              {pageData.nearby_events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* FAQ Section */}
      {pageData.faq_items && pageData.faq_items.length > 0 && (
        <FAQSection items={pageData.faq_items} />
      )}
      
      {/* No Content Fallback */}
      {(!pageData.nearby_clubs || pageData.nearby_clubs.length === 0) && 
       (!pageData.nearby_events || pageData.nearby_events.length === 0) && (
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-[var(--dark-800)]/50 backdrop-blur-sm border border-[var(--dark-700)] rounded-2xl p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold text-[var(--brand-light)] mb-2">
                Ungdomsappen expanderar!
              </h2>
              <p className="text-[var(--brand-light)]/70 mb-6">
                Just nu finns inga anslutna fritidsgårdar i {pageData.location_name}, men vi växer snabbt. 
                Kontakta din kommun och berätta att du vill se lokala aktiviteter här!
              </p>
              <Link 
                href="/kontakt"
                className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Kontakta oss
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
