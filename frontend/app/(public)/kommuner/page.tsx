'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  MapPin, 
  Search, 
  ChevronRight,
  Building2,
  Users,
  Filter,
  X
} from 'lucide-react';

// Types
interface LocalPage {
  id: number;
  slug: string;
  h1_title: string;
  location: number;
  location_name: string;
  page_type: string;
  target_audience: string;
  status: string;
  published_at: string;
}

interface Region {
  region: string;
  region_code: string;
  count: number;
}

// Swedish regions for filtering
const SWEDISH_REGIONS = [
  "Blekinge län",
  "Dalarnas län",
  "Gotlands län",
  "Gävleborgs län",
  "Hallands län",
  "Jämtlands län",
  "Jönköpings län",
  "Kalmar län",
  "Kronobergs län",
  "Norrbottens län",
  "Skåne län",
  "Stockholms län",
  "Södermanlands län",
  "Uppsala län",
  "Värmlands län",
  "Västerbottens län",
  "Västernorrlands län",
  "Västmanlands län",
  "Västra Götalands län",
  "Örebro län",
  "Östergötlands län",
];

// API fetch function
async function fetchLocalPages(): Promise<LocalPage[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/seo/public/local-pages/`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return [];
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching local pages:', error);
    return [];
  }
}

export default function KommunerPage() {
  const [pages, setPages] = useState<LocalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  useEffect(() => {
    async function loadPages() {
      setLoading(true);
      const data = await fetchLocalPages();
      setPages(data);
      setLoading(false);
    }
    loadPages();
  }, []);
  
  // Group pages by region
  const pagesByRegion = useMemo(() => {
    const grouped: Record<string, LocalPage[]> = {};
    
    pages.forEach(page => {
      // Extract region from location name or use a default grouping
      // For now, we'll group alphabetically by first letter
      const firstLetter = page.location_name.charAt(0).toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(page);
    });
    
    // Sort each group alphabetically
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.location_name.localeCompare(b.location_name, 'sv'));
    });
    
    return grouped;
  }, [pages]);
  
  // Filter pages based on search query
  const filteredPages = useMemo(() => {
    let filtered = pages;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(page => 
        page.location_name.toLowerCase().includes(query) ||
        page.h1_title.toLowerCase().includes(query)
      );
    }
    
    return filtered.sort((a, b) => a.location_name.localeCompare(b.location_name, 'sv'));
  }, [pages, searchQuery]);
  
  // Get all unique first letters for alphabet navigation
  const alphabet = useMemo(() => {
    const letters = new Set<string>();
    pages.forEach(page => {
      letters.add(page.location_name.charAt(0).toUpperCase());
    });
    return Array.from(letters).sort((a, b) => a.localeCompare(b, 'sv'));
  }, [pages]);
  
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--brand-primary)]/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[var(--brand-primary)]/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[var(--brand-light)]/60 mb-8">
            <Link href="/" className="hover:text-[var(--brand-primary)] transition-colors">Hem</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[var(--brand-light)]">Kommuner</span>
          </nav>
          
          {/* Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-4 py-2 rounded-full text-sm font-medium mb-6">
              <MapPin className="w-4 h-4" />
              {pages.length} kommuner
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold text-[var(--brand-light)] mb-6 font-heading">
              Fritidsgårdar i Sverige
            </h1>
            
            <p className="text-xl text-[var(--brand-light)]/70 max-w-2xl mx-auto">
              Hitta ungdomsverksamhet och fritidsgårdar i din kommun. Utforska aktiviteter och evenemang nära dig.
            </p>
          </div>
          
          {/* Search */}
          <div className="max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--brand-light)]/40" />
              <input
                type="text"
                placeholder="Sök kommun..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[var(--dark-800)]/50 backdrop-blur-sm border border-[var(--dark-700)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:outline-none focus:border-[var(--brand-primary)]/50 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Content */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <span className="text-[var(--brand-light)]/60 animate-pulse">Laddar kommuner...</span>
              </div>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[var(--brand-light)]/60">
                {searchQuery 
                  ? `Inga kommuner matchade "${searchQuery}"`
                  : 'Inga kommuner hittades'}
              </p>
            </div>
          ) : (
            <>
              {/* Alphabet Navigation */}
              {!searchQuery && (
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {alphabet.map((letter) => (
                    <a
                      key={letter}
                      href={`#${letter}`}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--dark-800)]/50 border border-[var(--dark-700)] text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/50 transition-colors font-medium"
                    >
                      {letter}
                    </a>
                  ))}
                </div>
              )}
              
              {/* Results */}
              {searchQuery ? (
                // Search results - flat list
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPages.map((page) => (
                    <Link
                      key={page.id}
                      href={`/kommun/${page.slug}`}
                      className="group flex items-center gap-3 p-4 bg-[var(--dark-800)]/50 backdrop-blur-sm border border-[var(--dark-700)] rounded-xl hover:border-[var(--brand-primary)]/50 transition-all duration-300"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[var(--brand-light)] group-hover:text-[var(--brand-primary)] transition-colors truncate">
                          {page.location_name}
                        </h3>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] transition-colors" />
                    </Link>
                  ))}
                </div>
              ) : (
                // Grouped by letter
                <div className="space-y-12">
                  {Object.entries(pagesByRegion)
                    .sort(([a], [b]) => a.localeCompare(b, 'sv'))
                    .map(([letter, letterPages]) => (
                      <div key={letter} id={letter}>
                        <h2 className="text-2xl font-bold text-[var(--brand-light)] mb-4 flex items-center gap-3 font-heading">
                          <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center text-white">
                            {letter}
                          </span>
                          <span className="text-[var(--brand-light)]/40 text-base font-normal">
                            {letterPages.length} {letterPages.length === 1 ? 'kommun' : 'kommuner'}
                          </span>
                        </h2>
                        
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {letterPages.map((page) => (
                            <Link
                              key={page.id}
                              href={`/kommun/${page.slug}`}
                              className="group flex items-center gap-3 p-4 bg-[var(--dark-800)]/50 backdrop-blur-sm border border-[var(--dark-700)] rounded-xl hover:border-[var(--brand-primary)]/50 transition-all duration-300"
                            >
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-[var(--brand-light)] group-hover:text-[var(--brand-primary)] transition-colors">
                                  {page.location_name}
                                </h3>
                              </div>
                              <ChevronRight className="w-5 h-5 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] transition-colors" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-[var(--dark-800)]/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] mb-4 font-heading">
            Hittar du inte din kommun?
          </h2>
          <p className="text-[var(--brand-light)]/70 mb-8 max-w-xl mx-auto">
            Vi expanderar ständigt. Kontakta oss om du vill se Ungdomsappen i din kommun – 
            vi hjälper gärna till att komma igång!
          </p>
          <Link 
            href="/kontakt"
            className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold px-8 py-4 rounded-xl transition-colors"
          >
            Kontakta oss
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}



