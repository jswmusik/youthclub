// frontend/app/admin/super/seo/local-pages/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { 
  MapPinned, Plus, Pencil, Trash2, Search, X, Loader2,
  Eye, EyeOff, Sparkles, ExternalLink, ArrowLeft, Check, Image as ImageIcon,
  Upload, RefreshCw, Wand2
} from 'lucide-react';
import { seoApi } from '@/lib/seo-api';
import { LocalLandingPage, SwedishLocation, Keyword } from '@/types/seo';
import { useToast } from '@/hooks/useToast';
import ConfirmationModal from '@/app/components/ConfirmationModal';

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
  { value: 'DRAFT', label: 'Utkast', color: 'var(--brand-light)' },
  { value: 'REVIEW', label: 'Granskning', color: 'var(--brand-peach)' },
  { value: 'PUBLISHED', label: 'Publicerad', color: 'var(--brand-green)' },
  { value: 'ARCHIVED', label: 'Arkiverad', color: 'var(--brand-light)' },
];

export default function LocalPagesPage() {
  const searchParams = useSearchParams();
  const preselectedLocationId = searchParams.get('location');
  
  const [pages, setPages] = useState<LocalLandingPage[]>([]);
  const [locations, setLocations] = useState<SwedishLocation[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pageToDelete, setPageToDelete] = useState<LocalLandingPage | null>(null);
  const [showForm, setShowForm] = useState(!!preselectedLocationId);
  const [editingPage, setEditingPage] = useState<LocalLandingPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [publishing, setPublishing] = useState<number | null>(null);
  const { success, error } = useToast();
  
  const [form, setForm] = useState({
    location: preselectedLocationId || '',
    primary_keyword: '',
    title: '',
    meta_description: '',
    h1_title: '',
    hero_tagline: '',
    intro_content: '',
    main_content: '',
    cta_content: '',
    // SEO Fields
    focus_keyphrase: '',
    // Hero Image
    hero_image: '' as string | null,
    hero_image_alt: '',
    // Open Graph
    og_title: '',
    og_description: '',
    // Twitter Card
    twitter_card: 'summary_large_image',
    twitter_title: '',
    twitter_description: '',
    // Display Options
    show_nearby_clubs: true,
    show_nearby_events: true,
    show_platform_stats: true,
    show_testimonials: true,
  });
  
  // Image management state
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageModalPage, setImageModalPage] = useState<LocalLandingPage | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPages = async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (searchInput) params.search = searchInput;
      
      const data = await seoApi.getLandingPages(params);
      setPages(data.results || []);
    } catch (err) {
      console.error('Failed to fetch pages:', err);
      error('Kunde inte ladda sidor');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const data = await seoApi.getLocations({ page_size: 300 });
      setLocations(data.results || []);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  };

  const fetchKeywords = async () => {
    try {
      const data = await seoApi.getKeywords({ status: 'ACTIVE' });
      setKeywords(data.results || []);
    } catch (err) {
      console.error('Failed to fetch keywords:', err);
    }
  };

  useEffect(() => {
    fetchPages();
    fetchLocations();
    fetchKeywords();
  }, [statusFilter]);

  const handleSave = async () => {
    if (!form.location || !form.title) {
      error('Välj en plats och ange en titel');
      return;
    }
    
    setSaving(true);
    try {
      const data = {
        location: parseInt(form.location),
        primary_keyword: form.primary_keyword ? parseInt(form.primary_keyword) : null,
        title: form.title,
        meta_description: form.meta_description,
        h1_title: form.h1_title || form.title,
        hero_tagline: form.hero_tagline,
        intro_content: form.intro_content,
        main_content: form.main_content,
        cta_content: form.cta_content,
        // SEO Fields
        focus_keyphrase: form.focus_keyphrase,
        // Open Graph
        og_title: form.og_title,
        og_description: form.og_description,
        // Twitter Card
        twitter_card: form.twitter_card,
        twitter_title: form.twitter_title,
        twitter_description: form.twitter_description,
        // Display Options
        show_nearby_clubs: form.show_nearby_clubs,
        show_nearby_events: form.show_nearby_events,
        show_platform_stats: form.show_platform_stats,
        show_testimonials: form.show_testimonials,
        slug: generateSlug(form.title),
      };
      
      if (editingPage) {
        await seoApi.updateLandingPage(editingPage.slug, data);
        success('Sida uppdaterad');
      } else {
        await seoApi.createLandingPage(data);
        success('Sida skapad');
      }
      
      resetForm();
      fetchPages();
    } catch (err) {
      console.error('Failed to save page:', err);
      error('Kunde inte spara sida');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateContent = async (page: LocalLandingPage) => {
    setGenerating(page.id);
    try {
      await seoApi.generateLandingPageContent(page.slug);
      success('Innehåll genererat! Granska och publicera.');
      fetchPages();
    } catch (err) {
      console.error('Failed to generate content:', err);
      error('Kunde inte generera innehåll');
    } finally {
      setGenerating(null);
    }
  };

  const [generatingImage, setGeneratingImage] = useState<number | null>(null);
  
  const handleGenerateImage = async (page: LocalLandingPage, prompt?: string) => {
    setGeneratingImage(page.id);
    try {
      await seoApi.generateHeroImage(page.slug, prompt);
      success('Hero-bild genererad!');
      fetchPages();
      setShowImageModal(false);
      setCustomPrompt('');
    } catch (err) {
      console.error('Failed to generate image:', err);
      error('Kunde inte generera bild');
    } finally {
      setGeneratingImage(null);
    }
  };
  
  const handleDeleteImage = async (page: LocalLandingPage) => {
    setDeletingImage(true);
    try {
      await seoApi.deleteHeroImage(page.slug);
      success('Hero-bild raderad!');
      fetchPages();
      setShowImageModal(false);
    } catch (err) {
      console.error('Failed to delete image:', err);
      error('Kunde inte radera bild');
    } finally {
      setDeletingImage(false);
    }
  };
  
  const handleUploadImage = async (page: LocalLandingPage, file: File) => {
    setUploadingImage(true);
    try {
      await seoApi.uploadHeroImage(page.slug, file);
      success('Hero-bild uppladdad!');
      fetchPages();
      setShowImageModal(false);
    } catch (err) {
      console.error('Failed to upload image:', err);
      error('Kunde inte ladda upp bild');
    } finally {
      setUploadingImage(false);
    }
  };
  
  const handleUpdateAltText = async (page: LocalLandingPage, altText: string) => {
    try {
      await seoApi.updateHeroImageAlt(page.slug, altText);
      success('Alt-text uppdaterad!');
      fetchPages();
    } catch (err) {
      console.error('Failed to update alt text:', err);
      error('Kunde inte uppdatera alt-text');
    }
  };
  
  const openImageModal = async (page: LocalLandingPage) => {
    // Fetch full page data to get hero_image
    try {
      const fullPage = await seoApi.getLandingPage(page.slug);
      setImageModalPage(fullPage);
      setShowImageModal(true);
    } catch (err) {
      console.error('Failed to fetch page:', err);
      error('Kunde inte ladda sidan');
    }
  };

  const handlePublish = async (page: LocalLandingPage) => {
    setPublishing(page.id);
    try {
      await seoApi.publishLandingPage(page.slug);
      success('Sida publicerad!');
      fetchPages();
    } catch (err) {
      console.error('Failed to publish page:', err);
      error('Kunde inte publicera sida');
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = async () => {
    if (!pageToDelete) return;
    try {
      await seoApi.deleteLandingPage(pageToDelete.slug);
      success('Sida raderad');
      fetchPages();
    } catch (err) {
      error('Kunde inte radera sida');
    } finally {
      setPageToDelete(null);
    }
  };

  const startEdit = async (page: LocalLandingPage) => {
    // Fetch full page data (list view doesn't include content fields)
    try {
      const fullPage = await seoApi.getLandingPage(page.slug);
      setEditingPage(fullPage);
      
      const locationId = typeof fullPage.location === 'object' ? fullPage.location.id : fullPage.location;
      const keywordId = typeof fullPage.primary_keyword === 'object' ? fullPage.primary_keyword?.id : fullPage.primary_keyword;
      
      setForm({
        location: locationId?.toString() || '',
        primary_keyword: keywordId?.toString() || '',
        title: fullPage.title || '',
        meta_description: fullPage.meta_description || '',
        h1_title: fullPage.h1_title || '',
        hero_tagline: fullPage.hero_tagline || '',
        intro_content: fullPage.intro_content || '',
        main_content: fullPage.main_content || '',
        cta_content: fullPage.cta_content || '',
        // SEO Fields
        focus_keyphrase: fullPage.focus_keyphrase || '',
        // Hero Image
        hero_image: fullPage.hero_image || null,
        hero_image_alt: fullPage.hero_image_alt || '',
        // Open Graph
        og_title: fullPage.og_title || '',
        og_description: fullPage.og_description || '',
        // Twitter Card
        twitter_card: fullPage.twitter_card || 'summary_large_image',
        twitter_title: fullPage.twitter_title || '',
        twitter_description: fullPage.twitter_description || '',
        // Display Options
        show_nearby_clubs: fullPage.show_nearby_clubs ?? true,
        show_nearby_events: fullPage.show_nearby_events ?? true,
        show_platform_stats: fullPage.show_platform_stats ?? true,
        show_testimonials: fullPage.show_testimonials ?? true,
      });
      setShowForm(true);
    } catch (err) {
      console.error('Failed to fetch page for editing:', err);
      error('Kunde inte ladda sidan för redigering');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingPage(null);
    setForm({
      location: '',
      primary_keyword: '',
      title: '',
      meta_description: '',
      h1_title: '',
      hero_tagline: '',
      intro_content: '',
      main_content: '',
      cta_content: '',
      // SEO Fields
      focus_keyphrase: '',
      // Hero Image
      hero_image: null,
      hero_image_alt: '',
      // Open Graph
      og_title: '',
      og_description: '',
      // Twitter Card
      twitter_card: 'summary_large_image',
      twitter_title: '',
      twitter_description: '',
      // Display Options
      show_nearby_clubs: true,
      show_nearby_events: true,
      show_platform_stats: true,
      show_testimonials: true,
    });
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

  const getLocationName = (location: SwedishLocation | number) => {
    if (typeof location === 'object') return location.name;
    return locations.find(l => l.id === location)?.name || 'Okänd';
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
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                <MapPinned className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Lokala landningssidor</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">
              Skapa kommun- och stadsspecifika sidor med AI-genererat innehåll
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all"
          >
            <Plus className="w-4 h-4" />
            Skapa ny sida
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-0">
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Totalt</span>
            <div className="text-2xl font-bold text-[var(--brand-green)]">{pages.length}</div>
          </div>
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Publicerade</span>
            <div className="text-2xl font-bold text-[var(--brand-primary)]">
              {pages.filter(p => p.status === 'PUBLISHED').length}
            </div>
          </div>
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Granskning</span>
            <div className="text-2xl font-bold text-[var(--brand-peach)]">
              {pages.filter(p => p.status === 'REVIEW').length}
            </div>
          </div>
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
            <span className="text-xs font-medium text-[var(--brand-light)]/70 block mb-1">Utkast</span>
            <div className="text-2xl font-bold text-[var(--brand-light)]/50">
              {pages.filter(p => p.status === 'DRAFT').length}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-0">
          <div className="flex-1 bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] px-4 py-3 flex items-center gap-3">
            <Search className="h-5 w-5 text-[var(--brand-light)]/40 flex-shrink-0" />
            <input 
              type="text"
              placeholder="Sök sidor..."
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
        </div>

        {/* Pages List */}
        {loading ? (
          <div className="space-y-3 px-4 sm:px-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-16 bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] mx-4 sm:mx-0">
            <MapPinned className="w-12 h-12 mx-auto text-[var(--brand-light)]/20 mb-4" />
            <p className="text-[var(--brand-light)]/50 mb-2">
              Inga lokala sidor ännu
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="text-[var(--brand-primary)] hover:underline text-sm font-medium"
            >
              Skapa din första lokala landningssida
            </button>
          </div>
        ) : (
          <div className="space-y-3 px-4 sm:px-0">
            {pages.filter(p => 
              (p.title || '').toLowerCase().includes(searchInput.toLowerCase()) ||
              getLocationName(p.location).toLowerCase().includes(searchInput.toLowerCase())
            ).map((page) => (
              <div
                key={page.id}
                className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4 hover:border-[var(--dark-500)] transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Image thumbnail */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <button
                      onClick={() => openImageModal(page)}
                      className="relative w-20 h-14 rounded-lg overflow-hidden bg-[var(--dark-600)] flex-shrink-0 group hover:ring-2 hover:ring-[var(--brand-primary)] transition-all"
                      title={page.hero_image ? 'Hantera bild' : 'Lägg till bild'}
                    >
                      {page.hero_image ? (
                        <>
                          <Image
                            src={page.hero_image.startsWith('http') ? page.hero_image : `${API_URL}${page.hero_image}`}
                            alt={page.hero_image_alt || 'Hero image'}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                            <Pencil className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[var(--brand-light)]/30 group-hover:text-[var(--brand-primary)] transition-colors">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-semibold text-[var(--brand-light)]">{page.title}</h3>
                        <span 
                          className="px-2 py-0.5 text-xs rounded-full font-medium"
                          style={getStatusStyle(page.status)}
                        >
                          {STATUS_OPTIONS.find(o => o.value === page.status)?.label}
                        </span>
                        {page.ai_generated_at && (
                          <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI-genererad
                          </span>
                        )}
                        {page.hero_image && (
                          <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-pink-500/20 text-pink-400 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            Bild
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--brand-light)]/50">
                        <span>Plats: <strong className="text-[var(--brand-light)]">{getLocationName(page.location)}</strong></span>
                        <span>/{page.slug}</span>
                        {page.published_at && (
                          <span>Publicerad: {new Date(page.published_at).toLocaleDateString('sv-SE')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {page.status === 'DRAFT' && (
                      <button
                        onClick={() => handleGenerateContent(page)}
                        disabled={generating === page.id}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] hover:bg-[var(--brand-purple)]/30 transition-all text-sm font-medium disabled:opacity-50"
                      >
                        {generating === page.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Generera</span>
                      </button>
                    )}
                    
                    {(page.status === 'DRAFT' || page.status === 'REVIEW') && (
                      <button
                        onClick={() => handlePublish(page)}
                        disabled={publishing === page.id}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--brand-green)]/20 text-[var(--brand-green)] hover:bg-[var(--brand-green)]/30 transition-all text-sm font-medium disabled:opacity-50"
                      >
                        {publishing === page.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Publicera</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => startEdit(page)}
                      className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-all flex items-center justify-center"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    
                    {page.status === 'PUBLISHED' && (
                      <Link
                        href={`/kommun/${page.slug}`}
                        target="_blank"
                        className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/20 transition-all flex items-center justify-center"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                    
                    <button
                      onClick={() => setPageToDelete(page)}
                      className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20 transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
            <div className="bg-[var(--dark-800)] rounded-2xl w-full max-w-2xl border border-[var(--dark-600)] overflow-hidden my-8">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--dark-600)]">
                <h3 className="text-lg font-semibold text-[var(--brand-light)]">
                  {editingPage ? 'Redigera lokal sida' : 'Skapa lokal sida'}
                </h3>
                <button 
                  onClick={resetForm}
                  className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors p-2 rounded-lg hover:bg-[var(--dark-700)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Plats *</label>
                    <select
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors"
                    >
                      <option value="">Välj en plats...</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name} ({loc.region})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Primärt nyckelord</label>
                    <select
                      value={form.primary_keyword}
                      onChange={(e) => setForm({ ...form, primary_keyword: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors"
                    >
                      <option value="">Välj nyckelord...</option>
                      {keywords.map(kw => (
                        <option key={kw.id} value={kw.id}>{kw.keyword}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Sidtitel *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    placeholder="t.ex. Fritidsgårdar i Stockholm"
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
                  <p className="text-xs text-[var(--brand-light)]/40 mt-1">{(form.meta_description || '').length}/160 tecken</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">H1 Rubrik</label>
                  <input
                    type="text"
                    value={form.h1_title}
                    onChange={(e) => setForm({ ...form, h1_title: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    placeholder="Samma som titel om tom"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Hero Tagline</label>
                  <input
                    type="text"
                    value={form.hero_tagline}
                    onChange={(e) => setForm({ ...form, hero_tagline: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    placeholder="En catchy underrubrik"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Intro</label>
                  <textarea
                    value={form.intro_content}
                    onChange={(e) => setForm({ ...form, intro_content: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                    placeholder="Inledande stycke (kan genereras av AI)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Huvudinnehåll</label>
                  <textarea
                    value={form.main_content}
                    onChange={(e) => setForm({ ...form, main_content: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                    placeholder="Sidans huvudinnehåll (kan genereras av AI)"
                  />
                </div>

                {/* SEO Settings Section */}
                <div className="pt-4 border-t border-[var(--dark-600)]">
                  <h4 className="text-sm font-medium text-[var(--brand-light)] mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    SEO-inställningar
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Fokus-nyckelord</label>
                      <input
                        type="text"
                        value={form.focus_keyphrase}
                        onChange={(e) => setForm({ ...form, focus_keyphrase: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                        placeholder="Primärt sökord sidan optimeras för"
                      />
                    </div>
                  </div>
                </div>

                {/* Open Graph Section */}
                <div className="pt-4 border-t border-[var(--dark-600)]">
                  <h4 className="text-sm font-medium text-[var(--brand-light)] mb-3">Open Graph (Facebook/LinkedIn)</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">OG Titel</label>
                      <input
                        type="text"
                        value={form.og_title}
                        onChange={(e) => setForm({ ...form, og_title: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                        placeholder="Lämna tom för att använda sidtitel"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">OG Beskrivning</label>
                      <textarea
                        value={form.og_description}
                        onChange={(e) => setForm({ ...form, og_description: e.target.value })}
                        rows={2}
                        maxLength={200}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                        placeholder="Beskrivning som visas vid delning (max 200 tecken)"
                      />
                      <p className="text-xs text-[var(--brand-light)]/40 mt-1">{(form.og_description || '').length}/200 tecken</p>
                    </div>
                  </div>
                </div>

                {/* Twitter Card Section */}
                <div className="pt-4 border-t border-[var(--dark-600)]">
                  <h4 className="text-sm font-medium text-[var(--brand-light)] mb-3">Twitter Card</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Korttyp</label>
                      <select
                        value={form.twitter_card}
                        onChange={(e) => setForm({ ...form, twitter_card: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors"
                      >
                        <option value="summary">Summary</option>
                        <option value="summary_large_image">Summary Large Image</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Twitter Titel</label>
                      <input
                        type="text"
                        value={form.twitter_title}
                        onChange={(e) => setForm({ ...form, twitter_title: e.target.value })}
                        maxLength={70}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                        placeholder="Lämna tom för att använda OG/sidtitel"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Twitter Beskrivning</label>
                      <textarea
                        value={form.twitter_description}
                        onChange={(e) => setForm({ ...form, twitter_description: e.target.value })}
                        rows={2}
                        maxLength={200}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                        placeholder="Lämna tom för att använda OG/meta-beskrivning"
                      />
                      <p className="text-xs text-[var(--brand-light)]/40 mt-1">{(form.twitter_description || '').length}/200 tecken</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--dark-600)]">
                  <h4 className="text-sm font-medium text-[var(--brand-light)] mb-3">Visa dynamiskt innehåll</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'show_nearby_clubs', label: 'Närliggande fritidsgårdar' },
                      { key: 'show_nearby_events', label: 'Närliggande evenemang' },
                      { key: 'show_platform_stats', label: 'Lokal statistik' },
                      { key: 'show_testimonials', label: 'Omdömen' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(form as any)[key]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                          className="w-4 h-4 rounded border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                        />
                        <span className="text-sm text-[var(--brand-light)]/70">{label}</span>
                      </label>
                    ))}
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
                  disabled={saving || !form.location || !form.title}
                  className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-2.5 transition-all disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingPage ? 'Spara ändringar' : 'Skapa sida'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        <ConfirmationModal
          isVisible={!!pageToDelete}
          onClose={() => setPageToDelete(null)}
          onConfirm={handleDelete}
          title="Radera lokal sida"
          message={`Är du säker på att du vill radera "${pageToDelete?.title}"?`}
          confirmButtonText="Radera"
          cancelButtonText="Avbryt"
          variant="danger"
          darkMode={true}
        />
        
        {/* Image Management Modal */}
        {showImageModal && imageModalPage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
            <div className="bg-[var(--dark-800)] rounded-2xl w-full max-w-2xl border border-[var(--dark-600)] overflow-hidden my-8">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--dark-600)]">
                <h3 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-pink-400" />
                  Hantera hero-bild
                </h3>
                <button 
                  onClick={() => {
                    setShowImageModal(false);
                    setImageModalPage(null);
                    setCustomPrompt('');
                  }}
                  className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors p-2 rounded-lg hover:bg-[var(--dark-700)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Page info */}
                <div className="text-sm text-[var(--brand-light)]/70">
                  <span className="font-medium text-[var(--brand-light)]">{imageModalPage.title}</span>
                  <span className="mx-2">•</span>
                  <span>/{imageModalPage.slug}</span>
                </div>
                
                {/* Current Image Preview */}
                {imageModalPage.hero_image ? (
                  <div className="space-y-4">
                    <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-[var(--dark-600)]">
                      <Image
                        src={imageModalPage.hero_image.startsWith('http') ? imageModalPage.hero_image : `${API_URL}${imageModalPage.hero_image}`}
                        alt={imageModalPage.hero_image_alt || 'Hero image'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    
                    {/* Alt text */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                        Alt-text (för SEO och tillgänglighet)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          defaultValue={imageModalPage.hero_image_alt || ''}
                          placeholder="Beskrivning av bilden..."
                          className="flex-1 px-4 py-2.5 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors text-sm"
                          onBlur={(e) => {
                            if (e.target.value !== imageModalPage.hero_image_alt) {
                              handleUpdateAltText(imageModalPage, e.target.value);
                            }
                          }}
                        />
                      </div>
                      <p className="text-xs text-[var(--brand-light)]/40 mt-1">
                        Tryck Tab eller klicka utanför för att spara
                      </p>
                    </div>
                    
                    {/* Actions for existing image */}
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleGenerateImage(imageModalPage)}
                        disabled={generatingImage === imageModalPage.id}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] hover:bg-[var(--brand-purple)]/30 transition-all text-sm font-medium disabled:opacity-50"
                      >
                        {generatingImage === imageModalPage.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Generera ny bild
                      </button>
                      
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/30 transition-all text-sm font-medium disabled:opacity-50"
                      >
                        {uploadingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        Ladda upp egen
                      </button>
                      
                      <button
                        onClick={() => handleDeleteImage(imageModalPage)}
                        disabled={deletingImage}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all text-sm font-medium disabled:opacity-50"
                      >
                        {deletingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Ta bort bild
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* No image placeholder */}
                    <div className="aspect-[16/9] rounded-xl bg-[var(--dark-600)] flex flex-col items-center justify-center text-[var(--brand-light)]/30">
                      <ImageIcon className="w-16 h-16 mb-3" />
                      <p className="text-sm">Ingen hero-bild ännu</p>
                    </div>
                    
                    {/* Generate or upload options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        onClick={() => handleGenerateImage(imageModalPage)}
                        disabled={generatingImage === imageModalPage.id}
                        className="flex flex-col items-center gap-3 p-6 rounded-xl bg-[var(--brand-purple)]/10 border-2 border-dashed border-[var(--brand-purple)]/30 hover:border-[var(--brand-purple)] hover:bg-[var(--brand-purple)]/20 transition-all text-center disabled:opacity-50"
                      >
                        {generatingImage === imageModalPage.id ? (
                          <Loader2 className="w-8 h-8 text-[var(--brand-purple)] animate-spin" />
                        ) : (
                          <Wand2 className="w-8 h-8 text-[var(--brand-purple)]" />
                        )}
                        <div>
                          <p className="font-medium text-[var(--brand-light)]">Generera med AI</p>
                          <p className="text-xs text-[var(--brand-light)]/50 mt-1">DALL-E skapar en bild baserat på sidans innehåll</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex flex-col items-center gap-3 p-6 rounded-xl bg-[var(--brand-blue)]/10 border-2 border-dashed border-[var(--brand-blue)]/30 hover:border-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/20 transition-all text-center disabled:opacity-50"
                      >
                        {uploadingImage ? (
                          <Loader2 className="w-8 h-8 text-[var(--brand-blue)] animate-spin" />
                        ) : (
                          <Upload className="w-8 h-8 text-[var(--brand-blue)]" />
                        )}
                        <div>
                          <p className="font-medium text-[var(--brand-light)]">Ladda upp egen</p>
                          <p className="text-xs text-[var(--brand-light)]/50 mt-1">JPEG, PNG eller WebP (max 10MB)</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Custom prompt section */}
                <div className="pt-4 border-t border-[var(--dark-600)]">
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    Anpassad AI-prompt (valfritt)
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none text-sm"
                    placeholder="Beskriv hur du vill att bilden ska se ut, t.ex. 'Ungdomar som spelar basket i en modern fritidsgård med graffiti på väggarna'..."
                  />
                  <p className="text-xs text-[var(--brand-light)]/40 mt-2">
                    Standard-prompt används om du lämnar detta tomt. Prompten inkluderar platsnamn och nyckelord automatiskt.
                  </p>
                  
                  {customPrompt && (
                    <button
                      onClick={() => handleGenerateImage(imageModalPage, customPrompt)}
                      disabled={generatingImage === imageModalPage.id}
                      className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--brand-purple)] to-pink-500 text-white font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {generatingImage === imageModalPage.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                      Generera med anpassad prompt
                    </button>
                  )}
                </div>
                
                {/* Info box */}
                <div className="bg-[var(--dark-700)]/50 rounded-xl p-4 text-sm text-[var(--brand-light)]/60">
                  <p className="font-medium text-[var(--brand-light)]/80 mb-2">Om bildgenerering:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>AI-bilder genereras med DALL-E 3 (tar 15-30 sekunder)</li>
                    <li>Bilden optimeras automatiskt för hero-sektionen (1792×1024px)</li>
                    <li>Alt-text genereras automatiskt men kan redigeras manuellt</li>
                    <li>Bilden används även som OG-bild för sociala medier</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Hidden file input for image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && imageModalPage) {
              handleUploadImage(imageModalPage, file);
            }
            e.target.value = ''; // Reset input
          }}
        />
      </div>
    </div>
  );
}

