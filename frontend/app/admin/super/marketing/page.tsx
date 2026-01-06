// frontend/app/admin/super/marketing/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Settings, Quote, Plus, Pencil, Trash2, Star, 
  Save, X, Eye, EyeOff, Loader2, Image as ImageIcon,
  Sparkles, Upload, Globe, Megaphone, Search, Video
} from 'lucide-react';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import { useToast } from '../../../../hooks/useToast';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import LanguageSelector, { LanguageBadge, type LanguageCode } from '../../components/LanguageSelector';

interface Testimonial {
  id: number;
  language: string;
  author_name: string;
  author_role: string;
  author_avatar?: string;
  quote: string;
  rating: number;
  is_active: boolean;
  created_at: string;
}

interface SEOSettings {
  id?: number;
  language?: string;
  page_title: string;
  meta_description: string;
  keywords: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_background: string | null;
  hero_video: string | null;
  og_title: string;
  og_description: string;
  og_image: string | null;
}

// Skeleton Component
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

export default function MarketingPage() {
  const t = useTranslations('marketingAdmin');
  const [activeTab, setActiveTab] = useState<'hero' | 'seo' | 'testimonials'>('hero');
  const { success, error, info, warning } = useToast();
  
  // Language State
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('sv');
  
  // SEO/Hero State
  const [seoSettings, setSeoSettings] = useState<SEOSettings>({
    page_title: 'Ungdomsappen - Hitta aktiviteter nära dig',
    meta_description: '',
    keywords: '',
    hero_title: 'Hitta din grej!',
    hero_subtitle: 'Samlade aktiviteter och evenemang för unga.',
    hero_cta_text: 'Sök aktiviteter',
    hero_background: null,
    hero_video: null,
    og_title: '',
    og_description: '',
    og_image: null,
  });
  const [seoLoading, setSeoLoading] = useState(true);
  const [seoSaving, setSeoSaving] = useState(false);
  const [heroBackgroundFile, setHeroBackgroundFile] = useState<File | null>(null);
  const [heroBackgroundPreview, setHeroBackgroundPreview] = useState<string | null>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  
  // Hero Video State
  const [heroVideoFile, setHeroVideoFile] = useState<File | null>(null);
  const [heroVideoPreview, setHeroVideoPreview] = useState<string | null>(null);
  const heroVideoInputRef = useRef<HTMLInputElement>(null);
  
  // Testimonials State
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testimonialForm, setTestimonialForm] = useState({
    language: 'sv' as LanguageCode,
    author_name: '',
    author_role: 'Ungdom',
    quote: '',
    rating: 5,
    is_active: true,
  });
  const [testimonialSaving, setTestimonialSaving] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [testimonialToDelete, setTestimonialToDelete] = useState<number | null>(null);

  // Fetch SEO settings for selected language
  useEffect(() => {
    const fetchSEO = async () => {
      setSeoLoading(true);
      setHeroBackgroundPreview(null);
      setHeroVideoPreview(null);
      setHeroBackgroundFile(null);
      setHeroVideoFile(null);
      
      try {
        const res = await api.get(`/marketing/admin/seo-settings/?lang=${selectedLanguage}`);
        if (res.data) {
          setSeoSettings(res.data);
          if (res.data.hero_background) {
            setHeroBackgroundPreview(getMediaUrl(res.data.hero_background) || null);
          }
          if (res.data.hero_video) {
            setHeroVideoPreview(getMediaUrl(res.data.hero_video) || null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch SEO settings:', err);
        // Reset to defaults for this language
        setSeoSettings({
          page_title: '',
          meta_description: '',
          keywords: '',
          hero_title: '',
          hero_subtitle: '',
          hero_cta_text: '',
          hero_background: null,
          hero_video: null,
          og_title: '',
          og_description: '',
          og_image: null,
        });
      } finally {
        setSeoLoading(false);
      }
    };
    fetchSEO();
  }, [selectedLanguage]);

  // Fetch testimonials (all languages - we filter in UI)
  useEffect(() => {
    const fetchTestimonials = async () => {
      setTestimonialsLoading(true);
      try {
        const res = await api.get('/marketing/testimonials/');
        const data = res.data.results || res.data;
        setTestimonials(data);
      } catch (err) {
        console.error('Failed to fetch testimonials:', err);
      } finally {
        setTestimonialsLoading(false);
      }
    };
    fetchTestimonials();
  }, []);

  // Handle hero background file selection
  const handleHeroBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHeroBackgroundFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeroBackgroundPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle hero video file selection
  const handleHeroVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        error(t('hero.videoTooLarge'));
        return;
      }
      setHeroVideoFile(file);
      // Create object URL for video preview
      const videoUrl = URL.createObjectURL(file);
      setHeroVideoPreview(videoUrl);
    }
  };

  // Clear hero video
  const handleClearHeroVideo = () => {
    setHeroVideoFile(null);
    setHeroVideoPreview(null);
    setSeoSettings({ ...seoSettings, hero_video: null });
  };

  // Save SEO/Hero settings for selected language
  const handleSaveSEO = async () => {
    setSeoSaving(true);
    try {
      const formData = new FormData();
      formData.append('language', selectedLanguage);
      formData.append('page_title', seoSettings.page_title);
      formData.append('meta_description', seoSettings.meta_description);
      formData.append('keywords', seoSettings.keywords);
      formData.append('hero_title', seoSettings.hero_title);
      formData.append('hero_subtitle', seoSettings.hero_subtitle);
      formData.append('hero_cta_text', seoSettings.hero_cta_text);
      formData.append('og_title', seoSettings.og_title);
      formData.append('og_description', seoSettings.og_description);
      
      if (heroBackgroundFile) {
        formData.append('hero_background', heroBackgroundFile);
      }
      
      if (heroVideoFile) {
        formData.append('hero_video', heroVideoFile);
      }

      await api.put(`/marketing/admin/seo-settings/?lang=${selectedLanguage}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setHeroBackgroundFile(null);
      setHeroVideoFile(null);
      success(t('toast.settingsSaved'));
    } catch (err) {
      console.error('Failed to save SEO settings:', err);
      error(t('toast.failedToSave'));
    } finally {
      setSeoSaving(false);
    }
  };

  // Save testimonial with language
  const handleSaveTestimonial = async () => {
    setTestimonialSaving(true);
    try {
      const formDataWithLang = { ...testimonialForm };
      
      if (editingTestimonial) {
        await api.patch(`/marketing/testimonials/${editingTestimonial.id}/`, formDataWithLang);
        setTestimonials(prev => 
          prev.map(t => t.id === editingTestimonial.id ? { ...t, ...formDataWithLang } : t)
        );
        success(t('toast.testimonialUpdated'));
      } else {
        const res = await api.post('/marketing/testimonials/', formDataWithLang);
        setTestimonials(prev => [res.data, ...prev]);
        success(t('toast.testimonialCreated'));
      }
      resetTestimonialForm();
    } catch (err) {
      console.error('Failed to save testimonial:', err);
      error(t('toast.failedToSaveTestimonial'));
    } finally {
      setTestimonialSaving(false);
    }
  };

  // Delete testimonial
  const handleDeleteTestimonial = async () => {
    if (!testimonialToDelete) return;
    
    try {
      await api.delete(`/marketing/testimonials/${testimonialToDelete}/`);
      setTestimonials(prev => prev.filter(t => t.id !== testimonialToDelete));
      success(t('toast.testimonialDeleted'));
    } catch (error) {
      console.error('Failed to delete testimonial:', error);
      error(t('toast.failedToDeleteTestimonial'));
    } finally {
      setTestimonialToDelete(null);
    }
  };

  // Toggle testimonial active status
  const handleToggleActive = async (testimonial: Testimonial) => {
    try {
      await api.patch(`/marketing/testimonials/${testimonial.id}/`, {
        is_active: !testimonial.is_active,
      });
      setTestimonials(prev => 
        prev.map(t => t.id === testimonial.id ? { ...t, is_active: !t.is_active } : t)
      );
    } catch (error) {
      console.error('Failed to toggle testimonial:', error);
    }
  };

  const resetTestimonialForm = () => {
    setShowTestimonialForm(false);
    setEditingTestimonial(null);
    setTestimonialForm({
      language: selectedLanguage,
      author_name: '',
      author_role: 'Ungdom',
      quote: '',
      rating: 5,
      is_active: true,
    });
  };

  const startEditTestimonial = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setTestimonialForm({
      language: (testimonial.language || 'sv') as LanguageCode,
      author_name: testimonial.author_name,
      author_role: testimonial.author_role,
      quote: testimonial.quote,
      rating: testimonial.rating,
      is_active: testimonial.is_active,
    });
    setShowTestimonialForm(true);
  };

  // Filter testimonials by search and optionally by language
  const filteredTestimonials = testimonials.filter(t => {
    const matchesSearch = t.author_name.toLowerCase().includes(searchInput.toLowerCase()) ||
      t.quote.toLowerCase().includes(searchInput.toLowerCase());
    // Show all languages in the list, but you can filter by selected language if needed
    return matchesSearch;
  });

  const activeCount = testimonials.filter(t => t.is_active).length;

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-8 px-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-0">
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-[var(--dark-900)]" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.hero')}</span>
            </div>
            <div className="text-lg font-bold text-[var(--brand-light)] truncate">{seoSettings.hero_title || '—'}</div>
          </div>

          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                <Globe className="h-5 w-5 text-[var(--dark-900)]" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.seo')}</span>
            </div>
            <div className="text-lg font-bold text-[var(--brand-blue)] truncate">
              {seoSettings.page_title ? t('stats.configured') : t('stats.notConfigured')}
            </div>
          </div>

          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                <Quote className="h-5 w-5 text-[var(--dark-900)]" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.testimonials')}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{testimonials.length}</div>
          </div>

          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)] flex items-center justify-center">
                <Eye className="h-5 w-5 text-[var(--dark-900)]" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.active')}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-peach)]">{activeCount}</div>
          </div>
        </div>

        {/* Language Selector */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 sm:px-6 py-4">
          <LanguageSelector
            value={selectedLanguage}
            onChange={(lang) => setSelectedLanguage(lang)}
            label="Select language to edit content for"
            variant="pills"
          />
        </div>

        {/* Tabs */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 py-2">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('hero')}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                activeTab === 'hero'
                  ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                  : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">{t('tabs.hero')}</span>
              <span className="sm:hidden">{t('tabs.heroShort')}</span>
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                activeTab === 'seo'
                  ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                  : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">{t('tabs.seo')}</span>
              <span className="sm:hidden">{t('tabs.seoShort')}</span>
            </button>
            <button
              onClick={() => setActiveTab('testimonials')}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                activeTab === 'testimonials'
                  ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                  : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]'
              }`}
            >
              <Quote className="w-4 h-4" />
              <span>{t('tabs.testimonials')}</span>
            </button>
          </div>
        </div>

        {/* Hero Tab */}
        {activeTab === 'hero' && (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)]">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('hero.title')}</h2>
              <p className="text-sm text-[var(--brand-light)]/50 mt-1">
                {t('hero.description')}
              </p>
            </div>
            
            {seoLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-36 w-64 rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-6">
                {/* Hero Background Image */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('hero.backgroundImage')}
                  </label>
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div 
                      className="relative w-full sm:w-64 h-36 rounded-xl overflow-hidden bg-[var(--dark-700)] border-2 border-dashed border-[var(--dark-500)] cursor-pointer hover:border-[var(--brand-primary)] transition-colors"
                      onClick={() => heroFileInputRef.current?.click()}
                    >
                      {heroBackgroundPreview ? (
                        <img 
                          src={heroBackgroundPreview} 
                          alt="Hero background preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-[var(--brand-light)]/40">
                          <ImageIcon className="w-8 h-8 mb-2" />
                          <span className="text-sm">{t('hero.clickToUpload')}</span>
                        </div>
                      )}
                      <input
                        ref={heroFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleHeroBackgroundChange}
                        className="hidden"
                      />
                    </div>
                    <div className="text-sm text-[var(--brand-light)]/50">
                      <p>{t('hero.recommendedSize')}</p>
                      <p>{t('hero.format')}</p>
                      <p className="text-[var(--brand-peach)] mt-1">{t('hero.imageFallbackNote')}</p>
                      {heroBackgroundFile && (
                        <p className="text-[var(--brand-green)] mt-2 flex items-center gap-1">
                          <Upload className="w-4 h-4" />
                          {t('hero.newImageSelected')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hero Video */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('hero.backgroundVideo')}
                  </label>
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div 
                      className="relative w-full sm:w-64 h-36 rounded-xl overflow-hidden bg-[var(--dark-700)] border-2 border-dashed border-[var(--dark-500)] cursor-pointer hover:border-[var(--brand-purple)] transition-colors"
                      onClick={() => heroVideoInputRef.current?.click()}
                    >
                      {heroVideoPreview || seoSettings.hero_video ? (
                        <>
                          <video 
                            src={heroVideoPreview || getMediaUrl(seoSettings.hero_video) || undefined}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            autoPlay
                            playsInline
                          />
                          {/* Clear video button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearHeroVideo();
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-[var(--dark-900)]/80 text-[var(--brand-red)] hover:bg-[var(--brand-red)] hover:text-white transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-[var(--brand-light)]/40">
                          <Video className="w-8 h-8 mb-2" />
                          <span className="text-sm">{t('hero.clickToUploadVideo')}</span>
                        </div>
                      )}
                      <input
                        ref={heroVideoInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={handleHeroVideoChange}
                        className="hidden"
                      />
                    </div>
                    <div className="text-sm text-[var(--brand-light)]/50">
                      <p>{t('hero.videoRecommendedSize')}</p>
                      <p>{t('hero.videoFormat')}</p>
                      <p className="text-[var(--brand-purple)] mt-1">{t('hero.videoNote')}</p>
                      {heroVideoFile && (
                        <p className="text-[var(--brand-green)] mt-2 flex items-center gap-1">
                          <Upload className="w-4 h-4" />
                          {t('hero.newVideoSelected')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hero Title */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('hero.heading')}
                  </label>
                  <input
                    type="text"
                    value={seoSettings.hero_title}
                    onChange={(e) => setSeoSettings({ ...seoSettings, hero_title: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    placeholder={t('hero.headingPlaceholder')}
                  />
                </div>

                {/* Hero Subtitle */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('hero.subheading')}
                  </label>
                  <textarea
                    value={seoSettings.hero_subtitle}
                    onChange={(e) => setSeoSettings({ ...seoSettings, hero_subtitle: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                    placeholder={t('hero.subheadingPlaceholder')}
                  />
                </div>

                {/* Hero CTA Text */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('hero.ctaText')}
                  </label>
                  <input
                    type="text"
                    value={seoSettings.hero_cta_text}
                    onChange={(e) => setSeoSettings({ ...seoSettings, hero_cta_text: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    placeholder={t('hero.ctaPlaceholder')}
                  />
                </div>

                {/* Preview */}
                <div className="pt-4 border-t border-[var(--dark-600)]">
                  <h3 className="text-sm font-medium text-[var(--brand-light)]/70 mb-3">{t('hero.preview')}</h3>
                  <div className="relative rounded-xl overflow-hidden h-48 sm:h-56">
                    {/* Video or Image Background */}
                    {heroVideoPreview || seoSettings.hero_video ? (
                      <video
                        src={heroVideoPreview || getMediaUrl(seoSettings.hero_video) || undefined}
                        className="absolute inset-0 w-full h-full object-cover"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : heroBackgroundPreview ? (
                      <img 
                        src={heroBackgroundPreview}
                        alt="Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(135deg, var(--dark-800), var(--dark-700))',
                        }}
                      />
                    )}
                    {/* Overlay with content */}
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white p-4">
                      <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-center">{seoSettings.hero_title || t('hero.headingPlaceholder')}</h2>
                      <p className="text-sm opacity-80 mb-4 text-center max-w-md">{seoSettings.hero_subtitle || t('hero.subheadingPlaceholder')}</p>
                      <button className="px-6 py-2.5 bg-[var(--brand-primary)] rounded-xl text-sm font-bold text-[var(--dark-900)]">
                        {seoSettings.hero_cta_text || t('hero.ctaPlaceholder')}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveSEO}
                    disabled={seoSaving}
                    className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all disabled:opacity-50"
                  >
                    {seoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t('hero.saveChanges')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEO Tab */}
        {activeTab === 'seo' && (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)]">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('seo.title')}</h2>
              <p className="text-sm text-[var(--brand-light)]/50 mt-1">
                {t('seo.description')}
              </p>
            </div>
            
            {seoLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('seo.pageTitle')}
                  </label>
                  <input
                    type="text"
                    value={seoSettings.page_title}
                    onChange={(e) => setSeoSettings({ ...seoSettings, page_title: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    placeholder={t('seo.pageTitlePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('seo.metaDescription')}
                  </label>
                  <textarea
                    value={seoSettings.meta_description}
                    onChange={(e) => setSeoSettings({ ...seoSettings, meta_description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                    placeholder={t('seo.metaDescriptionPlaceholder')}
                  />
                  <p className="text-xs text-[var(--brand-light)]/40 mt-1">
                    {t('seo.metaDescriptionHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('seo.keywords')}
                  </label>
                  <input
                    type="text"
                    value={seoSettings.keywords}
                    onChange={(e) => setSeoSettings({ ...seoSettings, keywords: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    placeholder={t('seo.keywordsPlaceholder')}
                  />
                </div>

                <div className="pt-4 border-t border-[var(--dark-600)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center">
                      <Globe className="h-4 w-4 text-[var(--brand-blue)]" />
                    </div>
                    <h3 className="text-md font-semibold text-[var(--brand-light)]">{t('seo.openGraph')}</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                        {t('seo.ogTitle')}
                      </label>
                      <input
                        type="text"
                        value={seoSettings.og_title}
                        onChange={(e) => setSeoSettings({ ...seoSettings, og_title: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                        placeholder={t('seo.ogTitlePlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                        {t('seo.ogDescription')}
                      </label>
                      <textarea
                        value={seoSettings.og_description}
                        onChange={(e) => setSeoSettings({ ...seoSettings, og_description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                        placeholder={t('seo.ogDescriptionPlaceholder')}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveSEO}
                    disabled={seoSaving}
                    className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all disabled:opacity-50"
                  >
                    {seoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t('seo.saveChanges')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Testimonials Tab */}
        {activeTab === 'testimonials' && (
          <div className="space-y-4">
            {/* Search & Add */}
            <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-0">
              <div className="flex-1 bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] px-4 py-3 flex items-center gap-3">
                <Search className="h-5 w-5 text-[var(--brand-light)]/40 flex-shrink-0" />
                <input 
                  type="text"
                  placeholder={t('testimonials.searchPlaceholder')}
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
              <button
                onClick={() => setShowTestimonialForm(true)}
                className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all"
              >
                <Plus className="w-4 h-4" />
                {t('testimonials.addTestimonial')}
              </button>
            </div>

            {/* Stats Bar */}
            {!testimonialsLoading && testimonials.length > 0 && (
              <div className="px-4 sm:px-0">
                <p className="text-sm text-[var(--brand-light)]/50">
                  {t('testimonials.showing')} <span className="text-[var(--brand-primary)] font-semibold">{filteredTestimonials.length}</span> {t('testimonials.of')} <span className="text-[var(--brand-primary)] font-semibold">{testimonials.length}</span> {t('testimonials.testimonialsLabel')}
                </p>
              </div>
            )}

            {/* Form Modal */}
            {showTestimonialForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                <div className="bg-[var(--dark-800)] rounded-2xl w-full max-w-md border border-[var(--dark-600)] overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--dark-600)]">
                    <h3 className="text-lg font-semibold text-[var(--brand-light)]">
                      {editingTestimonial ? t('testimonials.formTitle.edit') : t('testimonials.formTitle.new')}
                    </h3>
                    <button 
                      onClick={resetTestimonialForm} 
                      className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors p-2 rounded-lg hover:bg-[var(--dark-700)]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Language Selector for Testimonial */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Language</label>
                      <LanguageSelector
                        value={testimonialForm.language}
                        onChange={(lang) => setTestimonialForm({ ...testimonialForm, language: lang })}
                        showLabel={false}
                        variant="dropdown"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">{t('testimonials.form.name')}</label>
                      <input
                        type="text"
                        value={testimonialForm.author_name}
                        onChange={(e) => setTestimonialForm({ ...testimonialForm, author_name: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                        placeholder={t('testimonials.form.namePlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">{t('testimonials.form.role')}</label>
                      <input
                        type="text"
                        value={testimonialForm.author_role}
                        onChange={(e) => setTestimonialForm({ ...testimonialForm, author_role: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                        placeholder={t('testimonials.form.rolePlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">{t('testimonials.form.quote')}</label>
                      <textarea
                        value={testimonialForm.quote}
                        onChange={(e) => setTestimonialForm({ ...testimonialForm, quote: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                        placeholder={t('testimonials.form.quotePlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">{t('testimonials.form.rating')}</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setTestimonialForm({ ...testimonialForm, rating: star })}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`w-7 h-7 ${
                                star <= testimonialForm.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-[var(--dark-500)]'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 py-2">
                      <button
                        type="button"
                        onClick={() => setTestimonialForm({ ...testimonialForm, is_active: !testimonialForm.is_active })}
                        className={`relative w-12 h-7 rounded-full transition-colors ${
                          testimonialForm.is_active ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-600)]'
                        }`}
                      >
                        <span 
                          className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                            testimonialForm.is_active ? 'left-6' : 'left-1'
                          }`}
                        />
                      </button>
                      <label className="text-sm text-[var(--brand-light)]/70">
                        {t('testimonials.form.showOnHomepage')}
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                    <button
                      onClick={resetTestimonialForm}
                      className="px-4 py-2.5 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] rounded-xl transition-all font-medium"
                    >
                      {t('testimonials.form.cancel')}
                    </button>
                    <button
                      onClick={handleSaveTestimonial}
                      disabled={testimonialSaving || !testimonialForm.author_name || !testimonialForm.quote}
                      className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-2.5 transition-all disabled:opacity-50"
                    >
                      {testimonialSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {t('testimonials.form.save')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Testimonials List */}
            {testimonialsLoading ? (
              <div className="space-y-4 px-4 sm:px-0">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTestimonials.length === 0 ? (
              <div className="text-center py-16 bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)]">
                <Quote className="w-12 h-12 mx-auto text-[var(--brand-light)]/20 mb-4" />
                <p className="text-[var(--brand-light)]/50 mb-2">
                  {searchInput ? t('testimonials.emptyState.noMatch') : t('testimonials.emptyState.noTestimonials')}
                </p>
                {!searchInput && (
                  <button
                    onClick={() => setShowTestimonialForm(true)}
                    className="text-[var(--brand-primary)] hover:underline text-sm font-medium"
                  >
                    {t('testimonials.emptyState.addFirst')}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 px-4 sm:px-0">
                {filteredTestimonials.map((testimonial) => (
                  <div
                    key={testimonial.id}
                    className={`bg-[var(--dark-800)] rounded-xl border p-4 sm:p-6 transition-all ${
                      testimonial.is_active 
                        ? 'border-[var(--dark-600)] hover:border-[var(--dark-500)]' 
                        : 'border-[var(--dark-700)] opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-semibold text-[var(--brand-light)]">{testimonial.author_name}</span>
                          <span className="text-sm text-[var(--brand-light)]/50">• {testimonial.author_role}</span>
                          <LanguageBadge code={testimonial.language || 'sv'} />
                          {!testimonial.is_active && (
                            <span className="px-2 py-0.5 text-xs bg-[var(--dark-700)] text-[var(--brand-light)]/50 rounded-full">
                              {t('testimonials.hidden')}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-0.5 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= testimonial.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-[var(--dark-600)]'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[var(--brand-light)]/70 italic leading-relaxed">"{testimonial.quote}"</p>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleToggleActive(testimonial)}
                          className={`p-2.5 rounded-xl transition-all ${
                            testimonial.is_active 
                              ? 'text-[var(--brand-green)] hover:bg-[var(--brand-green)]/10' 
                              : 'text-[var(--brand-light)]/40 hover:bg-[var(--dark-700)]'
                          }`}
                          title={testimonial.is_active ? t('testimonials.hide') : t('testimonials.show')}
                        >
                          {testimonial.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => startEditTestimonial(testimonial)}
                          className="p-2.5 text-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/10 rounded-xl transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setTestimonialToDelete(testimonial.id)}
                          className="p-2.5 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isVisible={testimonialToDelete !== null}
          onClose={() => setTestimonialToDelete(null)}
          onConfirm={handleDeleteTestimonial}
          title={t('deleteModal.title')}
          message={t('deleteModal.message')}
          confirmButtonText={t('deleteModal.confirm')}
          cancelButtonText={t('deleteModal.cancel')}
          variant="danger"
          darkMode={true}
        />

        {/* Toast Notification */}
        </div>
    </div>
  );
}
