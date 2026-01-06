// frontend/app/admin/super/seo/articles/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FileSearch, Plus, Pencil, Trash2, Search, X, Loader2,
  Eye, Sparkles, ExternalLink, ArrowLeft, Check, Users, Building2, User,
  Image as ImageIcon, Upload, RefreshCw, Wand2
} from 'lucide-react';
import { seoApi } from '@/lib/seo-api';
import { SEOArticle, Keyword } from '@/types/seo';
import { useToast } from '@/hooks/useToast';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { AdminLanguageSelector, LanguageBadge } from '../../../components/LanguageSelector';
import { locales } from '../../../../../i18n/config';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-[var(--dark-600)] rounded ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite, pulse 2s infinite'
      }}
    />
  );
}

const STATUS_OPTIONS = [
  { value: 'IDEA', label: 'Idé', color: 'var(--brand-light)' },
  { value: 'DRAFTING', label: 'Skrivs', color: 'var(--brand-blue)' },
  { value: 'REVIEW', label: 'Granskning', color: 'var(--brand-peach)' },
  { value: 'PUBLISHED', label: 'Publicerad', color: 'var(--brand-green)' },
  { value: 'ARCHIVED', label: 'Arkiverad', color: 'var(--brand-light)' },
];

const AUDIENCE_OPTIONS = [
  { value: 'YOUTH', label: 'Ungdomar', icon: User, color: 'var(--brand-primary)' },
  { value: 'GUARDIAN', label: 'Vårdnadshavare', icon: Users, color: 'var(--brand-green)' },
  { value: 'MUNICIPALITY', label: 'Kommuner', icon: Building2, color: 'var(--brand-blue)' },
];

