'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

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
    <div className="max-w-7xl mx-auto pb-12">
      
      {/* --- FILTERS BAR --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-8">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-4 items-end">
          
          {/* Search Input */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Title, excerpt, or author..." 
                className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
              >
                🔍
              </button>
            </div>
          </div>

          {/* Tag Dropdown */}
          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tag</label>
            <select 
              className="w-full border border-gray-300 rounded-lg p-2.5 bg-white"
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
          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sort By</label>
            <select 
              className="w-full border border-gray-300 rounded-lg p-2.5 bg-white"
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
            >
              <option value="-published_at">Newest First</option>
              <option value="published_at">Oldest First</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>

          {/* Clear Button */}
          <button 
            type="button"
            onClick={() => { setSearch(''); setSelectedTag(''); setSortOrder('-published_at'); setPage(1); }}
            className="px-4 py-2.5 text-sm text-gray-600 font-semibold hover:text-red-600 transition"
          >
            Clear
          </button>
        </form>
      </div>

      {/* --- ARTICLES LIST --- */}
      {isLoading ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg animate-pulse">Searching archives...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">No articles found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {articles.map(article => (
            <article key={article.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition flex flex-col md:flex-row">
              {/* Image (Left on desktop, Top on mobile) */}
              <div className="md:w-64 h-48 md:h-auto relative flex-shrink-0 bg-gray-100">
                {article.hero_image ? (
                  <img 
                    src={getMediaUrl(article.hero_image) || ''} 
                    alt={article.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                )}
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-wrap gap-2">
                    {article.tags_details.map(tag => (
                      <span key={tag.id} className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {formatDate(article.published_at)}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  <Link href={`${basePath}/${article.id}`} className="hover:text-blue-600 transition">
                    {article.title}
                  </Link>
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 flex-grow">
                  {article.excerpt}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                  <span className="text-xs text-gray-500 font-medium">By {article.author_name}</span>
                  <Link 
                    href={`${basePath}/${article.id}`} 
                    className="text-sm font-bold text-blue-600 hover:text-blue-800"
                  >
                    Read Full Article &rarr;
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* --- PAGINATION --- */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between mt-8 border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-600">
            Showing <span className="font-bold">{articles.length}</span> of <span className="font-bold">{totalCount}</span> articles
          </p>
          
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}