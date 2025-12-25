'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Upload, X, FileText, Image, Tag, Users, Eye, 
  CheckCircle2, Lightbulb, Save, Globe, Star, Sparkles
} from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';
import DarkRichTextEditor from './DarkRichTextEditor';

interface TagOption { id: number; name: string; }

interface ArticleFormProps {
  initialData?: any;
  redirectPath: string;
}

const ROLES = [
  { id: 'SUPER_ADMIN', label: 'Super Admin', icon: '👑' },
  { id: 'MUNICIPALITY_ADMIN', label: 'Municipality Admin', icon: '🏛️' },
  { id: 'CLUB_ADMIN', label: 'Club Admin', icon: '🏢' },
  { id: 'YOUTH_MEMBER', label: 'Youth Member', icon: '🧑' },
  { id: 'GUARDIAN', label: 'Guardian', icon: '👨‍👩‍👧' },
];


export default function ArticleForm({ initialData, redirectPath }: ArticleFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const progressPlaceholderRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [tagsList, setTagsList] = useState<TagOption[]>([]);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isProgressFixed, setIsProgressFixed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    excerpt: initialData?.excerpt || '',
    content: initialData?.content || '',
    is_published: initialData?.is_published || false,
    is_hero: initialData?.is_hero || false,
    tags: initialData?.tags || [],
    target_roles: initialData?.target_roles || ['ALL'],
  });

  // Files
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(
    initialData?.hero_image ? getMediaUrl(initialData.hero_image) : null
  );

  // Track component mount for portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    api.get('/news_tags/?page_size=100').then(res => {
      setTagsList(Array.isArray(res.data) ? res.data : res.data.results || []);
    });
  }, []);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const calculateCompletion = useCallback(() => {
    const requiredFields = [formData.title, formData.excerpt];
    const filled = requiredFields.filter(f => f && f.toString().trim()).length;
    return Math.round((filled / requiredFields.length) * 100);
  }, [formData]);

  const completionPercent = calculateCompletion();

  const checkScroll = useCallback(() => {
    if (!progressPlaceholderRef.current) return;
    const rect = progressPlaceholderRef.current.getBoundingClientRect();
    const mainElement = document.querySelector('main');
    const headerHeight = mainElement ? 0 : 64;
    setIsProgressFixed(rect.top < headerHeight);
  }, []);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) mainElement.addEventListener('scroll', checkScroll);
    window.addEventListener('scroll', checkScroll);
    checkScroll();
    return () => {
      if (mainElement) mainElement.removeEventListener('scroll', checkScroll);
      window.removeEventListener('scroll', checkScroll);
    };
  }, [checkScroll]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setHeroFile(e.target.files[0]);
      setHeroPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleRemoveImage = () => {
    setHeroFile(null);
    setHeroPreview(null);
    if (heroRef.current) heroRef.current.value = '';
  };

  const toggleTag = (id: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(id) ? prev.tags.filter((t: number) => t !== id) : [...prev.tags, id]
    }));
  };

  const toggleRole = (role: string) => {
    setFormData(prev => {
      if (role === 'ALL') {
        return { ...prev, target_roles: prev.target_roles.includes('ALL') ? [] : ['ALL'] };
      }
      let newRoles = prev.target_roles.filter((r: string) => r !== 'ALL');
      if (newRoles.includes(role)) {
        newRoles = newRoles.filter((r: string) => r !== role);
      } else {
        newRoles.push(role);
      }
      if (newRoles.length === 0) newRoles = ['ALL'];
      return { ...prev, target_roles: newRoles };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const rolesToSubmit = formData.target_roles.length > 0 ? formData.target_roles : ['ALL'];
      const data = new FormData();
      data.append('title', formData.title);
      data.append('excerpt', formData.excerpt);
      data.append('content', formData.content);
      data.append('target_roles_data', JSON.stringify(rolesToSubmit));
      data.append('is_published', formData.is_published.toString());
      data.append('is_hero', formData.is_hero.toString());
      formData.tags.forEach((id: number) => data.append('tags', id.toString()));
      if (heroFile) data.append('hero_image', heroFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/news/${initialData.id}/`, data, config);
        setToast({ message: 'Article updated successfully!', type: 'success', isVisible: true });
      } else {
        await api.post('/news/', data, config);
        setToast({ message: 'Article created successfully!', type: 'success', isVisible: true });
      }

      setTimeout(() => router.push(buildUrlWithParams(redirectPath)), 1000);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Operation failed. Please try again.', type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  const contentWordCount = formData.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;

  const labelClasses = "block text-sm font-medium text-[var(--brand-light)]/70 mb-2";
  
  const inputClasses = (field: string) => `
    w-full h-11 px-4 rounded-xl
    bg-[var(--dark-700)] border-2 
    ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)] placeholder-[var(--brand-light)]/30
    outline-none transition-all duration-200
    hover:border-[var(--brand-primary)]/50
    focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
  `;

  const textareaClasses = (field: string) => `
    w-full px-4 py-3 rounded-xl resize-none
    bg-[var(--dark-700)] border-2 
    ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)] placeholder-[var(--brand-light)]/30
    outline-none transition-all duration-200
    hover:border-[var(--brand-primary)]/50
    focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
  `;

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-4xl sm:mx-auto sm:px-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 sm:mb-8 px-4 sm:px-0">
          <Link 
            href={buildUrlWithParams(redirectPath)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
              {initialData ? 'Edit Article' : 'Create New Article'}
            </h1>
            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
              {initialData ? 'Update article content and settings' : 'Write engaging content for your audience'}
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div ref={progressPlaceholderRef} className="mb-6 sm:mb-8" style={{ minHeight: isProgressFixed ? 72 : 'auto' }}>
          <div className={`bg-[var(--dark-800)] backdrop-blur-sm rounded-none sm:rounded-2xl p-4 border-y sm:border border-[var(--dark-600)] transition-opacity duration-200 ${isProgressFixed ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--brand-light)]/60">Required fields</span>
              <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
            </div>
            <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out" style={{ width: `${completionPercent}%` }} />
            </div>
            {completionPercent === 100 && (
              <div className="flex items-center gap-2 mt-3 text-[var(--brand-third)]">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Ready to publish!</span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Progress */}
        {isMounted && createPortal(
          <div className={`fixed z-[9999] left-0 right-0 bg-[var(--dark-800)]/95 backdrop-blur-sm border-b border-[var(--dark-600)] shadow-lg transition-all duration-200 top-16 md:top-0 ${isProgressFixed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
            <div className="w-full md:max-w-4xl md:mx-auto px-4 md:px-6 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--brand-light)]/60">Required fields</span>
                <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
              </div>
              <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out" style={{ width: `${completionPercent}%` }} />
              </div>
            </div>
          </div>,
          document.body
        )}

        <form onSubmit={handleSubmit}>
          
          {/* Article Content Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Article Content</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Write your article title, summary, and body</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className={labelClasses}>Title <span className="text-[var(--brand-red)]">*</span></label>
                <input 
                  type="text"
                  required
                  placeholder="Enter a compelling title..."
                  className={inputClasses('title')}
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  onFocus={() => setFocusedField('title')}
                  onBlur={() => setFocusedField(null)}
                />
                <p className="text-xs text-[var(--brand-light)]/40 mt-2">A clear, engaging title helps readers find your article</p>
              </div>

              {/* Excerpt */}
              <div>
                <label className={labelClasses}>Excerpt (Summary) <span className="text-[var(--brand-red)]">*</span></label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Write a brief summary that appears in article previews..."
                  className={textareaClasses('excerpt')}
                  value={formData.excerpt}
                  onChange={e => setFormData({...formData, excerpt: e.target.value})}
                  onFocus={() => setFocusedField('excerpt')}
                  onBlur={() => setFocusedField(null)}
                />
                <p className="text-xs text-[var(--brand-light)]/40 mt-2">This appears in article cards and search results (2-3 sentences recommended)</p>
              </div>

              {/* Body Content */}
              <div>
                <label className={labelClasses}>Body Content</label>
                <DarkRichTextEditor 
                  value={formData.content} 
                  onChange={(val) => setFormData({...formData, content: val})}
                  placeholder="Write your article content here..."
                  minHeight="250px"
                />
                <div className="flex items-center justify-between mt-2 px-1">
                  <p className="text-xs text-[var(--brand-light)]/40">Use the toolbar to format text, add links, and insert images</p>
                  <span className="text-xs text-[var(--brand-light)]/40">{contentWordCount} words</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Image Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-primary)] flex items-center justify-center">
                  <Image className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Hero Image</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Featured image displayed at the top</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div 
                  className="relative group w-full sm:w-64 h-40 border-2 border-dashed border-[var(--dark-500)] rounded-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer flex-shrink-0"
                  onClick={() => heroRef.current?.click()}
                >
                  {heroPreview ? (
                    <>
                      <img src={heroPreview} alt="Hero preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="h-6 w-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <Image className="h-8 w-8 text-[var(--brand-light)]/30 mx-auto mb-2" />
                      <span className="text-sm text-[var(--brand-light)]/40">Click to upload</span>
                      <p className="text-xs text-[var(--brand-light)]/30 mt-1">1200 × 400px</p>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => heroRef.current?.click()} className="px-4 py-2.5 bg-[var(--dark-600)] text-[var(--brand-light)] text-sm font-medium rounded-xl hover:bg-[var(--dark-500)] transition-all">
                      Choose File
                    </button>
                    {heroPreview && (
                      <button type="button" onClick={handleRemoveImage} className="px-4 py-2.5 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-sm font-medium rounded-xl hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-2">
                        <X className="h-4 w-4" /> Remove
                      </button>
                    )}
                  </div>
                  <div className="bg-[var(--dark-700)] rounded-xl p-3 border border-[var(--dark-500)]">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-[var(--brand-peach)] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-[var(--brand-light)]/50">High-quality landscape images (3:1 ratio) work best for hero images.</p>
                    </div>
                  </div>
                </div>
                <input ref={heroRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>
          </div>

          {/* Publication Settings */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Publication Settings</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Control visibility and featured status</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Publish Toggle */}
              <div 
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.is_published ? 'bg-[var(--brand-green)]/10 border-[var(--brand-green)]/30' : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--dark-400)]'}`}
                onClick={() => setFormData({...formData, is_published: !formData.is_published})}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.is_published ? 'bg-[var(--brand-green)]/20' : 'bg-[var(--dark-600)]'}`}>
                    <Globe className={`w-5 h-5 ${formData.is_published ? 'text-[var(--brand-green)]' : 'text-[var(--brand-light)]/40'}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--brand-light)]">Publish Article</h3>
                    <p className="text-xs text-[var(--brand-light)]/50">{formData.is_published ? 'Visible to audience' : 'Saved as draft'}</p>
                  </div>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-all ${formData.is_published ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-500)]'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${formData.is_published ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* Hero Toggle */}
              <div 
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.is_hero ? 'bg-[var(--brand-peach)]/10 border-[var(--brand-peach)]/30' : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--dark-400)]'}`}
                onClick={() => setFormData({...formData, is_hero: !formData.is_hero})}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.is_hero ? 'bg-[var(--brand-peach)]/20' : 'bg-[var(--dark-600)]'}`}>
                    <Star className={`w-5 h-5 ${formData.is_hero ? 'text-[var(--brand-peach)]' : 'text-[var(--brand-light)]/40'}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--brand-light)]">Feature as Hero</h3>
                    <p className="text-xs text-[var(--brand-light)]/50">{formData.is_hero ? 'Featured prominently' : 'Display as main featured'}</p>
                  </div>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-all ${formData.is_hero ? 'bg-[var(--brand-peach)]' : 'bg-[var(--dark-500)]'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${formData.is_hero ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>

              {formData.is_hero && (
                <div className="bg-[var(--brand-peach)]/10 rounded-xl p-3 border border-[var(--brand-peach)]/20">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--brand-peach)] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[var(--brand-peach)]">Setting this as hero will remove hero status from any other article.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Tags</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Categorize for better discoverability</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {tagsList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tagsList.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${formData.tags.includes(tag.id) ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/50' : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'}`}
                    >
                      {formData.tags.includes(tag.id) && <CheckCircle2 className="w-4 h-4 inline mr-2" />}
                      {tag.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Tag className="w-8 h-8 text-[var(--brand-light)]/20 mx-auto mb-2" />
                  <p className="text-sm text-[var(--brand-light)]/50 mb-1">No tags available.</p>
                  <Link href="/admin/super/news/tags/create" className="text-sm text-[var(--brand-primary)] hover:underline">Create your first tag →</Link>
                </div>
              )}
            </div>
          </div>

          {/* Target Audience */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">Target Audience</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">Choose who can see this article</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <div 
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.target_roles.includes('ALL') ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30' : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--dark-400)]'}`}
                onClick={() => toggleRole('ALL')}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🌍</span>
                  <div>
                    <h3 className="font-medium text-[var(--brand-light)]">Everyone</h3>
                    <p className="text-xs text-[var(--brand-light)]/50">Visible to all user types</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.target_roles.includes('ALL') ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' : 'border-[var(--dark-400)]'}`}>
                  {formData.target_roles.includes('ALL') && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
              </div>

              {!formData.target_roles.includes('ALL') && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-[var(--brand-light)]/40 mb-3">Or select specific user types:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ROLES.map(role => (
                      <div 
                        key={role.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.target_roles.includes(role.id) ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30' : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--dark-400)]'}`}
                        onClick={() => toggleRole(role.id)}
                      >
                        <span className="text-lg">{role.icon}</span>
                        <span className="flex-1 text-sm text-[var(--brand-light)]">{role.label}</span>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${formData.target_roles.includes(role.id) ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' : 'border-[var(--dark-400)]'}`}>
                          {formData.target_roles.includes(role.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
            <div className="px-6 py-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-peach)]/20 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-4 h-4 text-[var(--brand-peach)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--brand-light)] mb-1">Writing Tips</h3>
                  <ul className="text-xs text-[var(--brand-light)]/50 space-y-1">
                    <li>• Keep titles under 60 characters</li>
                    <li>• Write excerpts that create curiosity</li>
                    <li>• Use headings and short paragraphs</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 sm:px-0 pb-8">
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button type="button" onClick={() => router.push(buildUrlWithParams(redirectPath))} className="w-full sm:w-auto px-6 py-3 rounded-xl text-[var(--brand-light)]/70 bg-[var(--dark-700)] border border-[var(--dark-500)] hover:bg-[var(--dark-600)] font-medium transition-all">
                Cancel
              </button>
              <button type="submit" disabled={loading || completionPercent < 100} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[var(--dark-900)]/30 border-t-[var(--dark-900)] rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {initialData ? 'Update Article' : 'Create Article'}
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

        <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} darkMode />
      </div>
    </div>
  );
}