export default function ArticlesPage() {
  const [currentLanguage, setCurrentLanguage] = useState<string>('sv');
  const [articles, setArticles] = useState<SEOArticle[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [audienceFilter, setAudienceFilter] = useState<string>('');
  const [articleToDelete, setArticleToDelete] = useState<SEOArticle | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<SEOArticle | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [generatingImage, setGeneratingImage] = useState<number | null>(null);
  const [publishing, setPublishing] = useState<number | null>(null);
  const { success, error } = useToast();

  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
  };
  
  // Image management state
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageModalArticle, setImageModalArticle] = useState<SEOArticle | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState({
    target_keyword: '',
    target_audience: 'YOUTH',
    title: '',
    h1_title: '',
    meta_description: '',
    excerpt: '',
    content: '',
    og_title: '',
    og_description: '',
    featured_image: '' as string | null,
    featured_image_alt: '',
  });

  const fetchArticles = async () => {
    try {
      const params: Record<string, string> = { lang: currentLanguage };
      if (statusFilter) params.status = statusFilter;
      if (audienceFilter) params.target_audience = audienceFilter;
      if (searchInput) params.search = searchInput;
      
      const data = await seoApi.getArticles(params);
      setArticles(data.results || []);
    } catch (err) {
      console.error('Failed to fetch articles:', err);
      error('Kunde inte ladda artiklar');
    } finally {
      setLoading(false);
    }
  };

  const fetchKeywords = async () => {
    try {
      const data = await seoApi.getKeywords({ status: 'ACTIVE', lang: currentLanguage });
      setKeywords(data.results || []);
    } catch (err) {
      console.error('Failed to fetch keywords:', err);
    }
  };

  useEffect(() => {
    fetchArticles();
    fetchKeywords();
  }, [statusFilter, audienceFilter, currentLanguage]);

  const handleSave = async () => {
    if (!form.title) {
      error('Ange en titel');
      return;
    }
    
    setSaving(true);
    try {
      const data = {
        target_keyword: form.target_keyword ? parseInt(form.target_keyword) : null,
        target_audience: form.target_audience,
        title: form.title,
        h1_title: form.h1_title || form.title,
        meta_description: form.meta_description,
        excerpt: form.excerpt,
        content: form.content,
        og_title: form.og_title,
        og_description: form.og_description,
        slug: editingArticle?.slug || generateSlug(form.title),
        status: editingArticle?.status || 'IDEA',
        language: currentLanguage, // Include the selected language
      };
      
      if (editingArticle) {
        await seoApi.updateArticle(editingArticle.id, data);
        success('Artikel uppdaterad');
      } else {
        await seoApi.createArticle(data);
        success('Artikel skapad');
      }
      
      resetForm();
      fetchArticles();
    } catch (err) {
      console.error('Failed to save article:', err);
      error('Kunde inte spara artikel');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDraft = async (article: SEOArticle) => {
    setGenerating(article.id);
    try {
      await seoApi.generateArticleDraft(article.slug);
      success('Innehåll genererat! Granska och publicera.');
      fetchArticles();
    } catch (err) {
      console.error('Failed to generate draft:', err);
      error('Kunde inte generera innehåll');
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateImage = async (article: SEOArticle, prompt?: string) => {
    setGeneratingImage(article.id);
    try {
      const result = await seoApi.generateArticleImage(article.slug, prompt);
      success('Bild genererad!');
      
      // Refresh articles list
      const data = await seoApi.getArticles({});
      const updatedArticles = data.results || [];
      setArticles(updatedArticles);
      
      // Update modal with fresh data if it's open
      if (showImageModal && imageModalArticle?.id === article.id) {
        const updatedArticle = updatedArticles.find((a: SEOArticle) => a.id === article.id);
        if (updatedArticle) {
          setImageModalArticle(updatedArticle);
        }
      }
    } catch (err) {
      console.error('Failed to generate image:', err);
      error('Kunde inte generera bild');
    } finally {
      setGeneratingImage(null);
      setCustomPrompt('');
    }
  };

  const handleDeleteImage = async () => {
    if (!imageModalArticle) return;
    setDeletingImage(true);
    try {
      await seoApi.deleteArticleImage(imageModalArticle.slug);
      success('Bild raderad');
      
      // Refresh articles list
      const data = await seoApi.getArticles({});
      const updatedArticles = data.results || [];
      setArticles(updatedArticles);
      
      // Update modal with fresh data
      const updatedArticle = updatedArticles.find((a: SEOArticle) => a.id === imageModalArticle.id);
      if (updatedArticle) {
        setImageModalArticle(updatedArticle);
      }
    } catch (err) {
      console.error('Failed to delete image:', err);
      error('Kunde inte radera bild');
    } finally {
      setDeletingImage(false);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!imageModalArticle || !e.target.files?.[0]) return;
    setUploadingImage(true);
    try {
      const file = e.target.files[0];
      await seoApi.uploadArticleImage(imageModalArticle.slug, file, imageModalArticle.title);
      success('Bild uppladdad');
      
      // Refresh articles list
      const data = await seoApi.getArticles({});
      const updatedArticles = data.results || [];
      setArticles(updatedArticles);
      
      // Update modal with fresh data
      const updatedArticle = updatedArticles.find((a: SEOArticle) => a.id === imageModalArticle.id);
      if (updatedArticle) {
        setImageModalArticle(updatedArticle);
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      error('Kunde inte ladda upp bild');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateImageAlt = async (altText: string) => {
    if (!imageModalArticle) return;
    try {
      await seoApi.updateArticleImageAlt(imageModalArticle.slug, altText);
      success('Alt-text uppdaterad');
      fetchArticles();
    } catch (err) {
      console.error('Failed to update alt text:', err);
      error('Kunde inte uppdatera alt-text');
    }
  };

  const handlePublish = async (article: SEOArticle) => {
    setPublishing(article.id);
    try {
      await seoApi.publishArticle(article.slug);
      success('Artikel publicerad!');
      fetchArticles();
    } catch (err) {
      console.error('Failed to publish article:', err);
      error('Kunde inte publicera artikel');
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = async () => {
    if (!articleToDelete) return;
    try {
      await seoApi.deleteArticle(articleToDelete.slug);
      success('Artikel raderad');
      fetchArticles();
    } catch (err) {
      console.error('Failed to delete article:', err);
      error('Kunde inte radera artikel');
    } finally {
      setArticleToDelete(null);
    }
  };

  const startEdit = (article: SEOArticle) => {
    setEditingArticle(article);
    const keywordId = typeof article.target_keyword === 'object' ? article.target_keyword?.id : article.target_keyword;
    
    setForm({
      target_keyword: keywordId?.toString() || '',
      target_audience: article.target_audience || 'YOUTH',
      title: article.title,
      h1_title: article.h1_title || '',
      meta_description: article.meta_description || '',
      excerpt: article.excerpt || '',
      content: article.content || '',
      og_title: article.og_title || '',
      og_description: article.og_description || '',
      featured_image: article.featured_image || null,
      featured_image_alt: article.featured_image_alt || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingArticle(null);
    setForm({
      target_keyword: '',
      target_audience: 'YOUTH',
      title: '',
      h1_title: '',
      meta_description: '',
      excerpt: '',
      content: '',
      og_title: '',
      og_description: '',
      featured_image: null,
      featured_image_alt: '',
    });
  };

  const openImageModal = (article: SEOArticle) => {
    setImageModalArticle(article);
    setShowImageModal(true);
    setCustomPrompt('');
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const getStatusStyle = (status: string) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return option ? { backgroundColor: `${option.color}20`, color: option.color } : {};
  };

  const getAudienceOption = (audience: string) => {
    return AUDIENCE_OPTIONS.find(o => o.value === audience);
  };

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-8 px-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
          <div>
            <Link href="/admin/super/seo" className="inline-flex items-center text-sm text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Tillbaka till SEO
            </Link>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
                <FileSearch className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">SEO-artiklar</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">
              Skapa nyckelordsoptimerade artiklar för olika målgrupper
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AdminLanguageSelector
              currentLanguage={currentLanguage}
              onLanguageChange={handleLanguageChange}
              languages={locales as unknown as string[]}
              variant="dropdown"
            />
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all"
            >
              <Plus className="w-4 h-4" />
              Skapa artikel
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 px-4 sm:px-0">
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Totalt</span>
            <div className="text-2xl font-bold text-[var(--brand-purple)]">{articles.length}</div>
          </div>
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Publicerade</span>
            <div className="text-2xl font-bold text-[var(--brand-green)]">
              {articles.filter(a => a.status === 'PUBLISHED').length}
            </div>
          </div>
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Ungdomar</span>
            <div className="text-2xl font-bold text-[var(--brand-primary)]">
              {articles.filter(a => a.target_audience === 'YOUTH').length}
            </div>
          </div>
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Vårdnadshavare</span>
            <div className="text-2xl font-bold text-[var(--brand-green)]">
              {articles.filter(a => a.target_audience === 'GUARDIAN').length}
            </div>
          </div>
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Kommuner</span>
            <div className="text-2xl font-bold text-[var(--brand-blue)]">
              {articles.filter(a => a.target_audience === 'MUNICIPALITY').length}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-0">
          <div className="flex-1 bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] px-4 py-3 flex items-center gap-3">
            <Search className="h-5 w-5 text-[var(--brand-light)]/40 flex-shrink-0" />
            <input 
              type="text"
              placeholder="Sök artiklar..."
              className="flex-1 bg-transparent text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none text-base"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button 
                onClick={() => setSearchInput('')}
                className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl px-4 py-3 text-[var(--brand-light)] outline-none"
          >
            <option value="">Alla status</option>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={audienceFilter}
            onChange={e => setAudienceFilter(e.target.value)}
            className="bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl px-4 py-3 text-[var(--brand-light)] outline-none"
          >
            <option value="">Alla målgrupper</option>
            {AUDIENCE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Articles List */}
        {loading ? (
          <div className="space-y-3 px-4 sm:px-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] mx-4 sm:mx-0">
            <FileSearch className="w-12 h-12 mx-auto text-[var(--brand-light)]/20 mb-4" />
            <p className="text-[var(--brand-light)]/50 mb-2">
              Inga artiklar ännu
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="text-[var(--brand-primary)] hover:underline text-sm font-medium"
            >
              Skapa din första artikel
            </button>
          </div>
        ) : (
          <div className="space-y-3 px-4 sm:px-0">
            {articles.filter(a => 
              (a.title || '').toLowerCase().includes(searchInput.toLowerCase())
            ).map((article) => {
              const audienceOpt = getAudienceOption(article.target_audience);
              const AudienceIcon = audienceOpt?.icon || User;
              
              return (
                <div
                  key={article.id}
                  className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4 hover:border-[var(--dark-500)] transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Image thumbnail */}
                    <div className="flex gap-4 items-start">
                      <button
                        onClick={() => openImageModal(article)}
                        className="relative w-20 h-20 rounded-lg overflow-hidden bg-[var(--dark-700)] flex-shrink-0 group cursor-pointer border-2 border-[var(--dark-500)] hover:border-[var(--brand-primary)] transition-colors"
                        title="Hantera bild"
                      >
                        {article.featured_image ? (
                          <>
                            <Image
                              src={article.featured_image.startsWith('http') ? article.featured_image : `${API_URL}${article.featured_image}`}
                              alt={article.featured_image_alt || article.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--brand-light)]/30 group-hover:text-[var(--brand-primary)] transition-colors">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-[var(--brand-light)]">{article.title}</h3>
                          <span 
                            className="px-2 py-0.5 text-xs rounded-full font-medium"
                            style={getStatusStyle(article.status)}
                          >
                            {STATUS_OPTIONS.find(o => o.value === article.status)?.label}
                          </span>
                          <span 
                            className="px-2 py-0.5 text-xs rounded-full font-medium flex items-center gap-1"
                            style={{ backgroundColor: `${audienceOpt?.color}20`, color: audienceOpt?.color }}
                          >
                            <AudienceIcon className="w-3 h-3" />
                            {audienceOpt?.label}
                          </span>
                          {article.ai_draft && (
                            <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              AI-genererad
                            </span>
                          )}
                          {article.featured_image && (
                            <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              Bild
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--brand-light)]/50 line-clamp-1 mb-1">{article.excerpt || article.meta_description || 'Ingen beskrivning'}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--brand-light)]/50">
                          <span>/{article.slug}</span>
                          {article.published_at && (
                            <span>Publicerad: {new Date(article.published_at).toLocaleDateString('sv-SE')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Generate Content Button */}
                      {(article.status === 'IDEA' || article.status === 'DRAFTING' || !article.content) && (
                        <button
                          onClick={() => handleGenerateDraft(article)}
                          disabled={generating === article.id}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] hover:bg-[var(--brand-purple)]/30 transition-all text-sm font-medium disabled:opacity-50"
                          title="Generera AI-innehåll"
                        >
                          {generating === article.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">Generera</span>
                        </button>
                      )}
                      
                      {/* Publish Button - show for non-published articles */}
                      {article.status !== 'PUBLISHED' && article.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => handlePublish(article)}
                          disabled={publishing === article.id}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--brand-green)]/20 text-[var(--brand-green)] hover:bg-[var(--brand-green)]/30 transition-all text-sm font-medium disabled:opacity-50"
                        >
                          {publishing === article.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">Publicera</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => startEdit(article)}
                        className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-all flex items-center justify-center"
                        title="Redigera"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      
                      {article.status === 'PUBLISHED' && (
                        <Link
                          href={`/artiklar/${article.slug}`}
                          target="_blank"
                          className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/20 transition-all flex items-center justify-center"
                          title="Visa artikel"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                      
                      <button
                        onClick={() => setArticleToDelete(article)}
                        className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20 transition-all flex items-center justify-center"
                        title="Radera"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
            <div className="bg-[var(--dark-800)] rounded-2xl w-full max-w-4xl border border-[var(--dark-600)] overflow-hidden my-8">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--dark-600)]">
                <h3 className="text-lg font-semibold text-[var(--brand-light)]">
                  {editingArticle ? 'Redigera artikel' : 'Skapa artikel'}
                </h3>
                <button 
                  onClick={resetForm}
                  className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors p-2 rounded-lg hover:bg-[var(--dark-700)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Målgrupp *</label>
                    <select
                      value={form.target_audience}
                      onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors"
                    >
                      {AUDIENCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Mål-nyckelord</label>
                    <select
                      value={form.target_keyword}
                      onChange={(e) => setForm({ ...form, target_keyword: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors"
                    >
                      <option value="">Välj nyckelord...</option>
                      {keywords.map(kw => (
                        <option key={kw.id} value={kw.id}>{kw.keyword}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SEO Fields */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-[var(--brand-light)] uppercase tracking-wider">SEO</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Titel (SEO) *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      maxLength={70}
                      className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                      placeholder="Max 70 tecken för sökmotorer"
                    />
                    <p className="text-xs text-[var(--brand-light)]/40 mt-1">{form.title.length}/70 tecken</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">H1 Titel (Rubrik på sidan)</label>
                    <input
                      type="text"
                      value={form.h1_title}
                      onChange={(e) => setForm({ ...form, h1_title: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                      placeholder="Kan skilja sig från SEO-titeln"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Meta Description</label>
                    <textarea
                      value={form.meta_description}
                      onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                      rows={2}
                      maxLength={160}
                      className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                      placeholder="Kort beskrivning för sökmotorer (max 160 tecken)"
                    />
                    <p className="text-xs text-[var(--brand-light)]/40 mt-1">{form.meta_description.length}/160 tecken</p>
                  </div>
                </div>

                {/* Content Fields */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-[var(--brand-light)] uppercase tracking-wider">Innehåll</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Excerpt (Sammanfattning)</label>
                    <textarea
                      value={form.excerpt}
                      onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                      rows={2}
                      maxLength={300}
                      className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                      placeholder="Kort sammanfattning för listningar"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Artikelinnehåll</label>
                    <textarea
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      rows={12}
                      className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none font-mono text-sm"
                      placeholder="Artikelns innehåll (Markdown stöds). Kan genereras av AI efter att artikeln skapats."
                    />
                  </div>
                </div>

                {/* Open Graph */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-[var(--brand-light)] uppercase tracking-wider">Open Graph (Social Media)</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">OG Titel</label>
                      <input
                        type="text"
                        value={form.og_title}
                        onChange={(e) => setForm({ ...form, og_title: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                        placeholder="Titel för sociala medier"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">OG Beskrivning</label>
                      <input
                        type="text"
                        value={form.og_description}
                        onChange={(e) => setForm({ ...form, og_description: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                        placeholder="Beskrivning för sociala medier"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                <button
                  onClick={resetForm}
                  className="px-4 py-2.5 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] rounded-xl transition-all font-medium"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title}
                  className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-2.5 transition-all disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingArticle ? 'Spara ändringar' : 'Skapa artikel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Management Modal */}
        {showImageModal && imageModalArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="bg-[var(--dark-800)] rounded-2xl w-full max-w-2xl border border-[var(--dark-600)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--dark-600)]">
                <h3 className="text-lg font-semibold text-[var(--brand-light)]">
                  Hantera bild - {imageModalArticle.title}
                </h3>
                <button 
                  onClick={() => { setShowImageModal(false); setImageModalArticle(null); setCustomPrompt(''); }}
                  className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors p-2 rounded-lg hover:bg-[var(--dark-700)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Current Image Preview */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-[var(--dark-700)] border-2 border-[var(--dark-500)]">
                  {imageModalArticle.featured_image ? (
                    <Image
                      src={imageModalArticle.featured_image.startsWith('http') ? imageModalArticle.featured_image : `${API_URL}${imageModalArticle.featured_image}`}
                      alt={imageModalArticle.featured_image_alt || imageModalArticle.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--brand-light)]/30">
                      <ImageIcon className="w-16 h-16 mb-2" />
                      <span>Ingen bild</span>
                    </div>
                  )}
                </div>

                {/* Alt Text */}
                {imageModalArticle.featured_image && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Alt-text</label>
                    <div className="flex gap-2">
                      <input
                        key={`alt-${imageModalArticle.id}-${imageModalArticle.featured_image_alt}`}
                        type="text"
                        defaultValue={imageModalArticle.featured_image_alt}
                        onBlur={(e) => handleUpdateImageAlt(e.target.value)}
                        className="flex-1 px-4 py-2 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-lg text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                        placeholder="Beskrivning av bilden"
                      />
                    </div>
                  </div>
                )}

                {/* Custom Prompt for AI Generation */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    Anpassad prompt för AI-generering (valfritt)
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                    placeholder="Beskriv bilden du vill ha, eller lämna tomt för automatisk generering baserat på artikelns innehåll"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleGenerateImage(imageModalArticle, customPrompt || undefined)}
                    disabled={generatingImage === imageModalArticle.id}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand-purple)] text-white font-medium hover:bg-[var(--brand-purple)]/90 transition-all disabled:opacity-50"
                  >
                    {generatingImage === imageModalArticle.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    {imageModalArticle.featured_image ? 'Generera ny bild' : 'Generera bild'}
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand-blue)] text-white font-medium hover:bg-[var(--brand-blue)]/90 transition-all disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Ladda upp bild
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadImage}
                    className="hidden"
                  />

                  {imageModalArticle.featured_image && (
                    <button
                      onClick={handleDeleteImage}
                      disabled={deletingImage}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand-red)]/20 text-[var(--brand-red)] font-medium hover:bg-[var(--brand-red)]/30 transition-all disabled:opacity-50"
                    >
                      {deletingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Radera bild
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        <ConfirmationModal
          isVisible={!!articleToDelete}
          onClose={() => setArticleToDelete(null)}
          onConfirm={handleDelete}
          title="Radera artikel"
          message={`Är du säker på att du vill radera "${articleToDelete?.title}"?`}
          confirmButtonText="Radera"
          cancelButtonText="Avbryt"
          variant="danger"
          darkMode={true}
        />
      </div>
    </div>
  );
}
