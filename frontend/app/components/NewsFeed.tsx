'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, User } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading latest news...</div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      
      {/* --- HERO SECTION --- */}
      {hero && hero.hero_image && (
        <Card className="border-none shadow-sm overflow-hidden !p-0 relative group">
          <div className="relative w-full h-64 sm:h-80 md:h-96 bg-gradient-to-r from-[#4D4DA4] via-[#4D4DA4]/80 to-[#FF5485]">
            <img 
              src={getMediaUrl(hero.hero_image) || ''} 
              alt={hero.title} 
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-12 max-w-4xl">
              <div className="flex flex-wrap gap-2 mb-4">
                {hero.tags_details.map(tag => (
                  <Badge key={tag.id} className="bg-[#4D4DA4] text-white border-none text-xs font-bold uppercase tracking-wide">
                    {tag.name}
                  </Badge>
                ))}
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                {hero.title}
              </h2>
              <p className="text-gray-200 text-base sm:text-lg md:text-xl mb-6 line-clamp-2">
                {hero.excerpt}
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link href={`${basePath}/${hero.id}`}>
                  <Button className="bg-white text-[#121213] hover:bg-gray-100 font-bold shadow-lg">
                    Read Full Article
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(hero.published_at)}</span>
                  <span className="hidden sm:inline">•</span>
                  <User className="h-4 w-4 hidden sm:inline" />
                  <span className="hidden sm:inline">{hero.author_name}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* --- RECENT NEWS GRID --- */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold tracking-tight text-[#121213]">Recent Stories</h3>
          <Link href={`${basePath}/archive`}>
            <Button variant="ghost" className="text-[#4D4DA4] hover:text-[#FF5485] font-semibold gap-2">
              View Archive
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {articles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No recent news available.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(article => (
              <Card key={article.id} className="border-none shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full group">
                <div className="h-48 overflow-hidden relative bg-[#EBEBFE]/30">
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

                <CardContent className="p-6 flex flex-col flex-grow">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {article.tags_details.map(tag => (
                      <Badge key={tag.id} variant="outline" className="bg-[#EBEBFE]/30 text-[#4D4DA4] border-[#4D4DA4]/20 text-xs font-semibold">
                        #{tag.name}
                      </Badge>
                    ))}
                  </div>
                  
                  <h4 className="text-xl font-bold text-[#121213] mb-2 line-clamp-2 group-hover:text-[#4D4DA4] transition-colors">{article.title}</h4>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">{article.excerpt}</p>
                  
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(article.published_at)}</span>
                    </div>
                    <Link href={`${basePath}/${article.id}`}>
                      <Button variant="ghost" size="sm" className="text-[#4D4DA4] hover:text-[#FF5485] font-semibold gap-1 h-auto p-0">
                        Read More
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}