'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import RichTextEditor from '@/app/components/RichTextEditor';
import { cmsApi } from '@/lib/cms-api';
import { Page, FeatureShowcase } from '@/types/cms';
import { useToast } from '../../../../../../hooks/useToast';
import { Loader2, Save, ArrowLeft, Image as ImageIcon, FileText, Settings, Search, Sparkles, GripVertical, Plus, X, User, List } from 'lucide-react';
import Link from 'next/link';

interface PageFormProps {
  initialData?: Page;
  isEditing?: boolean;
}

export default function PageForm({ initialData, isEditing = false }: PageFormProps) {
  const t = useTranslations('cmsAdmin.form');
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'settings' | 'seo' | 'author'>('content');

  // Form State
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    page_type: initialData?.page_type || 'standard',
    content: initialData?.content || '',
    excerpt: initialData?.excerpt || '',
    hero_tagline: initialData?.hero_tagline || '',
    show_hero: initialData?.show_hero ?? true,
    // Table of contents
    show_toc: initialData?.show_toc ?? false,
    // Author info
    author_name: initialData?.author_name || '',
    author_title: initialData?.author_title || '',
    // SEO
    meta_title: initialData?.meta_title || '',
    meta_description: initialData?.meta_description || '',
    og_title: initialData?.og_title || '',
    ai_description: initialData?.ai_description || '',
    is_published: initialData?.is_published ?? false,
  });

  // Features state for creative pages
  const [availableFeatures, setAvailableFeatures] = useState<FeatureShowcase[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<number[]>(
    initialData?.features || initialData?.features_data?.map(f => f.id) || []
  );
  const [featuresLoading, setFeaturesLoading] = useState(false);

  // Drag and drop state
  const [draggedFeatureId, setDraggedFeatureId] = useState<number | null>(null);
  const [dragOverFeatureId, setDragOverFeatureId] = useState<number | null>(null);

  // Fetch available features when page type is creative
  useEffect(() => {
    if (formData.page_type === 'creative') {
      setFeaturesLoading(true);
      cmsApi.getFeatures()
        .then(setAvailableFeatures)
        .catch(console.error)
        .finally(() => setFeaturesLoading(false));
    }
  }, [formData.page_type]);

  // File states (separate because they are not just strings)
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [ogImage, setOgImage] = useState<File | null>(null);
  const [authorImage, setAuthorImage] = useState<File | null>(null);

  // Previews
  const [heroPreview, setHeroPreview] = useState<string | null>(initialData?.hero_image || null);
  const [ogPreview, setOgPreview] = useState<string | null>(initialData?.og_image || null);
  const [authorPreview, setAuthorPreview] = useState<string | null>(initialData?.author_image || null);

  // Toggle feature selection (add to end of list)
  const toggleFeature = (featureId: number) => {
    setSelectedFeatureIds(prev => 
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  // Remove feature from selection
  const removeFeature = (featureId: number) => {
    setSelectedFeatureIds(prev => prev.filter(id => id !== featureId));
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, featureId: number) => {
    setDraggedFeatureId(featureId);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      const element = document.getElementById(`selected-feature-${featureId}`);
      if (element) element.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = () => {
    const element = document.getElementById(`selected-feature-${draggedFeatureId}`);
    if (element) element.style.opacity = '1';
    setDraggedFeatureId(null);
    setDragOverFeatureId(null);
  };

  const handleDragOver = (e: React.DragEvent, featureId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (featureId !== draggedFeatureId) {
      setDragOverFeatureId(featureId);
    }
  };

  const handleDragLeave = () => {
    setDragOverFeatureId(null);
  };

  const handleDrop = (e: React.DragEvent, targetFeatureId: number) => {
    e.preventDefault();
    
    if (draggedFeatureId === null || draggedFeatureId === targetFeatureId) {
      setDragOverFeatureId(null);
      return;
    }

    setSelectedFeatureIds(prev => {
      const newOrder = [...prev];
      const draggedIndex = newOrder.indexOf(draggedFeatureId);
      const targetIndex = newOrder.indexOf(targetFeatureId);
      
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedFeatureId);
      
      return newOrder;
    });

    setDragOverFeatureId(null);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'hero' | 'og' | 'author') => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      if (type === 'hero') {
        setHeroImage(file);
        setHeroPreview(previewUrl);
      } else if (type === 'og') {
        setOgImage(file);
        setOgPreview(previewUrl);
      } else {
        setAuthorImage(file);
        setAuthorPreview(previewUrl);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = new FormData();
      // Append standard fields with proper type handling
      Object.entries(formData).forEach(([key, value]) => {
        // Convert booleans to proper string representation for Django
        if (typeof value === 'boolean') {
          data.append(key, value ? 'true' : 'false');
        } else {
          data.append(key, value?.toString() || '');
        }
      });

      // Append feature IDs for creative pages (in order)
      if (formData.page_type === 'creative' && selectedFeatureIds.length > 0) {
        selectedFeatureIds.forEach(id => {
          data.append('feature_ids', id.toString());
        });
      }

      // Append files if they exist
      if (heroImage) data.append('hero_image', heroImage);
      if (ogImage) data.append('og_image', ogImage);
      if (authorImage) data.append('author_image', authorImage);

      if (isEditing && initialData) {
        await cmsApi.updatePage(initialData.slug, data);
        showToast(t('toast.pageUpdated'), "success");
      } else {
        await cmsApi.createPage(data);
        showToast(t('toast.pageCreated'), "success");
      }
      
      // Always redirect to pages list after successful save
      router.push('/admin/super/cms/pages');
    } catch (error: any) {
      console.error('Full error:', error);
      // Try to get more detailed error info
      let errorMsg = t('toast.saveFailed');
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          // Get first error message from validation errors
          const firstKey = Object.keys(error.response.data)[0];
          if (firstKey) {
            const firstError = error.response.data[firstKey];
            errorMsg = Array.isArray(firstError) ? firstError[0] : firstError;
          }
        } else {
          errorMsg = error.response.data;
        }
      }
      showToast(errorMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  // Get selected features in order
  const selectedFeatures = selectedFeatureIds
    .map(id => availableFeatures.find(f => f.id === id))
    .filter((f): f is FeatureShowcase => f !== undefined);

  // Get unselected features
  const unselectedFeatures = availableFeatures.filter(f => !selectedFeatureIds.includes(f.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 sm:px-0">
        <Link href="/admin/super/cms/pages" className="flex items-center gap-2 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">{t('backToPages')}</span>
        </Link>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleChange('is_published', !formData.is_published)}
            className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
              formData.is_published ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-600)]'
            }`}
          >
            <span 
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                formData.is_published ? 'left-6' : 'left-1'
              }`}
            />
          </button>
          <span className="text-sm text-[var(--brand-light)]/70 flex-shrink-0">
            {formData.is_published ? t('published') : t('draft')}
          </span>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all disabled:opacity-50 flex-1 sm:flex-none justify-center"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEditing ? t('updatePage') : t('createPage')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 py-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
              activeTab === 'content'
                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">{t('tabs.content')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
              activeTab === 'settings'
                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">{t('tabs.settings')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('author')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
              activeTab === 'author'
                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{t('tabs.author')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('seo')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
              activeTab === 'seo'
                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]'
            }`}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">{t('tabs.seo')}</span>
          </button>
        </div>
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)]">
            <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('content.title')}</h2>
            <p className="text-sm text-[var(--brand-light)]/50 mt-1">
              {t('content.description')}
            </p>
          </div>
          
          <div className="p-4 sm:p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                {t('content.pageTitle')}
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                placeholder={t('content.pageTitlePlaceholder')}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                {t('content.slug')}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[var(--brand-light)]/40">/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  className="flex-1 px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                  placeholder={t('content.slugPlaceholder')}
                />
              </div>
              <p className="text-xs text-[var(--brand-light)]/40 mt-1">{t('content.slugHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                {t('content.heroTagline')}
              </label>
              <input
                type="text"
                value={formData.hero_tagline}
                onChange={(e) => handleChange('hero_tagline', e.target.value)}
                className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                placeholder={t('content.heroTaglinePlaceholder')}
              />
              <p className="text-xs text-[var(--brand-light)]/40 mt-1">{t('content.heroTaglineHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                {t('content.excerpt')}
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => handleChange('excerpt', e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                placeholder={t('content.excerptPlaceholder')}
              />
              <p className="text-xs text-[var(--brand-light)]/40 mt-1">{t('content.excerptHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                {t('content.pageContent')}
              </label>
              <RichTextEditor 
                content={formData.content}
                onChange={(html) => handleChange('content', html)}
                minHeight="400px"
              />
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)]">
            <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('settings.title')}</h2>
            <p className="text-sm text-[var(--brand-light)]/50 mt-1">
              {t('settings.description')}
            </p>
          </div>
          
          <div className="p-4 sm:p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                {t('settings.pageType')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('page_type', 'standard')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    formData.page_type === 'standard'
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                      : 'border-[var(--dark-500)] bg-[var(--dark-700)] hover:border-[var(--dark-400)]'
                  }`}
                >
                  <div className="font-semibold text-[var(--brand-light)] mb-1">{t('settings.standardPage')}</div>
                  <div className="text-xs text-[var(--brand-light)]/50">{t('settings.standardPageDesc')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('page_type', 'creative')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    formData.page_type === 'creative'
                      ? 'border-[var(--brand-purple)] bg-[var(--brand-purple)]/10'
                      : 'border-[var(--dark-500)] bg-[var(--dark-700)] hover:border-[var(--dark-400)]'
                  }`}
                >
                  <div className="font-semibold text-[var(--brand-light)] mb-1">{t('settings.creativeShowcase')}</div>
                  <div className="text-xs text-[var(--brand-light)]/50">{t('settings.creativeShowcaseDesc')}</div>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--dark-600)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]">{t('settings.heroSection')}</label>
                  <p className="text-xs text-[var(--brand-light)]/50">{t('settings.heroSectionDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('show_hero', !formData.show_hero)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    formData.show_hero ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-600)]'
                  }`}
                >
                  <span 
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      formData.show_hero ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              
              {formData.show_hero && (
                <div 
                  className="relative w-full h-48 rounded-xl overflow-hidden bg-[var(--dark-700)] border-2 border-dashed border-[var(--dark-500)] cursor-pointer hover:border-[var(--brand-primary)] transition-colors"
                  onClick={() => document.getElementById('hero-input')?.click()}
                >
                  {heroPreview ? (
                    <img src={heroPreview} alt="Hero" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--brand-light)]/40">
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <span className="text-sm">{t('settings.clickToUploadHero')}</span>
                      <span className="text-xs mt-1">{t('settings.heroRecommended')}</span>
                    </div>
                  )}
                  <input
                    id="hero-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageChange(e, 'hero')}
                  />
                </div>
              )}
            </div>

            {/* Feature Selection for Creative Pages */}
            {formData.page_type === 'creative' && (
              <div className="pt-4 border-t border-[var(--dark-600)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[var(--brand-purple)]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-light)]">{t('settings.selectFeatures')}</label>
                    <p className="text-xs text-[var(--brand-light)]/50">{t('settings.selectFeaturesDesc')}</p>
                  </div>
                </div>

                {featuresLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
                  </div>
                ) : availableFeatures.length === 0 ? (
                  <div className="text-center py-8 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-[var(--brand-light)]/30" />
                    <p className="text-[var(--brand-light)]/50 text-sm">{t('settings.noFeatures')}</p>
                    <Link 
                      href="/admin/super/cms/features/create"
                      className="text-[var(--brand-primary)] text-sm hover:underline mt-2 inline-block"
                    >
                      {t('settings.createFirstFeature')}
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selected Features - Draggable */}
                    {selectedFeatures.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-[var(--brand-purple)] uppercase tracking-wider">
                            {t('settings.selectedFeatures')} ({selectedFeatures.length})
                          </span>
                          <span className="text-xs text-[var(--brand-light)]/40">
                            {t('settings.dragToReorder')}
                          </span>
                        </div>
                        <div className="space-y-2 bg-[var(--dark-700)]/50 rounded-xl p-2 border border-[var(--brand-purple)]/20">
                          {selectedFeatures.map((feature, index) => (
                            <div
                              key={feature.id}
                              id={`selected-feature-${feature.id}`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, feature.id)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => handleDragOver(e, feature.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, feature.id)}
                              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-move select-none ${
                                dragOverFeatureId === feature.id
                                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 scale-[1.02]'
                                  : 'border-[var(--brand-purple)] bg-[var(--dark-800)]'
                              }`}
                            >
                              {/* Drag Handle */}
                              <div className="flex items-center gap-2 text-[var(--brand-light)]/40">
                                <GripVertical className="w-5 h-5" />
                                <span className="w-6 h-6 rounded-lg bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] text-xs font-bold flex items-center justify-center">
                                  {index + 1}
                                </span>
                              </div>

                              {/* Thumbnail */}
                              <div className="w-14 h-10 rounded-lg overflow-hidden bg-[var(--dark-600)] flex-shrink-0">
                                {feature.media_type === 'image' && feature.media && (
                                  <img src={feature.media} alt="" className="w-full h-full object-cover" />
                                )}
                                {feature.media_type === 'video' && feature.media && (
                                  <video src={feature.media} className="w-full h-full object-cover" />
                                )}
                              </div>
                              
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-[var(--brand-light)] truncate text-sm">{feature.title}</div>
                                <div className="text-xs text-[var(--brand-light)]/50 flex items-center gap-2">
                                  <span className="capitalize">{feature.layout}</span>
                                  <span>•</span>
                                  <span>{feature.animation_type}</span>
                                </div>
                              </div>

                              {/* Remove Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFeature(feature.id);
                                }}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--brand-light)]/40 hover:text-[var(--brand-coral)] hover:bg-[var(--brand-coral)]/10 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available Features */}
                    {unselectedFeatures.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-[var(--brand-light)]/50 uppercase tracking-wider mb-2 block">
                          {t('settings.availableFeatures')} ({unselectedFeatures.length})
                        </span>
                        <div className="space-y-2">
                          {unselectedFeatures.map((feature) => (
                            <button
                              key={feature.id}
                              type="button"
                              onClick={() => toggleFeature(feature.id)}
                              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-[var(--dark-500)] bg-[var(--dark-700)] hover:border-[var(--dark-400)] transition-all text-left"
                            >
                              {/* Add Icon */}
                              <div className="w-8 h-8 rounded-lg bg-[var(--dark-600)] flex items-center justify-center text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)]">
                                <Plus className="w-4 h-4" />
                              </div>

                              {/* Thumbnail */}
                              <div className="w-14 h-10 rounded-lg overflow-hidden bg-[var(--dark-600)] flex-shrink-0">
                                {feature.media_type === 'image' && feature.media && (
                                  <img src={feature.media} alt="" className="w-full h-full object-cover" />
                                )}
                                {feature.media_type === 'video' && feature.media && (
                                  <video src={feature.media} className="w-full h-full object-cover" />
                                )}
                              </div>
                              
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-[var(--brand-light)] truncate text-sm">{feature.title}</div>
                                <div className="text-xs text-[var(--brand-light)]/50 flex items-center gap-2">
                                  <span className="capitalize">{feature.layout}</span>
                                  <span>•</span>
                                  <span>{feature.animation_type}</span>
                                  {!feature.is_active && (
                                    <>
                                      <span>•</span>
                                      <span className="text-[var(--brand-coral)]">{t('settings.inactive')}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty state when all features are selected */}
                    {unselectedFeatures.length === 0 && selectedFeatures.length > 0 && (
                      <div className="text-center py-4 text-[var(--brand-light)]/40 text-sm">
                        {t('settings.allFeaturesAdded')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Author & TOC Tab */}
      {activeTab === 'author' && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)]">
            <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('author.title')}</h2>
            <p className="text-sm text-[var(--brand-light)]/50 mt-1">
              {t('author.description')}
            </p>
          </div>
          
          <div className="p-4 sm:p-6 space-y-6">
            {/* Author Section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-[var(--brand-primary)]" />
                </div>
                <h3 className="text-md font-semibold text-[var(--brand-light)]">{t('author.authorInfo')}</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('author.authorName')}
                  </label>
                  <input
                    type="text"
                    value={formData.author_name}
                    onChange={(e) => handleChange('author_name', e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    placeholder={t('author.authorNamePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('author.authorTitle')}
                  </label>
                  <input
                    type="text"
                    value={formData.author_title}
                    onChange={(e) => handleChange('author_title', e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    placeholder={t('author.authorTitlePlaceholder')}
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                  {t('author.authorPhoto')}
                </label>
                <div className="flex items-center gap-4">
                  <div 
                    className="relative w-20 h-20 rounded-full overflow-hidden bg-[var(--dark-700)] border-2 border-dashed border-[var(--dark-500)] cursor-pointer hover:border-[var(--brand-primary)] transition-colors flex-shrink-0"
                    onClick={() => document.getElementById('author-input')?.click()}
                  >
                    {authorPreview ? (
                      <img src={authorPreview} alt="Author" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-[var(--brand-light)]/40">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                    <input
                      id="author-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageChange(e, 'author')}
                    />
                  </div>
                  <p className="text-xs text-[var(--brand-light)]/40">
                    {t('author.clickToUploadPhoto')}<br />
                    {t('author.photoRecommended')}
                  </p>
                </div>
              </div>
            </div>

            {/* Table of Contents Section */}
            <div className="pt-6 border-t border-[var(--dark-600)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                    <List className="w-4 h-4 text-[var(--brand-purple)]" />
                  </div>
                  <div>
                    <h3 className="text-md font-semibold text-[var(--brand-light)]">{t('author.toc')}</h3>
                    <p className="text-xs text-[var(--brand-light)]/50">{t('author.tocDesc')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('show_toc', !formData.show_toc)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    formData.show_toc ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-600)]'
                  }`}
                >
                  <span 
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      formData.show_toc ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              
              {formData.show_toc && (
                <div className="space-y-3">
                  <div className="p-4 bg-[var(--brand-green)]/10 border border-[var(--brand-green)]/20 rounded-xl">
                    <p className="text-sm text-[var(--brand-light)]/80 mb-2">
                      <strong className="text-[var(--brand-green)]">✨ {t('author.tocAutomatic')}</strong>
                    </p>
                    <p className="text-xs text-[var(--brand-light)]/60">
                      {t('author.tocAutomaticDesc')}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
                    <p className="text-xs font-medium text-[var(--brand-light)]/50 uppercase tracking-wider mb-3">{t('author.tocHowItWorks')}</p>
                    <ol className="text-sm text-[var(--brand-light)]/70 space-y-2 list-decimal list-inside">
                      <li>{t('author.tocStep1')}</li>
                      <li>{t('author.tocStep2')}</li>
                      <li>{t('author.tocStep3')}</li>
                      <li>{t('author.tocStep4')}</li>
                    </ol>
                  </div>
                  
                  {/* Preview of detected headings */}
                  {formData.content && (
                    <div className="p-4 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
                      <p className="text-xs font-medium text-[var(--brand-light)]/50 uppercase tracking-wider mb-3">{t('author.tocPreview')}</p>
                      {(() => {
                        const headingRegex = /<h([2-3])[^>]*>(.*?)<\/h[2-3]>/gi;
                        const headings: {level: string, text: string}[] = [];
                        let match;
                        while ((match = headingRegex.exec(formData.content)) !== null) {
                          headings.push({
                            level: match[1],
                            text: match[2].replace(/<[^>]*>/g, '').trim()
                          });
                        }
                        
                        if (headings.length === 0) {
                          return (
                            <p className="text-sm text-[var(--brand-light)]/40 italic">
                              {t('author.noHeadingsFound')}
                            </p>
                          );
                        }
                        
                        return (
                          <div className="space-y-1">
                            {headings.map((h, i) => (
                              <div 
                                key={i} 
                                className={`flex items-center gap-2 text-sm ${h.level === '3' ? 'pl-4' : ''}`}
                              >
                                <span className="w-6 h-6 rounded bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] text-xs font-bold flex items-center justify-center">
                                  H{h.level}
                                </span>
                                <span className="text-[var(--brand-light)]/70">{h.text}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SEO & AI Tab */}
      {activeTab === 'seo' && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)]">
            <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('seo.title')}</h2>
            <p className="text-sm text-[var(--brand-light)]/50 mt-1">
              {t('seo.description')}
            </p>
          </div>
          
          <div className="p-4 sm:p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                {t('seo.metaTitle')}
              </label>
              <input
                type="text"
                value={formData.meta_title}
                onChange={(e) => handleChange('meta_title', e.target.value)}
                className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                placeholder={t('seo.metaTitlePlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                {t('seo.metaDescription')}
              </label>
              <textarea
                value={formData.meta_description}
                onChange={(e) => handleChange('meta_description', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
                placeholder={t('seo.metaDescriptionPlaceholder')}
              />
              <p className="text-xs text-[var(--brand-light)]/40 mt-1">{t('seo.metaDescriptionHint')}</p>
            </div>

            <div className="pt-4 border-t border-[var(--dark-600)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                  <span className="text-[var(--brand-purple)] text-lg">✨</span>
                </div>
                <h3 className="text-md font-semibold text-[var(--brand-light)]">{t('seo.aiContext')}</h3>
              </div>
              <textarea
                value={formData.ai_description}
                onChange={(e) => handleChange('ai_description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--brand-purple)]/30 rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-purple)] transition-colors resize-none"
                placeholder={t('seo.aiContextPlaceholder')}
              />
              <p className="text-xs text-[var(--brand-light)]/40 mt-1">
                {t('seo.aiContextHint')}
              </p>
            </div>

            <div className="pt-4 border-t border-[var(--dark-600)]">
              <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                {t('seo.ogImage')}
              </label>
              <div 
                className="relative w-full sm:w-80 h-44 rounded-xl overflow-hidden bg-[var(--dark-700)] border-2 border-dashed border-[var(--dark-500)] cursor-pointer hover:border-[var(--brand-primary)] transition-colors"
                onClick={() => document.getElementById('og-input')?.click()}
              >
                {ogPreview ? (
                  <img src={ogPreview} alt="OG Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--brand-light)]/40">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-sm">{t('seo.clickToUploadOg')}</span>
                    <span className="text-xs mt-1">{t('seo.ogRecommended')}</span>
                  </div>
                )}
                <input
                  id="og-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageChange(e, 'og')}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
