'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowRight, Calendar, User, Newspaper, Star, Archive, Sparkles } from 'lucide-react';
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

interface NewsFeedProps {
  basePath: string;
}

export default function NewsFeed({ basePath }: NewsFeedProps) {
  const t = useTranslations('newsFeed');
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

  const getAuthorInitials = (name: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)]">
        <div className="sm:max-w-6xl sm:mx-auto sm:px-6 py-4 sm:py-8">
          {/* Hero Skeleton */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] h-64 sm:h-80 md:h-96 animate-pulse mb-8" />
          
          {/* Section Header Skeleton */}
          <div className="flex items-center justify-between mb-6 px-4 sm:px-0">
            <div className="h-8 w-48 bg-[var(--dark-700)] rounded-lg animate-pulse" />
            <div className="h-8 w-32 bg-[var(--dark-700)] rounded-lg animate-pulse" />
          </div>

          {/* Articles Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-4 sm:px-0">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
                <div className="h-48 bg-[var(--dark-700)] animate-pulse" />
                <div className="p-6 space-y-3">
                  <div className="h-4 w-20 bg-[var(--dark-700)] rounded animate-pulse" />
                  <div className="h-6 w-full bg-[var(--dark-700)] rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-[var(--dark-700)] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="sm:max-w-6xl sm:mx-auto sm:px-6 py-4 sm:py-8">
        
        {/* --- HERO SECTION --- */}
        {hero && (
          <div className="relative rounded-none sm:rounded-2xl overflow-hidden mb-8 group">
            {/* Hero Image */}
            <div className="relative w-full h-64 sm:h-80 md:h-[28rem]">
              {hero.hero_image ? (
                <img 
                  src={getMediaUrl(hero.hero_image) || ''} 
                  alt={hero.title} 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)]" />
              )}
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-900)] via-[var(--dark-900)]/60 to-transparent" />

              {/* Hero Badge */}
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--brand-peach)] text-[var(--dark-900)] text-xs font-bold uppercase">
                  <Star className="w-3.5 h-3.5" />
                  {t('featured')}
                </span>
              </div>

              {/* Hero Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {hero.tags_details.map(tag => (
                    <span 
                      key={tag.id} 
                      className="px-3 py-1 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-xs font-semibold border border-[var(--brand-primary)]/30 backdrop-blur-sm"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
                  {hero.title}
                </h2>

                {/* Excerpt */}
                <p className="text-[var(--brand-light)]/70 text-base sm:text-lg mb-4 line-clamp-2 max-w-3xl">
                  {hero.excerpt}
                </p>

                {/* Meta & CTA */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Link href={`${basePath}/${hero.id}`}>
                    <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all">
                      {t('readArticle')}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <div className="flex items-center gap-3 text-[var(--brand-light)]/60 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-[var(--dark-900)] text-xs font-bold">
                        {getAuthorInitials(hero.author_name)}
                      </div>
                      <span>{hero.author_name}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(hero.published_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- RECENT NEWS SECTION --- */}
        <section>
          {/* Section Header */}
          <div className="flex items-center justify-between mb-6 px-4 sm:px-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)]">{t('recentStories.title')}</h3>
                <p className="text-sm text-[var(--brand-light)]/50">{t('recentStories.description')}</p>
              </div>
            </div>
            <Link 
              href={`${basePath}/archive`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
            >
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline">{t('viewArchive')}</span>
            </Link>
          </div>

          {/* Articles Grid */}
          {articles.length === 0 ? (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-12 text-center">
              <Newspaper className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-4" />
              <p className="text-[var(--brand-light)]/50 mb-2">{t('noRecentNews')}</p>
              <p className="text-sm text-[var(--brand-light)]/30">{t('checkBackLater')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-4 sm:px-0">
              {articles.map(article => (
                <Link 
                  key={article.id} 
                  href={`${basePath}/${article.id}`}
                  className="group"
                >
                  <div className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden hover:border-[var(--brand-primary)]/30 transition-all h-full flex flex-col">
                    {/* Article Image */}
                    <div className="h-48 overflow-hidden relative bg-[var(--dark-700)]">
                      {article.hero_image ? (
                        <img 
                          src={getMediaUrl(article.hero_image) || ''} 
                          alt={article.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <Newspaper className="w-10 h-10 text-[var(--brand-light)]/20 mx-auto mb-2" />
                            <span className="text-xs text-[var(--brand-light)]/30">{t('noImage')}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Article Content */}
                    <div className="p-5 flex flex-col flex-grow">
                      {/* Tags */}
                      {article.tags_details.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {article.tags_details.slice(0, 2).map(tag => (
                            <span 
                              key={tag.id} 
                              className="px-2.5 py-1 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-medium"
                            >
                              #{tag.name}
                            </span>
                          ))}
                          {article.tags_details.length > 2 && (
                            <span className="px-2.5 py-1 rounded-full bg-[var(--dark-600)] text-[var(--brand-light)]/50 text-xs">
                              +{article.tags_details.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Title */}
                      <h4 className="text-lg font-bold text-[var(--brand-light)] mb-2 line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors">
                        {article.title}
                      </h4>

                      {/* Excerpt */}
                      <p className="text-[var(--brand-light)]/60 text-sm mb-4 line-clamp-2 flex-grow">
                        {article.excerpt}
                      </p>
                      
                      {/* Footer */}
                      <div className="pt-4 border-t border-[var(--dark-600)] flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 text-xs text-[var(--brand-light)]/50">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(article.published_at)}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[var(--brand-primary)] text-sm font-medium group-hover:gap-2 transition-all">
                          {t('read')}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
