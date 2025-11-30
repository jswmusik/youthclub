'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import NavBar from '@/app/components/NavBar';
import api from '@/lib/api';
import { getMediaUrl } from '@/app/utils';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query) {
      performSearch();
    } else {
      setClubs([]);
    }
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      // The backend ClubViewSet already supports ?search=...
      const res = await api.get(`/clubs/?search=${encodeURIComponent(query)}`);
      setClubs(res.data.results || res.data);
    } catch (error) {
      console.error("Search failed", error);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Search Results</h1>
        {query && (
          <p className="text-gray-600 mb-6">for "{query}"</p>
        )}
        
        {!query ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-500">Enter a search term to find clubs</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">Searching...</p>
          </div>
        ) : clubs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">No clubs found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club) => {
              const heroImageUrl = club.hero_image ? getMediaUrl(club.hero_image) : null;
              const avatarUrl = club.avatar ? getMediaUrl(club.avatar) : null;

              return (
                <div 
                  key={club.id}
                  onClick={() => router.push(`/dashboard/youth/club/${club.id}`)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="h-40 bg-gray-200 relative">
                    {heroImageUrl ? (
                      <img 
                        src={heroImageUrl} 
                        className="w-full h-full object-cover" 
                        alt={club.name}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-600">
                        <span className="text-white font-bold text-3xl">
                          {club.name?.charAt(0)?.toUpperCase() || 'C'}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition duration-300" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt={club.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-200">
                          <span className="text-blue-600 font-bold text-sm">
                            {club.name?.charAt(0)?.toUpperCase() || 'C'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1 truncate">{club.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{club.municipality_name}</p>
                      </div>
                    </div>
                    {club.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-2">{club.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

