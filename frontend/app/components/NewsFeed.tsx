'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

interface Tag {
  id: number;
  name: string;
  slug: string;
}

interface Article {
  id: number;
  title: string;
  excerpt: string;
  hero_image: string | null;
  author_name: string;
  published_at: string;
  tags_details: Tag[];
}

// New Interface for Props
interface NewsFeedProps {
  basePath: string; // e.g., "/admin/super/news-feed" or "/dashboard/youth/news"
}

export default function NewsFeed({ basePath }: NewsFeedProps) {
  const [hero, setHero] = useState<Article | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [heroRes, listRes] = await Promise.all([
          api.get('/news/hero/?published_only=true'),
          api.get('/news/?exclude_hero=true&published_only=true&page_size=10')
        ]);

        setHero(heroRes.data || null);
        const listData = Array.isArray(listRes.data) ? listRes.data : listRes.data.results;
        setArticles(listData || []);
      } catch (err) {
        console.error('Failed to load news', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading latest news...</div>;
  }

  return (
    <div className="space-y-12">
      
      {/* --- HERO SECTION --- */}
      {hero && hero.hero_image && (
        <section className="relative group rounded-3xl overflow-hidden shadow-xl bg-gray-900 aspect-[16/9] md:aspect-[21/9]">
          <img 
            src={getMediaUrl(hero.hero_image) || ''} 
            alt={hero.title} 
            className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          <div className="absolute bottom-0 left-0 p-8 md:p-12 max-w-4xl">
            <div className="flex flex-wrap gap-2 mb-4">
              {hero.tags_details.map(tag => (
                <span key={tag.id} className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  {tag.name}
                </span>
              ))}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight text-shadow-sm">
              {hero.title}
            </h2>
            <p className="text-gray-200 text-lg md:text-xl mb-6 line-clamp-2">
              {hero.excerpt}
            </p>
            <div className="flex items-center gap-4">
              <Link 
                // UPDATED LINK
                href={`${basePath}/${hero.id}`} 
                className="bg-white text-gray-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition shadow-lg"
              >
                Read Full Article
              </Link>
              <span className="text-gray-400 text-sm font-medium hidden md:inline-block">
                {formatDate(hero.published_at)} • By {hero.author_name}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* --- RECENT NEWS GRID --- */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">Recent Stories</h3>
          <Link href={`${basePath}/archive`} className="text-blue-600 font-semibold hover:underline">
            View Archive →
          </Link>
        </div>

        {articles.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
            No recent news available.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map(article => (
              <article key={article.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition flex flex-col h-full">
                <div className="h-48 overflow-hidden relative bg-gray-100">
                  {article.hero_image ? (
                    <img 
                      src={getMediaUrl(article.hero_image) || ''} 
                      alt={article.title} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {article.tags_details.map(tag => (
                      <span key={tag.id} className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                  
                  <h4 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{article.title}</h4>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">{article.excerpt}</p>
                  
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
                    <span className="text-xs text-gray-500 font-medium">{formatDate(article.published_at)}</span>
                    <Link 
                      // UPDATED LINK
                      href={`${basePath}/${article.id}`} 
                      className="text-sm font-bold text-blue-600 hover:text-blue-800"
                    >
                      Read More &rarr;
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}