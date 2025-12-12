'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, X, Calendar, User, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const totalPages = Math.ceil(totalCount / 10);

  return (
    <div className="space-y-6">
      
      {/* --- FILTERS BAR --- */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-4 items-end">
            
            {/* Search Input */}
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs font-bold uppercase mb-2">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="Title, excerpt, or author..." 
                  className="pl-9 bg-gray-50 border-0"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Tag Dropdown */}
            <div className="w-full sm:w-48">
              <Label className="text-xs font-bold uppercase mb-2">Tag</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:ring-offset-2"
                value={selectedTag}
                onChange={(e) => { setSelectedTag(e.target.value); setPage(1); }}
              >
                <option value="">All Tags</option>
                {tags.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="w-full sm:w-48">
              <Label className="text-xs font-bold uppercase mb-2">Sort By</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:ring-offset-2"
                value={sortOrder}
                onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
              >
                <option value="-published_at">Newest First</option>
                <option value="published_at">Oldest First</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>

            {/* Clear Button */}
            <Button 
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setSelectedTag(''); setSortOrder('-published_at'); setPage(1); }}
              className="text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* --- ARTICLES LIST --- */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground animate-pulse">Searching archives...</p>
        </div>
      ) : articles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No articles found matching your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {articles.map(article => (
            <Card key={article.id} className="border-none shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col md:flex-row group">
              {/* Image (Left on desktop, Top on mobile) */}
              <div className="md:w-64 h-48 md:h-auto relative flex-shrink-0 bg-[#EBEBFE]/30">
                {article.hero_image ? (
                  <img 
                    src={getMediaUrl(article.hero_image) || ''} 
                    alt={article.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📰</div>
                      <div className="text-sm">No Image</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <CardContent className="p-6 flex flex-col flex-grow">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                  <div className="flex flex-wrap gap-2">
                    {article.tags_details.map(tag => (
                      <Badge key={tag.id} variant="outline" className="bg-[#EBEBFE]/30 text-[#4D4DA4] border-[#4D4DA4]/20 text-xs font-semibold uppercase">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(article.published_at)}</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-[#121213] mb-2 group-hover:text-[#4D4DA4] transition-colors">
                  <Link href={`${basePath}/${article.id}`}>
                    {article.title}
                  </Link>
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-2">
                  {article.excerpt}
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-gray-100 mt-auto gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>By {article.author_name}</span>
                  </div>
                  <Link href={`${basePath}/${article.id}`}>
                    <Button variant="ghost" size="sm" className="text-[#4D4DA4] hover:text-[#FF5485] font-semibold gap-1 h-auto p-0">
                      Read Full Article
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* --- PAGINATION --- */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-bold text-[#121213]">{articles.length}</span> of <span className="font-bold text-[#121213]">{totalCount}</span> articles
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}