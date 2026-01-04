// Public Club Landing Page
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  Calendar,
  Users,
  ChevronRight,
  Star,
  CheckCircle,
  ArrowRight,
  Building2,
  Sparkles,
  Shield,
  Heart
} from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ungdomsappen.se';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
interface OpeningHour {
  id: number;
  weekday: number;
  weekday_display: string;
  week_cycle: string;
  open_time: string;
  close_time: string;
  title: string;
  gender_restriction: string;
  restriction_mode: string;
  min_value: number | null;
  max_value: number | null;
}

interface TodaysHours {
  closed: boolean;
  reason?: string;
  hours?: Array<{
    open_time: string;
    close_time: string;
    title: string;
    gender_restriction: string;
  }>;
  open_time?: string;
  close_time?: string;
  title?: string;
}

interface ClubData {
  id: number;
  name: string;
  slug: string;
  municipality_name: string;
  municipality_slug: string;
  municipality_description: string;
  municipality_avatar: string | null;
  description: string;
  avatar: string | null;
  hero_image: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  email: string;
  phone: string;
  allowed_age_groups: string;
  club_categories: string;
  regular_hours: OpeningHour[];
  is_open_now: boolean;
  todays_hours: TodaysHours;
  created_at: string;
}

// Fetch club data
async function fetchClubData(municipalitySlug: string, clubSlug: string): Promise<ClubData | null> {
  try {
    const response = await fetch(
      `${API_URL}/api/public/clubs/${municipalitySlug}/${clubSlug}/`,
      { cache: 'no-store' }
    );
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching club:', error);
    return null;
  }
}

// Strip HTML tags
function stripHtml(html: string): string {
  return html?.replace(/<[^>]+>/g, '') || '';
}

