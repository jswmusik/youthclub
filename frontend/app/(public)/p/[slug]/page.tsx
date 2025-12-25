'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { cmsApi } from '@/lib/cms-api';
import { Page, TableOfContentsItem } from '@/types/cms';
import { Loader2, ArrowLeft, ChevronRight, Clock, User, List, X, Facebook, Linkedin, Link2, Check } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { getMediaUrl } from '@/app/utils';
import FeatureShowcase from '@/app/components/cms/FeatureShowcase';

// Helper function to generate TOC from content
function generateTocFromContent(content: string | undefined | null): TableOfContentsItem[] {
  if (!content) return [];
  
  // More robust regex that handles multiline and various HTML attributes
  const headingRegex = /<h([2-3])(?:\s[^>]*)?>([^<]*(?:<(?!\/h[2-3]>)[^<]*)*)<\/h[2-3]>/gi;
  const toc: TableOfContentsItem[] = [];
  let match;
  
  while ((match = headingRegex.exec(content)) !== null) {
    // Remove any HTML tags from the heading text
    const text = match[2]
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    
    if (!text) continue; // Skip empty headings
    
    // Generate a URL-safe anchor
    const anchor = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[åä]/g, 'a')
      .replace(/[ö]/g, 'o')
      .replace(/[éè]/g, 'e')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    if (anchor) {
      toc.push({ title: text, anchor });
    }
  }
  
  return toc;
}

// Helper function to add IDs to headings
function processContentWithIds(content: string | undefined | null, tocItems: TableOfContentsItem[]): string {
  if (!content || tocItems.length === 0) return content || '';
  
  let processed = content;
  let tocIndex = 0;
  
  // Match headings more robustly
  processed = processed.replace(/<h([2-3])(\s[^>]*)?>([^<]*(?:<(?!\/h[2-3]>)[^<]*)*)<\/h[2-3]>/gi, (match, level, attrs = '', text) => {
    if (tocIndex < tocItems.length) {
      const anchor = tocItems[tocIndex].anchor;
      tocIndex++;
      // Check if it already has an id
      if (attrs && attrs.includes('id=')) {
        return match;
      }
      return `<h${level}${attrs} id="${anchor}">${text}</h${level}>`;
    }
    return match;
  });
  
  return processed;
}

