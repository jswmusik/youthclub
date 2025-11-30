'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import NavBar from '@/app/components/NavBar';
import api from '@/lib/api';
import { getMediaUrl } from '@/app/utils';

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
  
  // URL Params
  const query = searchParams.get('q') || '';
  
  // State
  const [clubs, setClubs] = useState<Club[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(false);
  
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
    <div className="min-h-screen bg-gray-100 font-sans">
      <NavBar />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          
          {/* --- LEFT SIDEBAR: FILTERS --- */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                {(selectedMuni) && (
                  <button 
                    onClick={() => setSelectedMuni('')}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Municipality Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Municipality</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {municipalities.map((muni) => (
                    <label key={muni.id} className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input 
                          type="radio" 
                          name="municipality"
                          className="peer h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedMuni === String(muni.id)}
                          onChange={() => setSelectedMuni(String(muni.id))}
                        />
                      </div>
                      <span className={`text-sm ${selectedMuni === String(muni.id) ? 'text-blue-700 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
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
              <h1 className="text-2xl font-bold text-gray-900">Search Results</h1>
              {query && <p className="text-gray-500">Matches for "{query}"</p>}
            </div>

            {loading ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500">Searching clubs...</p>
              </div>
            ) : clubs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">No clubs found</h3>
                <p className="text-gray-500 mt-1">Try adjusting your filters or search term.</p>
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
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col sm:flex-row"
                    >
                      {/* Horizontal Card Layout for Desktop */}
                      
                      {/* Image Side */}
                      <div className="w-full sm:w-48 h-32 sm:h-auto bg-gray-100 relative flex-shrink-0">
                        {heroImageUrl ? (
                          <img src={heroImageUrl} className="w-full h-full object-cover" alt={club.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
                            <span className="text-white font-bold text-2xl">{club.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>

                      {/* Content Side */}
                      <div className="p-4 flex-1 flex flex-col justify-center">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 mb-2">
                            {avatarUrl && (
                              <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover border border-gray-200" alt="" />
                            )}
                            <div>
                              <h3 className="font-bold text-lg text-gray-900 leading-tight">{club.name}</h3>
                              <p className="text-sm text-gray-500">{club.municipality_name}</p>
                            </div>
                          </div>
                          
                          {/* Follow Button Placeholder - Logic handled in Club View usually, but visual cue here */}
                          <div className="hidden sm:block">
                             <span className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-full text-sm font-medium transition">
                               View Club
                             </span>
                          </div>
                        </div>

                        {club.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mt-2">
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
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

