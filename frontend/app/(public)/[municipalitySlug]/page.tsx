// Public Municipality Landing Page - Lists all clubs in a municipality
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  ChevronRight,
  Building2,
  Users,
  ArrowRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitize';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ungdomsappen.se';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
interface ClubData {
  id: number;
  name: string;
  slug: string;
  description: string;
  address: string;
  avatar: string | null;
  hero_image: string | null;
  phone: string;
  email: string;
  is_open_now: boolean;
  allowed_age_groups: string;
}

interface MunicipalityData {
  id: number;
  name: string;
  slug: string;
  description: string;
  avatar: string | null;
  hero_image: string | null;
  email: string;
  phone: string;
  website_link: string;
  clubs: ClubData[];
  club_count: number;
}

// Fetch municipality data
async function fetchMunicipalityData(slug: string): Promise<MunicipalityData | null> {
  try {
    const response = await fetch(
      `${API_URL}/api/public/municipalities/${slug}/`,
      { cache: 'no-store' }
    );
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching municipality:', error);
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
  params: Promise<{ municipalitySlug: string }>
}): Promise<Metadata> {
  const { municipalitySlug } = await params;
  const municipality = await fetchMunicipalityData(municipalitySlug);
  
  if (!municipality) {
    return {
      title: 'Kommun hittades inte',
    };
  }
  
  const cleanDescription = stripHtml(municipality.description);
  const title = `Fritidsgårdar i ${municipality.name} | Ungdomsappen`;
  const description = cleanDescription?.slice(0, 155) || 
    `Upptäck alla fritidsgårdar i ${municipality.name}. Se öppettider, aktiviteter och kontaktinfo för ${municipality.club_count} fritidsgårdar.`;
  const imageUrl = municipality.hero_image?.startsWith('http') 
    ? municipality.hero_image 
    : municipality.hero_image 
      ? `${API_URL}${municipality.hero_image}` 
      : `${BASE_URL}/og-default.jpg`;
  
  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/${municipality.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${municipality.slug}`,
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

// Club Card Component
function ClubCard({ club, municipalitySlug }: { club: ClubData; municipalitySlug: string }) {
  const avatarUrl = club.avatar?.startsWith('http')
    ? club.avatar
    : club.avatar
      ? `${API_URL}${club.avatar}`
      : null;
  
  return (
    <Link 
      href={`/${municipalitySlug}/${club.slug}`}
      className="group bg-[var(--dark-800)]/80 backdrop-blur-sm rounded-2xl border border-[var(--dark-700)] overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all hover:shadow-lg hover:shadow-[var(--brand-primary)]/5"
    >
      {/* Club Avatar/Image */}
      <div className="relative h-32 bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={club.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Building2 className="w-16 h-16 text-[var(--brand-light)]/20" />
          </div>
        )}
        
        {/* Open Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            club.is_open_now 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-[var(--dark-800)]/80 text-[var(--brand-light)]/60 border border-[var(--dark-600)]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${club.is_open_now ? 'bg-green-400 animate-pulse' : 'bg-[var(--brand-light)]/40'}`} />
            {club.is_open_now ? 'Öppet' : 'Stängt'}
          </span>
        </div>
      </div>
      
      {/* Club Info */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-[var(--brand-light)] mb-2 group-hover:text-[var(--brand-primary)] transition-colors">
          {club.name}
        </h3>
        
        {club.address && (
          <div className="flex items-start gap-2 text-sm text-[var(--brand-light)]/60 mb-3">
            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{club.address}</span>
          </div>
        )}
        
        {club.description && (
          <p className="text-sm text-[var(--brand-light)]/70 line-clamp-2 mb-4">
            {stripHtml(club.description)}
          </p>
        )}
        
        <div className="flex items-center justify-between pt-3 border-t border-[var(--dark-700)]">
          <span className="text-xs text-[var(--brand-light)]/50">
            {club.allowed_age_groups || 'Alla åldrar'}
          </span>
          <span className="text-[var(--brand-primary)] text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
            Läs mer
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// Main component
export default async function PublicMunicipalityPage({ 
  params 
}: { 
  params: Promise<{ municipalitySlug: string }>
}) {
  const { municipalitySlug } = await params;
  const municipality = await fetchMunicipalityData(municipalitySlug);
  
  if (!municipality) {
    notFound();
  }
  
  const heroImageUrl = municipality.hero_image?.startsWith('http') 
    ? municipality.hero_image 
    : municipality.hero_image 
      ? `${API_URL}${municipality.hero_image}` 
      : null;
  const avatarUrl = municipality.avatar?.startsWith('http')
    ? municipality.avatar
    : municipality.avatar
      ? `${API_URL}${municipality.avatar}`
      : null;
  
  // JSON-LD Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentOrganization',
    '@id': `${BASE_URL}/${municipality.slug}`,
    name: municipality.name,
    description: stripHtml(municipality.description),
    image: heroImageUrl,
    url: `${BASE_URL}/${municipality.slug}`,
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
        {/* Background */}
        {heroImageUrl ? (
          <div className="absolute inset-0">
            <Image
              src={heroImageUrl}
              alt={`Fritidsgårdar i ${municipality.name}`}
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
            <span className="text-[var(--brand-light)]">{municipality.name}</span>
          </nav>
          
          {/* Municipality Header */}
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {avatarUrl ? (
                <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-[var(--dark-700)] shadow-xl">
                  <Image
                    src={avatarUrl}
                    alt={municipality.name}
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
            
            {/* Title & Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30">
                  <Users className="w-4 h-4" />
                  {municipality.club_count} fritidsgård{municipality.club_count !== 1 ? 'ar' : ''}
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--brand-light)] mb-4 font-heading">
                Fritidsgårdar i {municipality.name}
              </h1>
              
              {municipality.description && (
                <div 
                  className="text-lg text-[var(--brand-light)]/80 max-w-2xl prose prose-invert max-w-none
                    [&_*]:!text-[var(--brand-light)]/80
                    [&_*]:!bg-transparent
                    [&_h1]:text-2xl [&_h1]:sm:text-3xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:!text-[var(--brand-light)]
                    [&_h2]:text-xl [&_h2]:sm:text-2xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-4 [&_h2]:!text-[var(--brand-light)]
                    [&_h3]:text-lg [&_h3]:sm:text-xl [&_h3]:font-bold [&_h3]:mt-5 [&_h3]:mb-3 [&_h3]:!text-[var(--brand-light)]
                    [&_h4]:text-base [&_h4]:sm:text-lg [&_h4]:font-bold [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:!text-[var(--brand-light)]
                    [&_p]:leading-relaxed [&_p]:mb-4 [&_p]:!text-[var(--brand-light)]/80
                    [&_span]:!text-[var(--brand-light)]/80
                    [&_a]:!text-[var(--brand-primary)] [&_a]:no-underline [&_a]:hover:!text-[var(--brand-purple)] [&_a]:hover:underline [&_a]:transition-colors
                    [&_strong]:font-bold [&_strong]:!text-[var(--brand-light)]
                    [&_b]:font-bold [&_b]:!text-[var(--brand-light)]
                    [&_em]:italic [&_em]:!text-[var(--brand-light)]/80
                    [&_ul]:list-disc [&_ul]:list-inside [&_ul]:mb-4 [&_ul]:space-y-2 [&_ul]:pl-4 [&_ul]:!text-[var(--brand-light)]/80
                    [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:mb-4 [&_ol]:space-y-2 [&_ol]:pl-4 [&_ol]:!text-[var(--brand-light)]/80
                    [&_li]:mb-1 [&_li]:!text-[var(--brand-light)]/80
                    [&_blockquote]:border-l-4 [&_blockquote]:!border-l-[var(--brand-primary)] [&_blockquote]:!bg-[var(--dark-700)] [&_blockquote]:py-3 [&_blockquote]:px-4 [&_blockquote]:rounded-r-xl [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:!text-[var(--brand-light)]/70
                    [&_code]:!text-[var(--brand-primary)] [&_code]:!bg-[var(--dark-700)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
                    [&_pre]:!bg-[var(--dark-900)] [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:text-sm [&_pre]:border [&_pre]:border-[var(--dark-600)]
                    [&_pre_code]:!bg-transparent [&_pre_code]:p-0
                    [&_img]:rounded-xl [&_img]:my-4 [&_img]:w-full [&_img]:h-auto [&_img]:max-w-full
                    [&_hr]:border-[var(--dark-600)] [&_hr]:my-6 [&_hr]:border-t
                    [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-sm
                    [&_th]:!bg-[var(--dark-700)] [&_th]:!text-[var(--brand-light)] [&_th]:font-semibold [&_th]:p-3 [&_th]:border [&_th]:border-[var(--dark-600)] [&_th]:text-left
                    [&_td]:p-3 [&_td]:border [&_td]:border-[var(--dark-600)] [&_td]:!text-[var(--brand-light)]/80"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(municipality.description) }}
                />
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Clubs Grid */}
      <section className="py-16 -mt-20 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {municipality.clubs.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-[var(--brand-light)] font-heading">
                  Alla fritidsgårdar
                </h2>
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm text-[var(--brand-light)]/70 bg-[var(--dark-800)]/60 border border-[var(--dark-700)]/50 backdrop-blur-sm">
                  {municipality.club_count} resultat
                </span>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {municipality.clubs.map((club) => (
                  <ClubCard key={club.id} club={club} municipalitySlug={municipality.slug} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--brand-light)] mb-4">
                Ungdomsappen expanderar!
              </h2>
              <p className="text-[var(--brand-light)]/70 max-w-md mx-auto mb-8">
                Just nu finns inga anslutna fritidsgårdar i {municipality.name}, men vi växer snabbt. 
                Kontakta din kommun och berätta att du vill se lokala aktiviteter här!
              </p>
              <Link 
                href="/kontakt"
                className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Kontakta oss
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>
      
      {/* Contact Section */}
      {(municipality.email || municipality.phone || municipality.website_link) && (
        <section className="py-16 bg-[var(--dark-800)]/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[var(--dark-800)]/80 backdrop-blur-sm rounded-2xl border border-[var(--dark-700)] p-8">
              <h2 className="text-2xl font-bold text-[var(--brand-light)] mb-6 font-heading">
                Kontakta {municipality.name}
              </h2>
              
              <div className="grid sm:grid-cols-3 gap-6">
                {municipality.email && (
                  <a 
                    href={`mailto:${municipality.email}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-[var(--dark-700)]/50 hover:bg-[var(--dark-700)] transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-pink-400" />
                    </div>
                    <div>
                      <p className="text-sm text-[var(--brand-light)]/60 mb-1">E-post</p>
                      <p className="text-[var(--brand-light)] font-medium break-all">{municipality.email}</p>
                    </div>
                  </a>
                )}
                
                {municipality.phone && (
                  <a 
                    href={`tel:${municipality.phone}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-[var(--dark-700)]/50 hover:bg-[var(--dark-700)] transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[var(--brand-purple)]/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-[var(--brand-purple)]" />
                    </div>
                    <div>
                      <p className="text-sm text-[var(--brand-light)]/60 mb-1">Telefon</p>
                      <p className="text-[var(--brand-light)] font-medium">{municipality.phone}</p>
                    </div>
                  </a>
                )}
                
                {municipality.website_link && (
                  <a 
                    href={municipality.website_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl bg-[var(--dark-700)]/50 hover:bg-[var(--dark-700)] transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center flex-shrink-0">
                      <ExternalLink className="w-6 h-6 text-[var(--brand-primary)]" />
                    </div>
                    <div>
                      <p className="text-sm text-[var(--brand-light)]/60 mb-1">Webbplats</p>
                      <p className="text-[var(--brand-light)] font-medium">Besök hemsida</p>
                    </div>
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--brand-light)] mb-6 font-heading">
            Hitta din närmaste fritidsgård
          </h2>
          <p className="text-xl text-[var(--brand-light)]/70 mb-8 max-w-2xl mx-auto">
            Ladda ner Ungdomsappen och upptäck alla aktiviteter och evenemang i {municipality.name}. Det är helt gratis!
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
              href="/events"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--dark-700)] text-[var(--brand-light)] rounded-xl font-semibold hover:bg-[var(--dark-600)] transition-all border border-[var(--dark-600)]"
            >
              Se alla evenemang
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

