// frontend/app/admin/super/marketing/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Settings, Quote, Plus, Pencil, Trash2, Star, 
  Save, X, Eye, EyeOff, Loader2, Image as ImageIcon,
  Sparkles, Upload, Globe, Megaphone, Search, ChevronUp, ChevronDown
} from 'lucide-react';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import Toast from '@/app/components/Toast';

interface Testimonial {
  id: number;
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
  page_title: string;
  meta_description: string;
  keywords: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_background: string | null;
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
  const [activeTab, setActiveTab] = useState<'hero' | 'seo' | 'testimonials'>('hero');
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false });
  
  // SEO/Hero State
  const [seoSettings, setSeoSettings] = useState<SEOSettings>({
    page_title: 'Ungdomsappen - Hitta aktiviteter nära dig',
    meta_description: '',
    keywords: '',
    hero_title: 'Hitta din grej!',
    hero_subtitle: 'Samlade aktiviteter och evenemang för unga.',
    hero_cta_text: 'Sök aktiviteter',
    hero_background: null,
    og_title: '',
    og_description: '',
    og_image: null,
  });
  const [seoLoading, setSeoLoading] = useState(true);
  const [seoSaving, setSeoSaving] = useState(false);
  const [heroBackgroundFile, setHeroBackgroundFile] = useState<File | null>(null);
  const [heroBackgroundPreview, setHeroBackgroundPreview] = useState<string | null>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  
  // Testimonials State
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testimonialForm, setTestimonialForm] = useState({
    author_name: '',
    author_role: 'Ungdom',
    quote: '',
    rating: 5,
    is_active: true,
  });
  const [testimonialSaving, setTestimonialSaving] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // Fetch SEO settings
  useEffect(() => {
    const fetchSEO = async () => {
      try {
        const res = await api.get('/marketing/admin/seo-settings/');
        if (res.data) {
          setSeoSettings(res.data);
          if (res.data.hero_background) {
            setHeroBackgroundPreview(getMediaUrl(res.data.hero_background) || null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch SEO settings:', error);
        // Try public endpoint as fallback
        try {
          const publicRes = await api.get('/marketing/public/seo-settings/');
          if (publicRes.data) {
            setSeoSettings(publicRes.data);
          }
        } catch (e) {
          console.error('Failed to fetch public SEO settings:', e);
        }
      } finally {
        setSeoLoading(false);
      }
    };
    fetchSEO();
  }, []);

  // Fetch testimonials
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await api.get('/marketing/testimonials/');
        const data = res.data.results || res.data;
        setTestimonials(data);
      } catch (error) {
        console.error('Failed to fetch testimonials:', error);
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

  // Save SEO/Hero settings
  const handleSaveSEO = async () => {
    setSeoSaving(true);
    try {
      const formData = new FormData();
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

      await api.put('/marketing/admin/seo-settings/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setHeroBackgroundFile(null);
      setToast({ message: 'Inställningar sparade!', type: 'success', isVisible: true });
    } catch (error) {
      console.error('Failed to save SEO settings:', error);
      setToast({ message: 'Kunde inte spara inställningar', type: 'error', isVisible: true });
    } finally {
      setSeoSaving(false);
    }
  };

  // Save testimonial
  const handleSaveTestimonial = async () => {
    setTestimonialSaving(true);
    try {
      if (editingTestimonial) {
        await api.patch(`/marketing/testimonials/${editingTestimonial.id}/`, testimonialForm);
        setTestimonials(prev => 
          prev.map(t => t.id === editingTestimonial.id ? { ...t, ...testimonialForm } : t)
        );
        setToast({ message: 'Omdöme uppdaterat!', type: 'success', isVisible: true });
      } else {
        const res = await api.post('/marketing/testimonials/', testimonialForm);
        setTestimonials(prev => [res.data, ...prev]);
        setToast({ message: 'Omdöme skapat!', type: 'success', isVisible: true });
      }
      resetTestimonialForm();
    } catch (error) {
      console.error('Failed to save testimonial:', error);
      setToast({ message: 'Kunde inte spara omdöme', type: 'error', isVisible: true });
    } finally {
      setTestimonialSaving(false);
    }
  };

  // Delete testimonial
  const handleDeleteTestimonial = async (id: number) => {
    if (!confirm('Är du säker på att du vill ta bort detta omdöme?')) return;
    
    try {
      await api.delete(`/marketing/testimonials/${id}/`);
      setTestimonials(prev => prev.filter(t => t.id !== id));
      setToast({ message: 'Omdöme borttaget!', type: 'success', isVisible: true });
    } catch (error) {
      console.error('Failed to delete testimonial:', error);
      setToast({ message: 'Kunde inte ta bort omdöme', type: 'error', isVisible: true });
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
      author_name: testimonial.author_name,
      author_role: testimonial.author_role,
      quote: testimonial.quote,
      rating: testimonial.rating,
      is_active: testimonial.is_active,
    });
    setShowTestimonialForm(true);
  };

  // Filter testimonials by search
  const filteredTestimonials = testimonials.filter(t => 
    t.author_name.toLowerCase().includes(searchInput.toLowerCase()) ||
    t.quote.toLowerCase().includes(searchInput.toLowerCase())
  );

  const activeCount = testimonials.filter(t => t.is_active).length;

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-8 px-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Marknadsföring</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">Hantera startsida, SEO och omdömen.</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-0">
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Hero</span>
            </div>
            <div className="text-lg font-bold text-[var(--brand-light)] truncate">{seoSettings.hero_title || '—'}</div>
          </div>

          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[#38BDF8] flex items-center justify-center">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">SEO</span>
            </div>
            <div className="text-lg font-bold text-[var(--brand-blue)] truncate">{seoSettings.page_title ? 'Konfigurerat' : 'Ej konfigurerat'}</div>
          </div>

          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center">
                <Quote className="h-5 w-5 text-[var(--dark-900)]" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Omdömen</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{testimonials.length}</div>
          </div>

          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Aktiva</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-peach)]">{activeCount}</div>
          </div>
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
              <span className="hidden sm:inline">Startsida (Hero)</span>
              <span className="sm:hidden">Hero</span>
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
              <span className="hidden sm:inline">SEO & Social</span>
              <span className="sm:hidden">SEO</span>
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
              <span className="hidden sm:inline">Omdömen</span>
              <span className="sm:hidden">Omdömen</span>
            </button>
          </div>
        </div>

        {/* Hero Tab */}
        {activeTab === 'hero' && (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)]">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Hero Section</h2>
              <p className="text-sm text-[var(--brand-light)]/50 mt-1">
                Anpassa innehållet som visas i hero-sektionen på startsidan.
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
                    Bakgrundsbild
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
                          <span className="text-sm">Klicka för att ladda upp</span>
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
                      <p>Rekommenderad storlek: 1920x1080px</p>
                      <p>Format: JPG, PNG, WebP</p>
                      {heroBackgroundFile && (
                        <p className="text-[var(--brand-green)] mt-2 flex items-center gap-1">
                          <Upload className="w-4 h-4" />
                          Ny bild vald (sparas vid "Spara")
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hero Title */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    Rubrik
                  </label>
                  <input
                    type="text"
                    value={seoSettings.hero_title}
                    onChange={(e) => setSeoSettings({ ...seoSettings, hero_title: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    placeholder="Hitta din grej!"
                  />
                </div>

                {/* Hero Subtitle */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    Underrubrik
                  </label>
                  <textarea
                    value={seoSettings.hero_subtitle}
                    onChange={(e) => setSeoSettings({ ...seoSettings, hero_subtitle: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                    placeholder="Samlade aktiviteter och evenemang för unga."
                  />
                </div>

                {/* Hero CTA Text */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    Knapptext (CTA)
                  </label>
                  <input
                    type="text"
                    value={seoSettings.hero_cta_text}
                    onChange={(e) => setSeoSettings({ ...seoSettings, hero_cta_text: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    placeholder="Sök aktiviteter"
                  />
                </div>

                {/* Preview */}
                <div className="pt-4 border-t border-[var(--dark-600)]">
                  <h3 className="text-sm font-medium text-[var(--brand-light)]/70 mb-3">Förhandsvisning</h3>
                  <div 
                    className="relative rounded-xl overflow-hidden h-48 sm:h-56"
                    style={{
                      backgroundImage: heroBackgroundPreview 
                        ? `url(${heroBackgroundPreview})` 
                        : 'linear-gradient(135deg, var(--dark-800), var(--dark-700))',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white p-4">
                      <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-center">{seoSettings.hero_title || 'Hitta din grej!'}</h2>
                      <p className="text-sm opacity-80 mb-4 text-center max-w-md">{seoSettings.hero_subtitle || 'Samlade aktiviteter och evenemang för unga.'}</p>
                      <button className="px-6 py-2.5 bg-[var(--brand-primary)] rounded-xl text-sm font-bold text-[var(--dark-900)]">
                        {seoSettings.hero_cta_text || 'Sök aktiviteter'}
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
                    Spara ändringar
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
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">SEO & Sociala Medier</h2>
              <p className="text-sm text-[var(--brand-light)]/50 mt-1">
                Optimera hur din sida visas i sökmotorer och på sociala medier.
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
                    Sidtitel
                  </label>
                  <input
                    type="text"
                    value={seoSettings.page_title}
                    onChange={(e) => setSeoSettings({ ...seoSettings, page_title: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    placeholder="Ungdomsappen - Hitta aktiviteter nära dig"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    Meta-beskrivning
                  </label>
                  <textarea
                    value={seoSettings.meta_description}
                    onChange={(e) => setSeoSettings({ ...seoSettings, meta_description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                    placeholder="Upptäck aktiviteter, evenemang och fritidsgårdar nära dig..."
                  />
                  <p className="text-xs text-[var(--brand-light)]/40 mt-1">
                    Rekommenderad längd: 150-160 tecken
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    Nyckelord (kommaseparerade)
                  </label>
                  <input
                    type="text"
                    value={seoSettings.keywords}
                    onChange={(e) => setSeoSettings({ ...seoSettings, keywords: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    placeholder="ungdomsappen, fritidsgård, aktiviteter, ungdom"
                  />
                </div>

                <div className="pt-4 border-t border-[var(--dark-600)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center">
                      <Globe className="h-4 w-4 text-[var(--brand-blue)]" />
                    </div>
                    <h3 className="text-md font-semibold text-[var(--brand-light)]">Open Graph (Sociala medier)</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                        OG Titel
                      </label>
                      <input
                        type="text"
                        value={seoSettings.og_title}
                        onChange={(e) => setSeoSettings({ ...seoSettings, og_title: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                        placeholder="Lämna tom för att använda sidtiteln"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                        OG Beskrivning
                      </label>
                      <textarea
                        value={seoSettings.og_description}
                        onChange={(e) => setSeoSettings({ ...seoSettings, og_description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                        placeholder="Lämna tom för att använda meta-beskrivningen"
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
                    Spara ändringar
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
                  placeholder="Sök omdömen..." 
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
                Lägg till omdöme
              </button>
            </div>

            {/* Stats Bar */}
            {!testimonialsLoading && testimonials.length > 0 && (
              <div className="px-4 sm:px-0">
                <p className="text-sm text-[var(--brand-light)]/50">
                  Visar <span className="text-[var(--brand-primary)] font-semibold">{filteredTestimonials.length}</span> av <span className="text-[var(--brand-primary)] font-semibold">{testimonials.length}</span> omdömen
                </p>
              </div>
            )}

            {/* Form Modal */}
            {showTestimonialForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                <div className="bg-[var(--dark-800)] rounded-2xl w-full max-w-md border border-[var(--dark-600)] overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--dark-600)]">
                    <h3 className="text-lg font-semibold text-[var(--brand-light)]">
                      {editingTestimonial ? 'Redigera omdöme' : 'Nytt omdöme'}
                    </h3>
                    <button 
                      onClick={resetTestimonialForm} 
                      className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors p-2 rounded-lg hover:bg-[var(--dark-700)]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Namn</label>
                      <input
                        type="text"
                        value={testimonialForm.author_name}
                        onChange={(e) => setTestimonialForm({ ...testimonialForm, author_name: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                        placeholder="Emma Andersson"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Roll</label>
                      <input
                        type="text"
                        value={testimonialForm.author_role}
                        onChange={(e) => setTestimonialForm({ ...testimonialForm, author_role: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                        placeholder="Ungdom, 16 år"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Omdöme</label>
                      <textarea
                        value={testimonialForm.quote}
                        onChange={(e) => setTestimonialForm({ ...testimonialForm, quote: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                        placeholder="Skriv omdömet här..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">Betyg</label>
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
                        Visa på startsidan
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                    <button
                      onClick={resetTestimonialForm}
                      className="px-4 py-2.5 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] rounded-xl transition-all font-medium"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={handleSaveTestimonial}
                      disabled={testimonialSaving || !testimonialForm.author_name || !testimonialForm.quote}
                      className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-2.5 transition-all disabled:opacity-50"
                    >
                      {testimonialSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Spara
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
                  {searchInput ? 'Inga omdömen matchade din sökning' : 'Inga omdömen ännu'}
                </p>
                {!searchInput && (
                  <button
                    onClick={() => setShowTestimonialForm(true)}
                    className="text-[var(--brand-primary)] hover:underline text-sm font-medium"
                  >
                    Lägg till ditt första omdöme
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
                          {!testimonial.is_active && (
                            <span className="px-2 py-0.5 text-xs bg-[var(--dark-700)] text-[var(--brand-light)]/50 rounded-full">
                              Dold
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
                          title={testimonial.is_active ? 'Dölj' : 'Visa'}
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
                          onClick={() => handleDeleteTestimonial(testimonial.id)}
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

        {/* Toast Notification */}
        <Toast 
          message={toast.message} 
          type={toast.type} 
          isVisible={toast.isVisible} 
          onClose={() => setToast({ ...toast, isVisible: false })}
          darkMode
        />
      </div>
    </div>
  );
}