// Generate metadata for SEO
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ municipalitySlug: string; clubSlug: string }>
}): Promise<Metadata> {
  const { municipalitySlug, clubSlug } = await params;
  const club = await fetchClubData(municipalitySlug, clubSlug);
  
  if (!club) {
    return {
      title: 'Fritidsgård hittades inte',
    };
  }
  
  const cleanDescription = stripHtml(club.description);
  const title = `${club.name} - Fritidsgård i ${club.municipality_name} | Ungdomsappen`;
  const description = cleanDescription?.slice(0, 155) || 
    `Upptäck ${club.name} - en fritidsgård i ${club.municipality_name}. Se öppettider, aktiviteter och kontaktinfo.`;
  const imageUrl = club.hero_image?.startsWith('http') 
    ? club.hero_image 
    : club.hero_image 
      ? `${API_URL}${club.hero_image}` 
      : `${BASE_URL}/og-default.jpg`;
  
  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/${club.municipality_slug}/${club.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${club.municipality_slug}/${club.slug}`,
      siteName: 'Ungdomsappen',
      images: [{ url: imageUrl, width: 1200, height: 630 }],
      locale: 'sv_SE',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

// Group opening hours by weekday
function groupOpeningHours(hours: OpeningHour[]) {
  const weekdays = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
  const grouped: Record<number, OpeningHour[]> = {};
  
  hours.forEach(hour => {
    if (!grouped[hour.weekday]) {
      grouped[hour.weekday] = [];
    }
    grouped[hour.weekday].push(hour);
  });
  
  return weekdays.map((name, index) => ({
    name,
    weekday: index + 1,
    hours: grouped[index + 1] || [],
  }));
}

// Main component
export default async function PublicClubPage({ 
  params 
}: { 
  params: Promise<{ municipalitySlug: string; clubSlug: string }>
}) {
  const { municipalitySlug, clubSlug } = await params;
  const club = await fetchClubData(municipalitySlug, clubSlug);
  
  if (!club) {
    notFound();
  }
  
  const groupedHours = groupOpeningHours(club.regular_hours);
  const heroImageUrl = club.hero_image?.startsWith('http') 
    ? club.hero_image 
    : club.hero_image 
      ? `${API_URL}${club.hero_image}` 
      : null;
  const avatarUrl = club.avatar?.startsWith('http')
    ? club.avatar
    : club.avatar
      ? `${API_URL}${club.avatar}`
      : null;
  
  const cleanDescription = stripHtml(club.description);
  
  // JSON-LD Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${BASE_URL}/${club.municipality_slug}/${club.slug}`,
    name: club.name,
    description: cleanDescription,
    image: heroImageUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: club.address,
      addressLocality: club.municipality_name,
      addressCountry: 'SE',
    },
    geo: club.latitude && club.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: club.latitude,
      longitude: club.longitude,
    } : undefined,
    telephone: club.phone,
    email: club.email,
  };

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Background Image */}
        {heroImageUrl ? (
          <div className="absolute inset-0">
            <Image
              src={heroImageUrl}
              alt={`${club.name} - Fritidsgård i ${club.municipality_name}`}
              fill
              className="object-cover"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--dark-900)]/70 via-[var(--dark-900)]/60 to-[var(--dark-900)]" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)]/20 via-[var(--dark-900)] to-[var(--brand-purple)]/10" />
        )}
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[var(--brand-light)]/60 mb-8">
            <Link href="/" className="hover:text-[var(--brand-primary)] transition-colors">Hem</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/kommuner" className="hover:text-[var(--brand-primary)] transition-colors">Kommuner</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href={`/${club.municipality_slug}`} className="hover:text-[var(--brand-primary)] transition-colors">
              {club.municipality_name}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[var(--brand-light)]">{club.name}</span>
          </nav>
          
          {/* Club Header */}
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {avatarUrl ? (
                <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-[var(--dark-700)] shadow-xl">
                  <Image
                    src={avatarUrl}
                    alt={club.name}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center border-4 border-[var(--dark-700)] shadow-xl">
                  <Building2 className="w-16 h-16 text-white" />
                </div>
              )}
            </div>
            
            {/* Title & Status */}
            <div className="flex-1">
              {/* Open Status Badge */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  club.is_open_now 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${club.is_open_now ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                  {club.is_open_now ? 'Öppet nu' : 'Stängt'}
                </span>
                
                <span className="text-[var(--brand-light)]/60 text-sm">
                  {club.municipality_name}
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--brand-light)] mb-4 font-heading">
                {club.name}
              </h1>
              
              {/* Today's Hours */}
              {club.todays_hours && (
                <div className="flex items-center gap-2 text-lg text-[var(--brand-light)]/80">
                  <Clock className="w-5 h-5 text-[var(--brand-primary)]" />
                  {club.todays_hours.closed ? (
                    <span>Stängt idag{club.todays_hours.reason && ` - ${club.todays_hours.reason}`}</span>
                  ) : club.todays_hours.hours ? (
                    <span>
                      Idag: {club.todays_hours.hours.map(h => `${h.open_time}-${h.close_time}`).join(', ')}
                    </span>
                  ) : (
                    <span>Idag: {club.todays_hours.open_time}-{club.todays_hours.close_time}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Main Content */}
      <section className="py-16 -mt-20 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description Card */}
              <div className="bg-[var(--dark-800)]/80 backdrop-blur-sm rounded-2xl border border-[var(--dark-700)] p-8">
                <h2 className="text-2xl font-bold text-[var(--brand-light)] mb-4 font-heading">
                  Om {club.name}
                </h2>
                <div 
                  className="prose prose-invert prose-lg max-w-none prose-headings:text-[var(--brand-light)] prose-p:text-[var(--brand-light)]/80 prose-p:leading-relaxed prose-strong:text-[var(--brand-light)] prose-strong:font-semibold prose-a:text-[var(--brand-primary)] prose-a:hover:text-[var(--brand-purple)] prose-ul:text-[var(--brand-light)]/80 prose-ol:text-[var(--brand-light)]/80 prose-li:text-[var(--brand-light)]/80 prose-h1:text-[var(--brand-light)] prose-h2:text-[var(--brand-light)] prose-h3:text-[var(--brand-light)] prose-h4:text-[var(--brand-light)] prose-blockquote:text-[var(--brand-light)]/70 prose-code:text-[var(--brand-primary)]"
                  dangerouslySetInnerHTML={{ __html: club.description || '' }}
                />
              </div>
              
              {/* Opening Hours */}
              <div className="bg-[var(--dark-800)]/80 backdrop-blur-sm rounded-2xl border border-[var(--dark-700)] p-8">
                <h2 className="text-2xl font-bold text-[var(--brand-light)] mb-6 font-heading flex items-center gap-3">
                  <Clock className="w-6 h-6 text-[var(--brand-primary)]" />
                  Öppettider
                </h2>
                
                <div className="space-y-3">
                  {groupedHours.map(({ name, weekday, hours }) => {
                    const isToday = new Date().getDay() === (weekday === 7 ? 0 : weekday);
                    
                    return (
                      <div 
                        key={weekday}
                        className={`flex items-center justify-between py-3 px-4 rounded-xl transition-colors ${
                          isToday 
                            ? 'bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30' 
                            : 'hover:bg-[var(--dark-700)]/50'
                        }`}
                      >
                        <span className={`font-medium ${isToday ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-light)]'}`}>
                          {name}
                          {isToday && <span className="ml-2 text-xs">(idag)</span>}
                        </span>
                        <span className="text-[var(--brand-light)]/70">
                          {hours.length > 0 
                            ? hours.map(h => `${h.open_time.slice(0,5)}-${h.close_time.slice(0,5)}`).join(', ')
                            : 'Stängt'
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Contact */}
              <div className="bg-[var(--dark-800)]/80 backdrop-blur-sm rounded-2xl border border-[var(--dark-700)] p-8">
                <h2 className="text-2xl font-bold text-[var(--brand-light)] mb-6 font-heading">
                  Kontakta oss
                </h2>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  {club.address && (
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-[var(--brand-primary)]" />
                      </div>
                      <div>
                        <p className="text-sm text-[var(--brand-light)]/60 mb-1">Adress</p>
                        <p className="text-[var(--brand-light)]">{club.address}</p>
                      </div>
                    </div>
                  )}
                  
                  {club.phone && (
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--brand-purple)]/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-6 h-6 text-[var(--brand-purple)]" />
                      </div>
                      <div>
                        <p className="text-sm text-[var(--brand-light)]/60 mb-1">Telefon</p>
                        <a href={`tel:${club.phone}`} className="text-[var(--brand-light)] hover:text-[var(--brand-primary)] transition-colors">
                          {club.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {club.email && (
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-pink-400" />
                      </div>
                      <div>
                        <p className="text-sm text-[var(--brand-light)]/60 mb-1">E-post</p>
                        <a href={`mailto:${club.email}`} className="text-[var(--brand-light)] hover:text-[var(--brand-primary)] transition-colors break-all">
                          {club.email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Map Link */}
                {club.latitude && club.longitude && (
                  <div className="mt-6 pt-6 border-t border-[var(--dark-700)]">
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${club.latitude},${club.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[var(--brand-primary)] hover:underline"
                    >
                      <MapPin className="w-4 h-4" />
                      Visa på karta
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="space-y-6">
              {/* CTA Card */}
              <div className="bg-[var(--dark-900)]/80 backdrop-blur-sm rounded-2xl p-8 text-[var(--brand-light)] relative overflow-hidden border border-[var(--dark-700)]">
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-[var(--dark-800)] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <Sparkles className="w-8 h-8 text-[var(--brand-primary)]" />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-4 font-heading text-[var(--brand-light)]">
                    Bli medlem i {club.name}!
                  </h3>
                  
                  <p className="text-[var(--brand-light)]/80 mb-6 leading-relaxed">
                    Ladda ner Ungdomsappen och registrera dig för att få tillgång till alla aktiviteter, 
                    evenemang och belöningar på {club.name}.
                  </p>
                  
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0" />
                      <span className="text-[var(--brand-light)]/80">Checka in med QR-kod</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0" />
                      <span className="text-[var(--brand-light)]/80">Se kommande evenemang</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0" />
                      <span className="text-[var(--brand-light)]/80">Samla poäng & belöningar</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0" />
                      <span className="text-[var(--brand-light)]/80">Gratis att använda</span>
                    </li>
                  </ul>
                  
                  <div className="space-y-3">
                    <Link
                      href="/registrera"
                      className="flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl font-semibold bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                    >
                      Skapa konto
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                    
                    <Link
                      href="/login"
                      className="flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl font-semibold bg-[var(--brand-purple)] text-[var(--dark-900)] hover:bg-[var(--brand-purple)]/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                    >
                      Logga in
                    </Link>
                  </div>
                </div>
              </div>
              
              {/* Features */}
              <div className="bg-[var(--dark-800)]/80 backdrop-blur-sm rounded-2xl border border-[var(--dark-700)] p-6">
                <h3 className="text-lg font-bold text-[var(--brand-light)] mb-4">
                  Med Ungdomsappen får du
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-[var(--brand-primary)]" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--brand-light)]">Trygg miljö</p>
                      <p className="text-sm text-[var(--brand-light)]/60">Verifierade användare och säker plattform</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--brand-purple)]/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-[var(--brand-purple)]" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--brand-light)]">Alla evenemang</p>
                      <p className="text-sm text-[var(--brand-light)]/60">Missa aldrig ett event eller en aktivitet</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                      <Heart className="w-5 h-5 text-pink-400" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--brand-light)]">Gemenskap</p>
                      <p className="text-sm text-[var(--brand-light)]/60">Hitta nya vänner och skapa minnen</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quick Links */}
              <div className="bg-[var(--dark-800)]/80 backdrop-blur-sm rounded-2xl border border-[var(--dark-700)] p-6">
                <h3 className="text-lg font-bold text-[var(--brand-light)] mb-4">
                  Snabblänkar
                </h3>
                
                <nav className="space-y-2">
                  <Link 
                    href={`/${club.municipality_slug}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--dark-700)]/50 transition-colors group"
                  >
                    <span className="text-[var(--brand-light)]/80">Fler fritidsgårdar i {club.municipality_name}</span>
                    <ChevronRight className="w-4 h-4 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] transition-colors" />
                  </Link>
                  <Link 
                    href="/kommuner"
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--dark-700)]/50 transition-colors group"
                  >
                    <span className="text-[var(--brand-light)]/80">Alla kommuner</span>
                    <ChevronRight className="w-4 h-4 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] transition-colors" />
                  </Link>
                  <Link 
                    href="/events"
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--dark-700)]/50 transition-colors group"
                  >
                    <span className="text-[var(--brand-light)]/80">Kommande evenemang</span>
                    <ChevronRight className="w-4 h-4 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] transition-colors" />
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Bottom CTA */}
      <section className="py-20 bg-gradient-to-b from-[var(--dark-900)] to-[var(--dark-800)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--brand-light)] mb-6 font-heading">
            Redo att upptäcka {club.name}?
          </h2>
          <p className="text-xl text-[var(--brand-light)]/70 mb-8 max-w-2xl mx-auto">
            Ladda ner Ungdomsappen idag och bli en del av gemenskapen. Det är helt gratis!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/registrera"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-[var(--dark-900)] rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
            >
              <Sparkles className="w-5 h-5" />
              Skapa konto gratis
            </Link>
            <Link
              href="/om-oss"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--dark-700)] text-[var(--brand-light)] rounded-xl font-semibold hover:bg-[var(--dark-600)] transition-all border border-[var(--dark-600)]"
            >
              Läs mer om Ungdomsappen
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

