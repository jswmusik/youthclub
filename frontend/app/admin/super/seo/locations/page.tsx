// frontend/app/admin/super/seo/locations/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Map, MapPinned, Search, X, ArrowLeft, Building2, Users,
  ExternalLink, Plus, Filter, ChevronRight
} from 'lucide-react';
import { seoApi } from '@/lib/seo-api';
import { SwedishLocation } from '@/types/seo';
import { useToast } from '@/hooks/useToast';
import { AdminLanguageSelector, LanguageBadge } from '../../../components/LanguageSelector';
import { locales } from '../../../../../i18n/config';

function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-[var(--dark-600)] rounded ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite, pulse 2s infinite'
      }}
    />
  );
}

const LOCATION_TYPE_OPTIONS = [
  { value: 'MUNICIPALITY', label: 'Kommun', color: 'var(--brand-primary)' },
  { value: 'CITY', label: 'Stad/Ort', color: 'var(--brand-blue)' },
  { value: 'REGION', label: 'Region/Län', color: 'var(--brand-purple)' },
];

const REGIONS = [
  'Blekinge län', 'Dalarnas län', 'Gotlands län', 'Gävleborgs län',
  'Hallands län', 'Jämtlands län', 'Jönköpings län', 'Kalmar län',
  'Kronobergs län', 'Norrbottens län', 'Skåne län', 'Stockholms län',
  'Södermanlands län', 'Uppsala län', 'Värmlands län', 'Västerbottens län',
  'Västernorrlands län', 'Västmanlands län', 'Västra Götalands län',
  'Örebro län', 'Östergötlands län'
];

