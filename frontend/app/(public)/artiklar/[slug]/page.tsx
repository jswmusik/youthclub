'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FileText, 
  Calendar,
  User,
  ChevronRight,
  ArrowLeft,
  Share2,
  Copy,
  Check
} from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ungdomsappen.se';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Simple markdown to HTML converter with proper heading structure
function renderMarkdown(content: string): string {
  if (!content) return '';
  
  return content
    // Headers - convert ## to h2, ### to h3
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Unordered lists - collect consecutive list items
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    // Wrap consecutive li elements in ul
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
    // Paragraphs - wrap text blocks that aren't already HTML
    .split('\n\n')
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      // Don't wrap if already HTML tag
      if (trimmed.startsWith('<')) return trimmed;
      // Wrap in paragraph
      return `<p>${trimmed}</p>`;
    })
    .join('\n')
    // Clean up newlines inside paragraphs
    .replace(/<p>(.*?)\n(.*?)<\/p>/gs, '<p>$1 $2</p>')
    // Clean up empty paragraphs
    .replace(/<p>\s*<\/p>/g, '');
}

// Types
interface ArticleData {
  id: number;
  slug: string;
  title: string;
  meta_description: string;
  h1_title: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  featured_image_alt: string;
  og_title: string;
  og_description: string;
  schema_type: string;
  author_name: string;
  author_title: string;
  published_at: string;
  related_articles?: RelatedArticle[];
}

interface RelatedArticle {
  id: number;
  slug: string;
  title: string;
  target_keyword_text: string | null;
  target_audience: string;
  published_at: string;
}