export default function DynamicCmsPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [tocIsFixed, setTocIsFixed] = useState(false);
  const [tocLeft, setTocLeft] = useState(0);
  const contentSectionRef = useRef<HTMLDivElement>(null);
  const tocPlaceholderRef = useRef<HTMLDivElement>(null);

  // Compute TOC items from page content (memoized)
  const tocItems = useMemo(() => {
    if (!page?.show_toc) return [];
    // Use manual TOC if provided, otherwise auto-generate
    if (page.table_of_contents && page.table_of_contents.length > 0) {
      return page.table_of_contents;
    }
    return generateTocFromContent(page.content);
  }, [page?.show_toc, page?.table_of_contents, page?.content]);

  const hasToc = page?.show_toc && tocItems.length > 0;

  // Compute processed content with IDs (memoized)
  const processedContent = useMemo(() => {
    if (!hasToc) return page?.content || '';
    return processContentWithIds(page?.content, tocItems);
  }, [hasToc, page?.content, tocItems]);

  // Fetch page data (using public endpoint that only returns published pages)
  useEffect(() => {
    async function load() {
      if (!slug) return;
      try {
        const data = await cmsApi.getPublicPage(Array.isArray(slug) ? slug[0] : slug);
        setPage(data);
        
        if (data) {
          document.title = data.meta_title || data.title || 'Ungdomsappen';
          
          let metaDesc = document.querySelector('meta[name="description"]');
          if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
          }
          metaDesc.setAttribute('content', data.meta_description || '');
          
          updateMetaTag('og:title', data.og_title || data.title);
          updateMetaTag('og:description', data.meta_description || '');
          if (data.og_image) {
            updateMetaTag('og:image', getMediaUrl(data.og_image) || '');
          }
          updateMetaTag('og:type', 'website');
          updateMetaTag('og:url', window.location.href);
          
          updateMetaTag('twitter:card', 'summary_large_image');
          updateMetaTag('twitter:title', data.og_title || data.title);
          updateMetaTag('twitter:description', data.meta_description || '');
          if (data.og_image) {
            updateMetaTag('twitter:image', getMediaUrl(data.og_image) || '');
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  // Track scroll position for TOC highlighting and fixed positioning
  useEffect(() => {
    if (!hasToc || tocItems.length === 0) return;

    const handleScroll = () => {
      // Track active section
      const sections = tocItems.map(item => document.getElementById(item.anchor));
      const scrollPos = window.scrollY + 150;

      sections.forEach((section, index) => {
        if (section) {
          const top = section.offsetTop;
          const bottom = top + section.offsetHeight;
          if (scrollPos >= top && scrollPos < bottom) {
            setActiveSection(tocItems[index].anchor);
          }
        }
      });

      // Handle TOC fixed positioning
      if (contentSectionRef.current && tocPlaceholderRef.current) {
        const contentRect = contentSectionRef.current.getBoundingClientRect();
        const placeholderRect = tocPlaceholderRef.current.getBoundingClientRect();
        const headerOffset = 100; // Space from top when fixed (navbar + gap)
        
        // Get the left position from the placeholder
        setTocLeft(placeholderRect.left);
        
        // Start fixing when content section top reaches header
        const shouldFix = contentRect.top <= headerOffset;
        // Stop fixing when content bottom is near viewport bottom
        const shouldUnfix = contentRect.bottom <= 400;

        if (shouldFix && !shouldUnfix) {
          setTocIsFixed(true);
        } else {
          setTocIsFixed(false);
        }
      }
    };

    // Also handle resize
    const handleResize = () => {
      if (tocPlaceholderRef.current) {
        const placeholderRect = tocPlaceholderRef.current.getBoundingClientRect();
        setTocLeft(placeholderRect.left);
      }
    };

    // Small delay to ensure content is rendered with IDs
    const timer = setTimeout(() => {
      handleScroll();
      handleResize();
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [hasToc, tocItems]);

  function updateMetaTag(property: string, content: string) {
    const isOg = property.startsWith('og:');
    const isTwitter = property.startsWith('twitter:');
    const selector = isOg || isTwitter 
      ? `meta[property="${property}"]` 
      : `meta[name="${property}"]`;
    
    let tag = document.querySelector(selector);
    if (!tag) {
      tag = document.createElement('meta');
      if (isOg || isTwitter) {
        tag.setAttribute('property', property);
      } else {
        tag.setAttribute('name', property);
      }
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(page?.title || '')}`, '_blank');
  };

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <motion.div 
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <p className="text-[var(--brand-light)]/60 text-sm">Laddar innehåll...</p>
        </motion.div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <motion.div 
          className="text-center max-w-md mx-auto px-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-[var(--dark-700)] border border-[var(--dark-500)] flex items-center justify-center">
            <span className="text-4xl">🔍</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--brand-light)] mb-3">
            Sidan hittades inte
          </h1>
          <p className="text-[var(--brand-light)]/60 mb-6">
            Sidan du letar efter finns inte eller har flyttats.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-[var(--dark-900)] font-semibold hover:opacity-90 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Tillbaka till startsidan
          </Link>
        </motion.div>
      </div>
    );
  }

  const heroImageUrl = page.hero_image ? getMediaUrl(page.hero_image) : null;
  const authorImageUrl = page.author_image ? getMediaUrl(page.author_image) : null;
  const isCreativePage = page.page_type === 'creative';
  const hasFeatures = isCreativePage && page.features_data && page.features_data.length > 0;
  
  // Only show hero section with full height if show_hero is true AND there's an actual image
  const hasHeroImage = page.show_hero && heroImageUrl;

  return (
    <article className="min-h-screen bg-[var(--dark-900)]">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": page.title,
            "description": page.ai_description || page.meta_description,
            "url": typeof window !== 'undefined' ? window.location.href : '',
            "dateModified": page.updated_at,
            ...(page.og_image && { "image": getMediaUrl(page.og_image) }),
            ...(page.author_name && { 
              "author": {
                "@type": "Person",
                "name": page.author_name
              }
            }),
          })
        }}
      />

      {/* Hero Section - Full height only when there's a hero image */}
      <div className={`relative flex items-end overflow-hidden ${
        hasHeroImage 
          ? 'min-h-[50vh] md:min-h-[60vh]' 
          : 'pt-20 sm:pt-24'
      }`}>
        {/* Background */}
        {hasHeroImage ? (
          <>
            <motion.img 
              src={heroImageUrl!} 
              alt={page.title}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-900)] via-[var(--dark-900)]/50 to-transparent" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[var(--dark-900)]" />
            {/* Subtle gradient orbs for non-image hero - smaller and less prominent */}
            <motion.div 
              className="absolute top-0 -left-20 w-[300px] h-[300px] rounded-full bg-[var(--brand-primary)]/10 blur-[100px]"
              animate={{ 
                x: [0, 20, 0],
                y: [0, -15, 0],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute top-20 right-0 w-[250px] h-[250px] rounded-full bg-[var(--brand-purple)]/8 blur-[80px]"
              animate={{ 
                x: [0, -15, 0],
                y: [0, 20, 0],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}
        
        {/* Content */}
        <div className={`relative z-10 w-full pb-8 ${hasHeroImage ? 'pt-32' : 'pt-8'}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb - Simple text links, no box */}
            <motion.nav 
              className="flex items-center gap-2 mb-8 text-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Link 
                href="/" 
                className="text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] transition-colors"
              >
                Hem
              </Link>
              <ChevronRight className="w-4 h-4 text-[var(--brand-light)]/40" />
              <span className="text-[var(--brand-light)]">{page.title}</span>
            </motion.nav>
            
            {/* Title - Tilted, boxed in primary color with black text */}
            <motion.div
              className="mb-6 inline-block"
              initial={{ opacity: 0, y: 30, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: -2 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--dark-900)] font-heading leading-[1.1] bg-[var(--brand-primary)] px-6 py-4 inline-block">
                {page.title}
              </h1>
            </motion.div>
            
            {/* Hero Tagline - Below title, darkest color box, white bold text */}
            {page.hero_tagline && (
              <motion.div
                className="mb-8 inline-block"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-lg sm:text-xl font-bold text-[var(--brand-light)] bg-[var(--dark-900)] px-5 py-3">
                  {page.hero_tagline}
                </p>
              </motion.div>
            )}
            
            {/* Meta bar - Author, Date, and Share buttons inline */}
            <motion.div 
              className="flex flex-wrap items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {/* Author */}
              {page.author_name && (
                <div className="flex items-center gap-3">
                  {authorImageUrl ? (
                    <img 
                      src={authorImageUrl} 
                      alt={page.author_name}
                      className="w-10 h-10 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-[var(--brand-primary)] flex items-center justify-center">
                      <User className="w-5 h-5 text-[var(--dark-900)]" />
                    </div>
                  )}
                  <div>
                    <p className="text-[var(--brand-light)] font-medium text-sm">{page.author_name}</p>
                    {page.author_title && (
                      <p className="text-[var(--brand-light)]/50 text-xs">{page.author_title}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Date */}
              {page.updated_at && (
                <div className="flex items-center gap-2 text-[var(--brand-light)]/60 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>
                    {format(new Date(page.updated_at), 'd MMMM yyyy', { locale: sv })}
                  </span>
                </div>
              )}
              
              {/* Share Buttons - All visible inline */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[var(--brand-light)]/50 text-sm mr-1">Dela:</span>
                <button
                  onClick={shareOnTwitter}
                  className="w-9 h-9 flex items-center justify-center bg-[var(--dark-800)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] transition-all"
                  title="Dela på X"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={shareOnFacebook}
                  className="w-9 h-9 flex items-center justify-center bg-[var(--dark-800)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] transition-all"
                  title="Dela på Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </button>
                <button
                  onClick={shareOnLinkedIn}
                  className="w-9 h-9 flex items-center justify-center bg-[var(--dark-800)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] transition-all"
                  title="Dela på LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </button>
                <button
                  onClick={copyLink}
                  className="w-9 h-9 flex items-center justify-center bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90 transition-all"
                  title="Kopiera länk"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative bg-[var(--dark-900)]" ref={contentSectionRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className={`flex gap-12 ${hasToc ? 'lg:flex-row items-start' : ''}`}>
            {/* Table of Contents - Fixed when scrolling */}
            {hasToc && (
              <>
                {/* Placeholder to maintain layout when TOC is fixed */}
                <div ref={tocPlaceholderRef} className="hidden lg:block w-64 flex-shrink-0" />
                
                {/* The actual TOC */}
                <aside 
                  className={`hidden lg:block w-64 z-40 transition-none ${
                    tocIsFixed ? 'fixed' : 'absolute'
                  }`}
                  style={tocIsFixed 
                    ? { top: '100px', left: `${tocLeft}px` } 
                    : { top: '0', left: `${tocLeft}px` }
                  }
                >
                  <motion.div
                    className="max-h-[calc(100vh-6rem)] overflow-y-auto"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[var(--brand-primary)] text-[var(--dark-900)]">
                      <List className="w-4 h-4" />
                      <span className="text-sm font-bold uppercase tracking-wider">Innehåll</span>
                    </div>
                    <nav className="bg-[var(--dark-800)] border border-[var(--dark-600)]">
                      {tocItems.map((item, index) => (
                        <a
                          key={index}
                          href={`#${item.anchor}`}
                          onClick={(e) => {
                            e.preventDefault();
                            const element = document.getElementById(item.anchor);
                            if (element) {
                              const offset = 100;
                              const elementPosition = element.getBoundingClientRect().top + window.scrollY;
                              window.scrollTo({
                                top: elementPosition - offset,
                                behavior: 'smooth'
                              });
                            }
                          }}
                          className={`block py-3 px-4 text-sm transition-all border-l-4 ${
                            activeSection === item.anchor
                              ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                              : 'border-transparent text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]'
                          }`}
                        >
                          {item.title}
                        </a>
                      ))}
                    </nav>
                  </motion.div>
                </aside>
              </>
            )}
            
            {/* Main Content */}
            <motion.div 
              className={`flex-1 ${hasToc ? 'max-w-3xl' : 'max-w-4xl mx-auto'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {processedContent && (
                <div 
                  className="cms-content prose prose-lg max-w-none
                    prose-headings:text-[var(--brand-light)] prose-headings:font-heading prose-headings:font-bold prose-headings:scroll-mt-24
                    prose-h1:text-3xl prose-h1:sm:text-4xl prose-h1:mb-6 prose-h1:mt-12 prose-h1:first:mt-0
                    prose-h2:text-2xl prose-h2:sm:text-3xl prose-h2:mb-5 prose-h2:mt-14
                    prose-h3:text-xl prose-h3:sm:text-2xl prose-h3:mb-4 prose-h3:mt-10 prose-h3:text-[var(--brand-light)]/90
                    prose-p:text-[var(--brand-light)]/75 prose-p:leading-[1.85] prose-p:mb-6 prose-p:text-[17px]
                    prose-a:text-[var(--brand-primary)] prose-a:no-underline prose-a:hover:underline prose-a:font-medium
                    prose-strong:text-[var(--brand-light)] prose-strong:font-semibold
                    prose-em:text-[var(--brand-light)]/85
                    prose-ul:text-[var(--brand-light)]/75 prose-ul:my-6 prose-ul:space-y-2 prose-ul:text-[17px]
                    prose-ol:text-[var(--brand-light)]/75 prose-ol:my-6 prose-ol:space-y-2 prose-ol:text-[17px]
                    prose-li:marker:text-[var(--brand-primary)]
                    prose-blockquote:border-l-4 prose-blockquote:border-[var(--brand-primary)] prose-blockquote:bg-[var(--dark-800)]/50 prose-blockquote:backdrop-blur-sm prose-blockquote:py-5 prose-blockquote:px-6 prose-blockquote:text-[var(--brand-light)]/85 prose-blockquote:not-italic prose-blockquote:my-8
                    prose-code:text-[var(--brand-primary)] prose-code:bg-[var(--dark-800)] prose-code:px-2 prose-code:py-1 prose-code:text-sm
                    prose-pre:bg-[var(--dark-800)] prose-pre:border prose-pre:border-[var(--dark-600)]
                    prose-img:shadow-2xl prose-img:my-10
                    prose-hr:border-[var(--dark-700)] prose-hr:my-14
                    prose-table:border-collapse prose-table:w-full
                    prose-th:bg-[var(--dark-800)] prose-th:text-[var(--brand-light)] prose-th:px-5 prose-th:py-3 prose-th:text-left prose-th:border prose-th:border-[var(--dark-600)]
                    prose-td:px-5 prose-td:py-3 prose-td:border prose-td:border-[var(--dark-700)] prose-td:text-[var(--brand-light)]/75
                  "
                  dangerouslySetInnerHTML={{ __html: processedContent }} 
                />
              )}

              {/* Creative page features */}
              {hasFeatures && (
                <div className="mt-16">
                  <FeatureShowcase 
                    features={page.features_data!} 
                    showTitle={false}
                  />
                </div>
              )}
            </motion.div>
          </div>
        </div>
        
        {/* Back navigation */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/"
              className="inline-flex items-center gap-3 px-6 py-3.5 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold hover:bg-[var(--brand-primary)]/90 transition-all group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Tillbaka till startsidan
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