export default function LocationsPage() {
  const [currentLanguage, setCurrentLanguage] = useState<string>('sv');
  const [locations, setLocations] = useState<SwedishLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { error } = useToast();

  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
  };

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: 50, lang: currentLanguage };
      if (typeFilter) params.type = typeFilter;
      if (regionFilter) params.region = regionFilter;
      if (searchInput) params.search = searchInput;
      
      const data = await seoApi.getLocations(params);
      setLocations(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
      error('Kunde inte ladda platser');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [page, typeFilter, regionFilter, currentLanguage]);

  const handleSearch = () => {
    setPage(1);
    fetchLocations();
  };

  const getTypeStyle = (type: string) => {
    const option = LOCATION_TYPE_OPTIONS.find(o => o.value === type);
    return option ? { backgroundColor: `${option.color}20`, color: option.color } : {};
  };

  // Group locations by region for display
  const locationsByRegion = locations.reduce((acc, loc) => {
    const region = loc.region || 'Övriga';
    if (!acc[region]) acc[region] = [];
    acc[region].push(loc);
    return acc;
  }, {} as Record<string, SwedishLocation[]>);

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-8 px-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
          <div>
            <Link href="/admin/super/seo" className="inline-flex items-center text-sm text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Tillbaka till SEO
            </Link>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                <Map className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Platser</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">
              Kommuner och städer för lokal SEO
            </p>
          </div>
          <AdminLanguageSelector
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
            languages={locales as unknown as string[]}
            variant="dropdown"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-0">
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Totalt platser</span>
            <div className="text-2xl font-bold text-[var(--brand-blue)]">{totalCount}</div>
          </div>
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Kommuner</span>
            <div className="text-2xl font-bold text-[var(--brand-primary)]">
              {locations.filter(l => l.location_type === 'MUNICIPALITY').length}
            </div>
          </div>
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Med landningssida</span>
            <div className="text-2xl font-bold text-[var(--brand-green)]">
              {locations.filter(l => l.has_landing_page).length}
            </div>
          </div>
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Länkade kommuner</span>
            <div className="text-2xl font-bold text-[var(--brand-purple)]">
              {locations.filter(l => l.linked_municipality).length}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 px-4 sm:px-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] px-4 py-3 flex items-center gap-3">
              <Search className="h-5 w-5 text-[var(--brand-light)]/40 flex-shrink-0" />
              <input 
                type="text"
                placeholder="Sök kommun eller stad..."
                className="flex-1 bg-transparent text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none text-base"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              {searchInput && (
                <button 
                  onClick={() => { setSearchInput(''); handleSearch(); }}
                  className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all"
            >
              Sök
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
              className="bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-lg px-3 py-2 text-sm text-[var(--brand-light)] outline-none"
            >
              <option value="">Alla typer</option>
              {LOCATION_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            <select
              value={regionFilter}
              onChange={e => { setRegionFilter(e.target.value); setPage(1); }}
              className="bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-lg px-3 py-2 text-sm text-[var(--brand-light)] outline-none"
            >
              <option value="">Alla län</option>
              {REGIONS.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <div className="px-4 sm:px-0">
            <p className="text-sm text-[var(--brand-light)]/50">
              Visar <span className="text-[var(--brand-primary)] font-semibold">{locations.length}</span> av{' '}
              <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> platser
            </p>
          </div>
        )}

        {/* Locations List */}
        {loading ? (
          <div className="space-y-3 px-4 sm:px-0">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-16 bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] mx-4 sm:mx-0">
            <Map className="w-12 h-12 mx-auto text-[var(--brand-light)]/20 mb-4" />
            <p className="text-[var(--brand-light)]/50 mb-2">
              Inga platser hittades
            </p>
          </div>
        ) : regionFilter ? (
          // Show flat list when filtered by region
          <div className="space-y-2 px-4 sm:px-0">
            {locations.map((location) => (
              <LocationCard key={location.id} location={location} />
            ))}
          </div>
        ) : (
          // Group by region when showing all
          <div className="space-y-6 px-4 sm:px-0">
            {Object.entries(locationsByRegion).sort().map(([region, regionLocations]) => (
              <div key={region}>
                <h2 className="text-lg font-semibold text-[var(--brand-light)] mb-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[var(--brand-primary)]" />
                  {region}
                  <span className="text-sm font-normal text-[var(--brand-light)]/50">
                    ({regionLocations.length} platser)
                  </span>
                </h2>
                <div className="space-y-2">
                  {regionLocations.sort((a, b) => a.name.localeCompare(b.name)).map((location) => (
                    <LocationCard key={location.id} location={location} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalCount > 50 && (
          <div className="flex justify-center gap-2 px-4 sm:px-0">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-[var(--dark-700)] text-[var(--brand-light)] rounded-lg disabled:opacity-50"
            >
              Föregående
            </button>
            <span className="px-4 py-2 text-[var(--brand-light)]">
              Sida {page} av {Math.ceil(totalCount / 50)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(totalCount / 50)}
              className="px-4 py-2 bg-[var(--dark-700)] text-[var(--brand-light)] rounded-lg disabled:opacity-50"
            >
              Nästa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LocationCard({ location }: { location: SwedishLocation }) {
  const getTypeStyle = (type: string) => {
    const colors: Record<string, string> = {
      'MUNICIPALITY': 'var(--brand-primary)',
      'CITY': 'var(--brand-blue)',
      'REGION': 'var(--brand-purple)',
    };
    const color = colors[type] || 'var(--brand-light)';
    return { backgroundColor: `${color}20`, color };
  };

  return (
    <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4 hover:border-[var(--dark-500)] transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-[var(--brand-light)]">{location.name}</h3>
            <span 
              className="px-2 py-0.5 text-xs rounded-full font-medium"
              style={getTypeStyle(location.location_type)}
            >
              {location.location_type === 'MUNICIPALITY' ? 'Kommun' : 
               location.location_type === 'CITY' ? 'Stad' : 'Region'}
            </span>
            {location.has_landing_page && (
              <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-[var(--brand-green)]/20 text-[var(--brand-green)]">
                Har landningssida
              </span>
            )}
            {location.linked_municipality && (
              <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)]">
                Länkad
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--brand-light)]/50">
            <span>{location.region}</span>
            {location.population && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {location.population.toLocaleString()} inv.
              </span>
            )}
            <span>/{location.slug}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/admin/super/seo/local-pages?location=${location.id}`}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/70 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Skapa sida</span>
          </Link>
          <Link
            href={`/kommun/${location.slug}`}
            target="_blank"
            className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/20 transition-all flex items-center justify-center"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