// API fetch function
async function fetchArticle(slug: string): Promise<ArticleData | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/seo/public/article/${slug}/`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

export default function ArticlePage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    async function loadArticle() {
      setLoading(true);
      const data = await fetchArticle(slug);
      if (data) {
        setArticle(data);
      } else {
        setError('Artikeln kunde inte hittas');
      }
      setLoading(false);
    }
    
    if (slug) {
      loadArticle();
    }
  }, [slug]);
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <span className="text-[var(--brand-light)]/60 animate-pulse">Laddar artikel...</span>
        </div>
      </div>
    );
  }
  
  if (error || !article) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--brand-light)] mb-4">Artikeln kunde inte hittas</h1>
          <Link href="/artiklar" className="text-[var(--brand-primary)] hover:underline flex items-center gap-2 justify-center">
            <ArrowLeft className="w-4 h-4" />
            Tillbaka till artiklar
          </Link>
        </div>
      </div>
    );
  }
  
  // Generate JSON-LD Schema for Article
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      // Article
      {
        '@type': 'Article',
        '@id': `${BASE_URL}/artiklar/${article.slug}`,
        headline: article.title,
        description: article.meta_description || article.excerpt,
        image: article.featured_image 
          ? (article.featured_image.startsWith('http') ? article.featured_image : `${API_URL}${article.featured_image}`)
          : `${BASE_URL}/og-default.png`,
        url: `${BASE_URL}/artiklar/${article.slug}`,
        datePublished: article.published_at,
        author: {
          '@type': 'Person',
          name: article.author_name || 'Ungdomsappen',
        },
        publisher: {
          '@type': 'Organization',
          '@id': `${BASE_URL}/#organization`,
          name: 'Ungdomsappen',
          logo: {
            '@type': 'ImageObject',
            url: `${BASE_URL}/logo.png`,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${BASE_URL}/artiklar/${article.slug}`,
        },
      },
      // BreadcrumbList
      {
        '@type': 'BreadcrumbList',
        '@id': `${BASE_URL}/artiklar/${article.slug}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Hem', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'Artiklar', item: `${BASE_URL}/artiklar` },
          { '@type': 'ListItem', position: 3, name: article.title, item: `${BASE_URL}/artiklar/${article.slug}` },
        ],
      },
      // Organization
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#organization`,
        name: 'Ungdomsappen',
        url: BASE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${BASE_URL}/logo.png`,
        },
      },
    ],
  };
  
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />
      
      {/* Header */}
      <section className="relative pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--brand-primary)]/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[var(--brand-primary)]/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[var(--brand-light)]/60 mb-8">
            <Link href="/" className="hover:text-[var(--brand-primary)] transition-colors">Hem</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/artiklar" className="hover:text-[var(--brand-primary)] transition-colors">Artiklar</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[var(--brand-light)] truncate max-w-[200px]">{article.title}</span>
          </nav>
          
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--brand-light)] mb-6 font-heading leading-tight">
            {article.h1_title}
          </h1>
          
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--brand-light)]/60">
            {article.author_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{article.author_name}</span>
                {article.author_title && (
                  <span className="text-[var(--brand-light)]/40">• {article.author_title}</span>
                )}
              </div>
            )}
            {article.published_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <time dateTime={article.published_at}>
                  {new Date(article.published_at).toLocaleDateString('sv-SE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* Featured Image */}
      {article.featured_image && (
        <section className="pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative aspect-[2/1] rounded-2xl overflow-hidden">
              <Image
                src={article.featured_image.startsWith('http') ? article.featured_image : `${API_URL}${article.featured_image}`}
                alt={article.featured_image_alt || article.h1_title}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            </div>
          </div>
        </section>
      )}
      
      {/* Content */}
      <section className="py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-xl text-[var(--brand-light)]/80 mb-8 leading-relaxed">
              {article.excerpt}
            </p>
          )}
          
          {/* Article content */}
          <article 
            className="prose prose-invert prose-lg max-w-none 
              prose-headings:font-heading prose-headings:text-[var(--brand-light)]
              prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-12 prose-h2:mb-4
              prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-[var(--brand-light)]/80 prose-p:leading-relaxed prose-p:mb-4
              prose-a:text-[var(--brand-primary)] prose-a:no-underline hover:prose-a:underline
              prose-strong:text-[var(--brand-light)] prose-strong:font-semibold
              prose-em:text-[var(--brand-light)]/90 prose-em:italic
              prose-ul:text-[var(--brand-light)]/80 prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6
              prose-ol:text-[var(--brand-light)]/80 prose-ol:my-6 prose-ol:list-decimal prose-ol:pl-6
              prose-li:text-[var(--brand-light)]/80 prose-li:my-2 prose-li:marker:text-[var(--brand-primary)]
              prose-blockquote:border-[var(--brand-primary)] prose-blockquote:text-[var(--brand-light)]/70 prose-blockquote:pl-4 prose-blockquote:italic"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
          />
          
          {/* Share section */}
          <div className="mt-12 pt-8 border-t border-[var(--dark-700)]">
            <div className="flex items-center justify-between">
              <span className="text-[var(--brand-light)]/60">Dela denna artikel</span>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--dark-800)] hover:bg-[var(--dark-700)] text-[var(--brand-light)] transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Kopierad!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Kopiera länk</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Related Articles */}
      {article.related_articles && article.related_articles.length > 0 && (
        <section className="py-16 bg-[var(--dark-800)]/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-[var(--brand-light)] mb-8 font-heading">
              Relaterade artiklar
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {article.related_articles.map((related) => (
                <Link
                  key={related.id}
                  href={`/artiklar/${related.slug}`}
                  className="group block bg-[var(--dark-800)]/50 backdrop-blur-sm border border-[var(--dark-700)] rounded-xl p-5 hover:border-[var(--brand-primary)]/50 transition-all duration-300"
                >
                  <h3 className="font-semibold text-[var(--brand-light)] group-hover:text-[var(--brand-primary)] transition-colors mb-2 line-clamp-2">
                    {related.title}
                  </h3>
                  {related.published_at && (
                    <p className="text-sm text-[var(--brand-light)]/40">
                      {new Date(related.published_at).toLocaleDateString('sv-SE')}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* Back link */}
      <section className="py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link 
            href="/artiklar"
            className="inline-flex items-center gap-2 bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold px-6 py-3 rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            Alla artiklar
          </Link>
        </div>
      </section>
    </div>
  );
}

