'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface NewsArticleReaderProps {
  articleId: string;
  backLink: string; // Where the "Back" button goes
}

export default function NewsArticleReader({ articleId, backLink }: NewsArticleReaderProps) {
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await api.get(`/news/${articleId}/`);
        setArticle(res.data);
      } catch (err: any) {
        setError('Article not found or access denied.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (articleId) fetchArticle();
  }, [articleId]);

  const getAuthorInitials = (name: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse text-muted-foreground">Loading article...</div>
    </div>
  );
  
  if (error || !article) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-600 mb-4">{error || 'Article not found.'}</p>
            <Link href={backLink}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center">
        <Link href={backLink}>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Feed
          </Button>
        </Link>
      </div>

      {/* Article Card */}
      <Card className="border-none shadow-sm overflow-hidden !p-0">
        {/* Hero Image */}
        {article.hero_image && (
          <div className="relative w-full h-48 sm:h-64 md:h-96 bg-gradient-to-r from-[#4D4DA4] via-[#4D4DA4]/80 to-[#FF5485]">
            <img 
              src={getMediaUrl(article.hero_image) || ''} 
              alt={article.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-2">
                {article.title}
              </h1>
            </div>
            {article.is_hero && (
              <div className="absolute top-4 right-4">
                <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400 border-none font-bold">
                  HERO ARTICLE
                </Badge>
              </div>
            )}
          </div>
        )}

        <CardContent className="p-4 sm:p-6 md:p-8 lg:p-12 !pt-4 sm:!pt-6 md:!pt-8 lg:!pt-12">
          {/* Title (when no hero image) */}
          {!article.hero_image && (
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#121213] mb-6 sm:mb-8">
              {article.title}
            </h1>
          )}

          {/* Meta Data */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-gray-200 bg-[#EBEBFE]">
                <AvatarFallback className="rounded-full font-bold text-xs sm:text-sm text-[#4D4DA4] bg-[#EBEBFE]">
                  {getAuthorInitials(article.author_name || '')}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-[#121213] text-sm sm:text-base">{article.author_name}</span>
            </div>
            <span className="hidden sm:inline text-gray-400">•</span>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{new Date(article.published_at).toLocaleDateString()}</span>
            </div>
            
            {article.tags_details && article.tags_details.length > 0 && (
              <>
                <span className="hidden md:inline text-gray-400 ml-auto">•</span>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto">
                  {article.tags_details.map((tag: any) => (
                    <Badge key={tag.id} variant="outline" className="bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/20 text-xs uppercase">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Rich Text Content */}
          <div 
            className="rich-text-content text-sm sm:text-base md:text-lg max-w-3xl mx-auto
              [&_h1]:text-3xl [&_h1]:sm:text-4xl [&_h1]:md:text-5xl [&_h1]:font-bold [&_h1]:text-[#121213] [&_h1]:mt-6 [&_h1]:mb-4
              [&_h2]:text-2xl [&_h2]:sm:text-3xl [&_h2]:md:text-4xl [&_h2]:font-bold [&_h2]:text-[#121213] [&_h2]:mt-6 [&_h2]:mb-4
              [&_h3]:text-xl [&_h3]:sm:text-2xl [&_h3]:md:text-3xl [&_h3]:font-bold [&_h3]:text-[#121213] [&_h3]:mt-5 [&_h3]:mb-3
              [&_h4]:text-lg [&_h4]:sm:text-xl [&_h4]:md:text-2xl [&_h4]:font-bold [&_h4]:text-[#121213] [&_h4]:mt-4 [&_h4]:mb-2
              [&_h5]:text-base [&_h5]:sm:text-lg [&_h5]:md:text-xl [&_h5]:font-bold [&_h5]:text-[#121213] [&_h5]:mt-3 [&_h5]:mb-2
              [&_h6]:text-sm [&_h6]:sm:text-base [&_h6]:md:text-lg [&_h6]:font-bold [&_h6]:text-[#121213] [&_h6]:mt-3 [&_h6]:mb-2
              [&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-4 [&_p]:sm:mb-5
              [&_a]:text-[#4D4DA4] [&_a]:no-underline [&_a]:hover:text-[#FF5485] [&_a]:hover:underline [&_a]:transition-colors
              [&_strong]:text-[#121213] [&_strong]:font-bold
              [&_em]:italic [&_em]:text-gray-700
              [&_ul]:list-disc [&_ul]:list-inside [&_ul]:text-gray-700 [&_ul]:mb-4 [&_ul]:space-y-2 [&_ul]:pl-4
              [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:text-gray-700 [&_ol]:mb-4 [&_ol]:space-y-2 [&_ol]:pl-4
              [&_li]:text-gray-700 [&_li]:mb-1
              [&_blockquote]:border-l-4 [&_blockquote]:border-[#4D4DA4] [&_blockquote]:bg-[#EBEBFE]/30 [&_blockquote]:py-2 [&_blockquote]:px-4 [&_blockquote]:rounded-r-lg [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-gray-700
              [&_code]:text-[#4D4DA4] [&_code]:bg-[#EBEBFE] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
              [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:text-sm
              [&_pre_code]:bg-transparent [&_pre_code]:text-gray-100 [&_pre_code]:p-0
              [&_img]:rounded-lg [&_img]:shadow-md [&_img]:my-4 [&_img]:w-full [&_img]:h-auto [&_img]:max-w-full
              [&_hr]:border-gray-200 [&_hr]:my-6 [&_hr]:border-t
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-sm
              [&_th]:bg-[#EBEBFE] [&_th]:text-[#4D4DA4] [&_th]:font-semibold [&_th]:p-2 [&_th]:sm:p-3 [&_th]:border [&_th]:border-gray-200 [&_th]:text-left
              [&_td]:p-2 [&_td]:sm:p-3 [&_td]:border [&_td]:border-gray-200 [&_td]:text-gray-700
              [&_figure]:my-4
              [&_figcaption]:text-sm [&_figcaption]:text-gray-500 [&_figcaption]:mt-2 [&_figcaption]:text-center"
            dangerouslySetInnerHTML={{ __html: article.content }} 
          />
        </CardContent>
      </Card>
    </div>
  );
}