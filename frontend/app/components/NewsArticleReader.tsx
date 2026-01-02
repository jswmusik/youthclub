'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Calendar, FileText, Tag, Star, Newspaper, ArrowLeft } from 'lucide-react';
import api from '../../lib/api';
import { sanitizeHtml } from '../../lib/sanitize';
import { getMediaUrl } from '../../app/utils';
import BackButton from './BackButton';

interface NewsArticleReaderProps {
  articleId: string;
  backLink: string;
}

export default function NewsArticleReader({ articleId, backLink }: NewsArticleReaderProps) {
  const t = useTranslations('newsArticleReader');
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await api.get(`/news/${articleId}/`);
        setArticle(res.data);
      } catch (err: any) {
        setError(t('accessDenied'));
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--brand-light)]/60">{t('loading')}</p>
        </div>
      </div>
    );
  }
  
  if (error || !article) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-[var(--brand-red)] mx-auto mb-4" />
          <p className="text-[var(--brand-light)] font-semibold mb-2">{error || t('articleNotFound')}</p>
          <BackButton href={backLink} translationKey="backToFeed" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="sm:max-w-4xl sm:mx-auto sm:px-6 py-4 sm:py-8">
        
        {/* Navigation Header */}
        <div className="px-4 sm:px-0 mb-6">
          <BackButton href={backLink} translationKey="backToFeed" />
        </div>

        {/* Hero Image Section */}
        {article.hero_image && (
          <div className="relative w-full h-48 sm:h-64 md:h-80 rounded-none sm:rounded-2xl overflow-hidden">
            <img 
              src={getMediaUrl(article.hero_image) || ''} 
              alt={article.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-900)] via-[var(--dark-900)]/40 to-transparent" />
            
            {/* Hero Badge */}
            {article.is_hero && (
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--brand-peach)] text-[var(--dark-900)] text-xs font-bold uppercase">
                  <Star className="w-3.5 h-3.5" />
                  {t('featured')}
                </span>
              </div>
            )}

            {/* Title on Hero */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
                {article.title}
              </h1>
            </div>
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mt-6">
          
          {/* Title (when no hero image) */}
          {!article.hero_image && (
            <div className="px-4 sm:px-6 pt-6 sm:pt-8">
              <div className="flex items-start gap-3 mb-2">
                {article.is_hero && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--brand-peach)] text-[var(--dark-900)] text-xs font-bold uppercase flex-shrink-0">
                    <Star className="w-3.5 h-3.5" />
                    {t('featured')}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--brand-light)] leading-tight">
                {article.title}
              </h1>
            </div>
          )}

          {/* Meta Data */}
          <div className="px-4 sm:px-6 py-6 border-b border-[var(--dark-600)]">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Author */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center text-white font-bold text-sm">
                  {getAuthorInitials(article.author_name || '')}
                </div>
                <div>
                  <p className="font-medium text-[var(--brand-light)] text-sm">{article.author_name}</p>
                  <p className="text-xs text-[var(--brand-light)]/50">{t('author')}</p>
                </div>
              </div>

              <span className="hidden sm:block w-px h-8 bg-[var(--dark-600)]" />

              {/* Date */}
              <div className="flex items-center gap-2 text-[var(--brand-light)]/60 text-sm">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(article.published_at || article.created_at)}</span>
              </div>
            </div>

            {/* Tags */}
            {article.tags_details && article.tags_details.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {article.tags_details.map((tag: any) => (
                  <span 
                    key={tag.id} 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-xs font-medium border border-[var(--brand-primary)]/30"
                  >
                    <Tag className="w-3 h-3" />
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Excerpt */}
          {article.excerpt && (
            <div className="px-4 sm:px-6 py-6 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
              <p className="text-[var(--brand-light)]/80 text-lg leading-relaxed italic">
                "{article.excerpt}"
              </p>
            </div>
          )}

          {/* Rich Text Content */}
          <div className="px-4 sm:px-6 py-6 sm:py-8">
            <div 
              className="article-content prose prose-invert max-w-none text-[var(--brand-light)]/80
                [&_*]:!text-[var(--brand-light)]
                [&_*]:!bg-transparent
                [&_h1]:text-2xl [&_h1]:sm:text-3xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:!text-[var(--brand-light)]
                [&_h2]:text-xl [&_h2]:sm:text-2xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-4 [&_h2]:!text-[var(--brand-light)]
                [&_h3]:text-lg [&_h3]:sm:text-xl [&_h3]:font-bold [&_h3]:mt-5 [&_h3]:mb-3 [&_h3]:!text-[var(--brand-light)]
                [&_h4]:text-base [&_h4]:sm:text-lg [&_h4]:font-bold [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:!text-[var(--brand-light)]
                [&_p]:leading-relaxed [&_p]:mb-4 [&_p]:!text-[var(--brand-light)]/80
                [&_span]:!text-[var(--brand-light)]/80
                [&_a]:!text-[var(--brand-primary)] [&_a]:no-underline [&_a]:hover:!text-[var(--brand-pink)] [&_a]:hover:underline [&_a]:transition-colors
                [&_strong]:font-bold [&_strong]:!text-[var(--brand-light)]
                [&_b]:font-bold [&_b]:!text-[var(--brand-light)]
                [&_em]:italic [&_em]:!text-[var(--brand-light)]/80
                [&_ul]:list-disc [&_ul]:list-inside [&_ul]:mb-4 [&_ul]:space-y-2 [&_ul]:pl-4 [&_ul]:!text-[var(--brand-light)]/80
                [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:mb-4 [&_ol]:space-y-2 [&_ol]:pl-4 [&_ol]:!text-[var(--brand-light)]/80
                [&_li]:mb-1 [&_li]:!text-[var(--brand-light)]/80
                [&_blockquote]:border-l-4 [&_blockquote]:!border-l-[var(--brand-primary)] [&_blockquote]:!bg-[var(--dark-700)] [&_blockquote]:py-3 [&_blockquote]:px-4 [&_blockquote]:rounded-r-xl [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:!text-[var(--brand-light)]/70
                [&_code]:!text-[var(--brand-primary)] [&_code]:!bg-[var(--dark-700)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
                [&_pre]:!bg-[var(--dark-900)] [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:text-sm [&_pre]:border [&_pre]:border-[var(--dark-600)]
                [&_pre_code]:!bg-transparent [&_pre_code]:p-0
                [&_img]:rounded-xl [&_img]:my-4 [&_img]:w-full [&_img]:h-auto [&_img]:max-w-full
                [&_hr]:border-[var(--dark-600)] [&_hr]:my-6 [&_hr]:border-t
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-sm
                [&_th]:!bg-[var(--dark-700)] [&_th]:!text-[var(--brand-light)] [&_th]:font-semibold [&_th]:p-3 [&_th]:border [&_th]:border-[var(--dark-600)] [&_th]:text-left
                [&_td]:p-3 [&_td]:border [&_td]:border-[var(--dark-600)] [&_td]:!text-[var(--brand-light)]/80"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }} 
            />
          </div>
        </div>

        {/* Related Articles Prompt */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mt-6 mb-6">
          <div className="p-6 text-center">
            <Newspaper className="w-10 h-10 text-[var(--brand-light)]/20 mx-auto mb-3" />
            <p className="text-[var(--brand-light)]/60 mb-4">{t('wantToReadMore')}</p>
            <Link 
              href={backLink}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-purple)] transition-all text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('backToNewsFeed')}
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
