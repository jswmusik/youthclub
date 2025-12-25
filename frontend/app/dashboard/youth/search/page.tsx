'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import NavBar from '@/app/components/NavBar';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import api from '@/lib/api';
import { getMediaUrl } from '@/app/utils';
import { X } from 'lucide-react';

// --- Types ---

interface Municipality {
  id: number;
  name: string;
}

interface Club {
  id: number;
  name: string;
  municipality_name: string;
  avatar: string | null;
  hero_image: string | null;
  description: string;
  members_count?: number; // Optional if backend sends it
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // URL Params
  const query = searchParams.get('q') || '';
  
  // State
  const [clubs, setClubs] = useState<Club[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Filters
  const [selectedMuni, setSelectedMuni] = useState<string>('');

  // 1. Load Municipalities for Filter Sidebar
  useEffect(() => {
    const fetchMunis = async () => {
      try {
        const res = await api.get('/municipalities/');
        const data = res.data.results || res.data;
        setMunicipalities(data);
      } catch (err) {
        console.error("Failed to load municipalities", err);
      }
    };
    fetchMunis();
  }, []);

  // 2. Perform Search when Query or Filters change
  useEffect(() => {
    if (query || selectedMuni) {
      performSearch();
    } else {
      setClubs([]);
    }
  }, [query, selectedMuni]);

  const performSearch = async () => {
    setLoading(true);
    try {
      let endpoint = `/clubs/?search=${encodeURIComponent(query)}`;
      if (selectedMuni) {
        endpoint += `&municipality=${selectedMuni}`;
      }
      
      const res = await api.get(endpoint);
      setClubs(res.data.results || res.data);
    } catch (error) {
      console.error("Search failed", error);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--dark-900)] font-sans">
      <NavBar darkMode={true} showBackButton={true} onMenuToggle={() => setIsSidebarOpen(true)} />
      
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/70 z-40 md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      
      {/* Mobile Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen w-64 z-50 bg-[var(--dark-800)] transform transition-transform duration-300 md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 sm:h-16 px-4 border-b border-[var(--dark-500)]">
          <h1 className="text-xl font-bold text-[var(--brand-primary)]">Menu</h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
          <YouthSidebar activePath={pathname} darkMode />
        </div>
      </aside>
      
      <div className="max-w-7xl mx-auto px-4 py-6 pt-16 sm:pt-20">
        <div className="flex flex-col md:flex-row gap-6">
          
          {/* --- LEFT SIDEBAR: FILTERS --- */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-[var(--dark-800)] rounded-lg border border-[var(--dark-600)] p-4 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[var(--brand-light)]">Filters</h2>
                {(selectedMuni) && (
                  <button 
                    onClick={() => setSelectedMuni('')}
                    className="text-xs text-[var(--brand-primary)] hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Municipality Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--brand-light)]/70 mb-2">Municipality</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {municipalities.map((muni) => (
                    <label key={muni.id} className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input 
                          type="radio" 
                          name="municipality"
                          className="peer h-4 w-4 border-[var(--dark-500)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] bg-[var(--dark-700)]"
                          checked={selectedMuni === String(muni.id)}
                          onChange={() => setSelectedMuni(String(muni.id))}
                        />
                      </div>
                      <span className={`text-sm ${selectedMuni === String(muni.id) ? 'text-[var(--brand-primary)] font-medium' : 'text-[var(--brand-light)]/60 group-hover:text-[var(--brand-light)]'}`}>
                        {muni.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN: RESULTS --- */}
          <div className="flex-1">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-[var(--brand-light)]">Search Results</h1>
              {query && <p className="text-[var(--brand-light)]/60">Matches for "{query}"</p>}
            </div>

            {loading ? (
              <div className="bg-[var(--dark-800)] rounded-lg border border-[var(--dark-600)] p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)] mb-4"></div>
                <p className="text-[var(--brand-light)]/60">Searching clubs...</p>
              </div>
            ) : clubs.length === 0 ? (
              <div className="bg-[var(--dark-800)] rounded-lg border border-[var(--dark-600)] p-12 text-center">
                <div className="mx-auto h-12 w-12 bg-[var(--dark-700)] rounded-full flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-[var(--brand-light)]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-[var(--brand-light)]">No clubs found</h3>
                <p className="text-[var(--brand-light)]/60 mt-1">Try adjusting your filters or search term.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {clubs.map((club) => {
                  const heroImageUrl = club.hero_image ? getMediaUrl(club.hero_image) : null;
                  const avatarUrl = club.avatar ? getMediaUrl(club.avatar) : null;

                  return (
                    <div 
                      key={club.id}
                      onClick={() => router.push(`/dashboard/youth/club/${club.id}`)}
                      className="bg-[var(--dark-800)] rounded-lg border border-[var(--dark-600)] overflow-hidden hover:border-[var(--brand-primary)]/30 transition-all cursor-pointer flex flex-col sm:flex-row"
                    >
                      {/* Horizontal Card Layout for Desktop */}
                      
                      {/* Image Side */}
                      <div className="w-full sm:w-48 h-32 sm:h-auto bg-[var(--dark-700)] relative flex-shrink-0">
                        {heroImageUrl ? (
                          <img src={heroImageUrl} className="w-full h-full object-cover" alt={club.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)]">
                            <span className="text-white font-bold text-2xl">{club.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>

                      {/* Content Side */}
                      <div className="p-4 flex-1 flex flex-col justify-center">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 mb-2">
                            {avatarUrl && (
                              <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover border border-[var(--dark-500)]" alt="" />
                            )}
                            <div>
                              <h3 className="font-bold text-lg text-[var(--brand-light)] leading-tight">{club.name}</h3>
                              <p className="text-sm text-[var(--brand-light)]/60">{club.municipality_name}</p>
                            </div>
                          </div>
                          
                          {/* Follow Button Placeholder - Logic handled in Club View usually, but visual cue here */}
                          <div className="hidden sm:block">
                             <span className="text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/20 px-4 py-1.5 rounded-full text-sm font-medium transition">
                               View Club
                             </span>
                          </div>
                        </div>

                        {club.description && (
                          <p className="text-sm text-[var(--brand-light)]/70 line-clamp-2 mt-2">
                            {club.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)]">
        <NavBar darkMode={true} showBackButton={true} onMenuToggle={() => setIsSidebarOpen(true)} />
        <div className="max-w-7xl mx-auto px-4 py-8 pt-16 sm:pt-20">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)] mb-4"></div>
            <p className="text-[var(--brand-light)]/60">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
