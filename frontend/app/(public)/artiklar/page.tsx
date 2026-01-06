'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FileText, 
  Search, 
  ChevronRight,
  Calendar,
  ArrowRight,
  X
} from 'lucide-react';

// Types
interface Article {
  id: number;
  slug: string;
  title: string;
  target_keyword: number | null;
  target_keyword_text: string | null;
  target_audience: string;
  status: string;
  published_at: string;
}

// API fetch function
async function fetchArticles(): Promise<Article[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/seo/public/articles/`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return [];
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

// Audience label helper
function getAudienceLabel(audience: string): string {
  switch (audience) {
    case 'YOUTH': return 'För ungdomar';
    case 'GUARDIAN': return 'För föräldrar';
    case 'MUNICIPALITY': return 'För kommuner';
    default: return 'Allmänt';
  }
}

// Audience color helper
function getAudienceColor(audience: string): string {
  switch (audience) {
    case 'YOUTH': return 'bg-[var(--brand-primary)]';
    case 'GUARDIAN': return 'bg-green-500';
    case 'MUNICIPALITY': return 'bg-blue-500';
    default: return 'bg-gray-500';
  }
}

export default function ArtiklerPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadArticles() {
      setLoading(true);
      const data = await fetchArticles();
      setArticles(data);
      setLoading(false);
    }
    loadArticles();
  }, []);
  
  // Filter articles
  const filteredArticles = articles.filter(article => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!article.title.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (selectedAudience && article.target_audience !== selectedAudience) {
      return false;
    }
    return true;
  });
  
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--brand-primary)]/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[var(--brand-primary)]/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[var(--brand-light)]/60 mb-8">
            <Link href="/" className="hover:text-[var(--brand-primary)] transition-colors">Hem</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[var(--brand-light)]">Artiklar</span>
          </nav>
          
          {/* Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-4 py-2 rounded-full text-sm font-medium mb-6">
              <FileText className="w-4 h-4" />
              Kunskap & inspiration
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold text-[var(--brand-light)] mb-6 font-heading">
              Artiklar om ungdomsverksamhet
            </h1>
            
            <p className="text-xl text-[var(--brand-light)]/70 max-w-2xl mx-auto">
              Läs mer om fritidsgårdar, ungdomsverksamhet och hur Ungdomsappen kan hjälpa dig.
            </p>
          </div>
          
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--brand-light)]/40" />
              <input
                type="text"
                placeholder="Sök artiklar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[var(--dark-800)]/50 backdrop-blur-sm border border-[var(--dark-700)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:outline-none focus:border-[var(--brand-primary)]/50 transition-colors"
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
            
            <select
              value={selectedAudience || ''}
              onChange={(e) => setSelectedAudience(e.target.value || null)}
              className="px-4 py-3 bg-[var(--dark-800)]/50 backdrop-blur-sm border border-[var(--dark-700)] rounded-xl text-[var(--brand-light)] focus:outline-none focus:border-[var(--brand-primary)]/50 transition-colors"
            >
              <option value="">Alla målgrupper</option>
              <option value="YOUTH">För ungdomar</option>
              <option value="GUARDIAN">För föräldrar</option>
              <option value="MUNICIPALITY">För kommuner</option>
            </select>
          </div>
        </div>
      </section>
      
      {/* Articles List */}
      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <span className="text-[var(--brand-light)]/60 animate-pulse">Laddar artiklar...</span>
              </div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--dark-800)] flex items-center justify-center">
                <FileText className="w-8 h-8 text-[var(--brand-light)]/40" />
              </div>
              <p className="text-[var(--brand-light)]/60 mb-2">
                {searchQuery || selectedAudience
                  ? 'Inga artiklar matchade din sökning'
                  : 'Inga artiklar publicerade ännu'}
              </p>
              {(searchQuery || selectedAudience) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedAudience(null);
                  }}
                  className="text-[var(--brand-primary)] hover:underline text-sm"
                >
                  Rensa filter
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/artiklar/${article.slug}`}
                  className="group block bg-[var(--dark-800)]/50 backdrop-blur-sm border border-[var(--dark-700)] rounded-2xl p-6 hover:border-[var(--brand-primary)]/50 transition-all duration-300"
                >
                  <div className="flex items-start gap-6">
                    <div className="hidden sm:block w-20 h-20 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex-shrink-0 flex items-center justify-center">
                      <FileText className="w-10 h-10 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full text-white ${getAudienceColor(article.target_audience)}`}>
                          {getAudienceLabel(article.target_audience)}
                        </span>
                        {article.published_at && (
                          <span className="text-xs text-[var(--brand-light)]/40 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(article.published_at).toLocaleDateString('sv-SE')}
                          </span>
                        )}
                      </div>
                      
                      <h2 className="text-xl font-semibold text-[var(--brand-light)] group-hover:text-[var(--brand-primary)] transition-colors mb-2">
                        {article.title}
                      </h2>
                      
                      {article.target_keyword_text && (
                        <p className="text-sm text-[var(--brand-light)]/60">
                          Nyckelord: {article.target_keyword_text}
                        </p>
                      )}
                    </div>
                    
                    <ArrowRight className="w-5 h-5 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] transition-colors flex-shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}





