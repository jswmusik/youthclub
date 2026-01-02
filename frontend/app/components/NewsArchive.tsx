'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Search, X, Calendar, User, ArrowRight, ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { format } from 'date-fns';
import { enUS, sv, da, nb, fi, type Locale } from 'date-fns/locale';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Map locale codes to date-fns locales
const localeMap: Record<string, Locale> = {
  en: enUS,
  sv: sv,
  da: da,
  nb: nb,
  fi: fi,
};

interface Tag { id: number; name: string; }
interface Article {
  id: number;
  title: string;
  excerpt: string;
  hero_image: string | null;
  author_name: string;
  published_at: string;
  tags_details: Tag[];
}

interface NewsArchiveProps {
  basePath: string; // e.g., "/admin/super/news-feed"
  publishedOnly?: boolean; // If true, only fetch published articles (for non-super-admin views)
}

export default function NewsArchive({ basePath, publishedOnly = false }: NewsArchiveProps) {
  const t = useTranslations('newsArchive');
  const locale = useLocale();
  const dateLocale = localeMap[locale] || enUS;
  
  // Data State
  const [articles, setArticles] = useState<Article[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filter State
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortOrder, setSortOrder] = useState('-published_at'); // Default: Newest first
  const [page, setPage] = useState(1);

  // Load Tags on mount
  useEffect(() => {
    api.get('/news_tags/').then(res => {
      setTags(Array.isArray(res.data) ? res.data : res.data.results || []);
    }).catch(console.error);
  }, []);

  // Fetch Articles whenever filters change
  useEffect(() => {
    fetchArticles();
    // Scroll to top on page change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, selectedTag, sortOrder]); // Search is handled separately to prevent spamming while typing

  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('page_size', '10'); // Requirement: 10 news per list
      params.set('ordering', sortOrder);
      
      if (publishedOnly) params.set('published_only', 'true');
      if (search) params.set('search', search);
      if (selectedTag) params.set('tag', selectedTag);

      const res = await api.get(`/news/?${params.toString()}`);
      
      // Handle backend response (assuming PageNumberPagination)
      if (res.data.results) {
        setArticles(res.data.results);
        setTotalCount(res.data.count);
      } else {
        setArticles(res.data);
        setTotalCount(res.data.length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Search (User must press Enter or click Search to avoid API spam)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to page 1 on new search
    fetchArticles();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'd MMM yyyy', { locale: dateLocale });
    } catch {
      return '-';
    }
  };

  const totalPages = Math.ceil(totalCount / 10);

  return (
    <div className="space-y-6">
      
      {/* --- FILTERS BAR --- */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        <div className="p-4 sm:p-6">
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-4 items-end">
            
            {/* Search Input */}
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs font-bold uppercase mb-2 text-[var(--brand-light)]/70">{t('filters.search')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40" />
                <Input 
                  type="text" 
                  placeholder={t('filters.searchPlaceholder')}
                  className="pl-9 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-0"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Tag Dropdown */}
            <div className="w-full sm:w-48">
              <Label className="text-xs font-bold uppercase mb-2 text-[var(--brand-light)]/70">{t('filters.tag')}</Label>
              <select 
                className="flex h-10 w-full rounded-xl border-2 border-[var(--dark-500)] bg-[var(--dark-700)] px-3 py-2 text-sm text-[var(--brand-light)] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-[var(--brand-primary)] appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1rem'
                }}
                value={selectedTag}
                onChange={(e) => { setSelectedTag(e.target.value); setPage(1); }}
              >
                <option value="">{t('filters.allTags')}</option>
                {tags.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="w-full sm:w-48">
              <Label className="text-xs font-bold uppercase mb-2 text-[var(--brand-light)]/70">{t('filters.sortBy')}</Label>
              <select 
                className="flex h-10 w-full rounded-xl border-2 border-[var(--dark-500)] bg-[var(--dark-700)] px-3 py-2 text-sm text-[var(--brand-light)] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-[var(--brand-primary)] appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1rem'
                }}
                value={sortOrder}
                onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
              >
                <option value="-published_at">{t('filters.newestFirst')}</option>
                <option value="published_at">{t('filters.oldestFirst')}</option>
                <option value="title">{t('filters.titleAZ')}</option>
              </select>
            </div>

            {/* Clear Button */}
            <Button 
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setSelectedTag(''); setSortOrder('-published_at'); setPage(1); }}
              className="text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 gap-2"
            >
              <X className="h-4 w-4" />
              {t('filters.clear')}
            </Button>
          </form>
        </div>
      </div>

      {/* --- ARTICLES LIST --- */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-[var(--brand-light)]/60 animate-pulse">{t('searching')}</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <div className="p-12 text-center">
            <Newspaper className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-4" />
            <p className="text-[var(--brand-light)]/60">{t('noArticlesFound')}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {articles.map(article => (
            <div key={article.id} className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden hover:border-[var(--brand-primary)]/30 transition-all flex flex-col md:flex-row group">
              {/* Image (Left on desktop, Top on mobile) */}
              <div className="md:w-64 h-48 md:h-auto relative flex-shrink-0 bg-[var(--dark-700)]">
                {article.hero_image ? (
                  <img 
                    src={getMediaUrl(article.hero_image) || ''} 
                    alt={article.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-[var(--brand-light)]/30">
                    <div className="text-center">
                      <Newspaper className="w-10 h-10 mx-auto mb-2" />
                      <div className="text-sm">{t('noImage')}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                  <div className="flex flex-wrap gap-2">
                    {article.tags_details.map(tag => (
                      <Badge key={tag.id} variant="outline" className="bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border-[var(--brand-purple)]/30 text-xs font-semibold uppercase">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--brand-light)]/50 whitespace-nowrap">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(article.published_at)}</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-[var(--brand-light)] mb-2 group-hover:text-[var(--brand-primary)] transition-colors">
                  <Link href={`${basePath}/${article.id}`} className="hover:underline">
                    {article.title}
                  </Link>
                </h3>
                
                <p className="text-[var(--brand-light)]/60 text-sm mb-4 flex-grow line-clamp-2">
                  {article.excerpt}
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-[var(--dark-600)] mt-auto gap-3">
                  <div className="flex items-center gap-2 text-xs text-[var(--brand-light)]/50">
                    <User className="h-3 w-3" />
                    <span>{t('byAuthor', { author: article.author_name })}</span>
                  </div>
                  <Link href={`${basePath}/${article.id}`}>
                    <Button variant="ghost" size="sm" className="text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 font-semibold gap-1 h-auto p-0 hover:bg-transparent">
                      {t('readFullArticle')}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- PAGINATION --- */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[var(--dark-600)]">
          <p className="text-sm text-[var(--brand-light)]/60">
            {t('pagination.showing', { count: articles.length, total: totalCount })}
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] border-[var(--dark-500)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('pagination.previous')}
            </Button>
            <div className="text-sm text-[var(--brand-light)]/50">{t('pagination.pageOf', { page, totalPages })}</div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] border-[var(--dark-500)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('pagination.next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}