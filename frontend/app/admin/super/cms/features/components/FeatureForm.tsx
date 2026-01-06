'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { FeatureShowcase } from '@/types/cms';
import { cmsApi } from '@/lib/cms-api';
import { useToast } from '../../../../../../hooks/useToast';
import { Loader2, Save, ArrowLeft, Image as ImageIcon, Video, FileJson, Play, RotateCcw, Eye, Globe } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LanguageSelector, { type LanguageCode } from '../../../../components/LanguageSelector';

interface FeatureFormProps {
  initialData?: FeatureShowcase;
  isEditing?: boolean;
  initialLanguage?: LanguageCode;
}

// Animation variants - must match FeatureShowcase component
const animationVariants = {
  'fade-up': { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0 } },
  'fade-in': { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  'slide-right': { hidden: { opacity: 0, x: -50 }, visible: { opacity: 1, x: 0 } },
  'slide-left': { hidden: { opacity: 0, x: 50 }, visible: { opacity: 1, x: 0 } },
  'zoom-in': { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } },
  'bounce-up': { hidden: { opacity: 0, y: 100 }, visible: { opacity: 1, y: 0 } },
  'rotate-in': { hidden: { opacity: 0, rotate: -10, scale: 0.9 }, visible: { opacity: 1, rotate: 0, scale: 1 } },
  'flip-up': { hidden: { opacity: 0, rotateX: 90 }, visible: { opacity: 1, rotateX: 0 } },
};

export default function FeatureForm({ initialData, isEditing = false, initialLanguage = 'sv' }: FeatureFormProps) {
  const t = useTranslations('cmsAdmin.features.form');
  const tAnimations = useTranslations('cmsAdmin.features.animations');
  const tMedia = useTranslations('cmsAdmin.features.mediaTypes');
  const tLayout = useTranslations('cmsAdmin.features.layout');
  const tStatus = useTranslations('cmsAdmin.features.status');
  const tLang = useTranslations('cmsAdmin.languageSelector');
  const router = useRouter();
  const { success, error } = useToast();
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    media_type: initialData?.media_type || 'image',
    alt_text: initialData?.alt_text || '',
    layout: initialData?.layout || 'left',
    animation_type: initialData?.animation_type || 'fade-up',
    order: initialData?.order || 0,
    is_active: initialData?.is_active ?? true,
    language: (initialData?.language || initialLanguage) as LanguageCode,
  });

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialData?.media || null);

  // Animation options with translations
  const animationOptions = [
    { value: 'fade-up', labelKey: 'fadeUp', descKey: 'fadeUpDesc' },
    { value: 'fade-in', labelKey: 'fadeIn', descKey: 'fadeInDesc' },
    { value: 'slide-right', labelKey: 'slideRight', descKey: 'slideRightDesc' },
    { value: 'slide-left', labelKey: 'slideLeft', descKey: 'slideLeftDesc' },
    { value: 'zoom-in', labelKey: 'zoomIn', descKey: 'zoomInDesc' },
    { value: 'bounce-up', labelKey: 'bounceUp', descKey: 'bounceUpDesc' },
    { value: 'rotate-in', labelKey: 'rotateIn', descKey: 'rotateInDesc' },
    { value: 'flip-up', labelKey: 'flipUp', descKey: 'flipUpDesc' },
  ];

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const replayAnimation = () => {
    setPreviewKey(prev => prev + 1);
  };

  const currentAnimation = animationOptions.find(a => a.value === formData.animation_type) || animationOptions[0];
  const currentVariants = animationVariants[formData.animation_type as keyof typeof animationVariants] || animationVariants['fade-up'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (!formData.title.trim()) {
      error(t('titleRequired'));
      return;
    }
    
    setSaving(true);
    
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value.toString());
      });
      if (mediaFile) {
        data.append('media', mediaFile);
      }

      if (isEditing && initialData) {
        await cmsApi.updateFeature(initialData.id, data);
        success(t('updated'));
      } else {
        await cmsApi.createFeature(data);
        success(t('created'));
      }
      router.push('/admin/super/cms/features');
      router.refresh();
    } catch (err: any) {
      console.error('Feature save error:', err);
      
      // Try to extract error message from response
      let errorMessage = t('saveFailed');
      if (err?.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (typeof errorData === 'object') {
          // Get first error message from validation errors
          const firstKey = Object.keys(errorData)[0];
          if (firstKey && Array.isArray(errorData[firstKey])) {
            errorMessage = `${firstKey}: ${errorData[firstKey][0]}`;
          } else if (firstKey) {
            errorMessage = `${firstKey}: ${errorData[firstKey]}`;
          }
        }
      }
      
      error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 sm:px-0">
        <Link href="/admin/super/cms/features" className="flex items-center gap-2 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">{t('backToFeatures')}</span>
        </Link>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleChange('is_active', !formData.is_active)}
            className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
              formData.is_active ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-600)]'
            }`}
          >
            <span 
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                formData.is_active ? 'left-6' : 'left-1'
              }`}
            />
          </button>
          <span className="text-sm text-[var(--brand-light)]/70 flex-shrink-0">
            {formData.is_active ? tStatus('active') : tStatus('inactive')}
          </span>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all disabled:opacity-50 flex-1 sm:flex-none justify-center"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEditing ? t('updateFeature') : t('createFeature')}
          </button>
        </div>
      </div>

      {/* Language Selection */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)]">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[var(--brand-primary)]" />
            <h2 className="text-lg font-semibold text-[var(--brand-light)]">{tLang('title')}</h2>
          </div>
          <p className="text-sm text-[var(--brand-light)]/50 mt-1">
            {tLang('description')}
          </p>
        </div>
        <div className="p-4 sm:p-6">
          <LanguageSelector
            value={formData.language}
            onChange={(lang) => handleChange('language', lang)}
            label={tLang('label')}
            variant="pills"
          />
          <p className="text-xs text-[var(--brand-light)]/40 mt-2">
            {tLang('hint')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)]">
          <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('featureDetails')}</h2>
          <p className="text-sm text-[var(--brand-light)]/50 mt-1">
            {t('featureDetailsDesc')}
          </p>
        </div>
        
        <div className="p-4 sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
              {t('title')}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
              placeholder={t('titlePlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
              {t('description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
              placeholder={t('descriptionPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                {t('layoutStyle')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'left', label: tLayout('textLeft'), icon: '◀ ▢' },
                  { value: 'right', label: tLayout('textRight'), icon: '▢ ▶' },
                  { value: 'grid', label: tLayout('gridCard'), icon: '▣' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleChange('layout', option.value)}
                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all text-xs font-medium ${
                      formData.layout === option.value
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                        : 'border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:border-[var(--dark-400)]'
                    }`}
                  >
                    <span className="text-lg">{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                {t('sortOrder')}
              </label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => handleChange('order', parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
              />
              <p className="text-xs text-[var(--brand-light)]/40 mt-1">{t('sortOrderHint')}</p>
            </div>
          </div>

          {/* Animation Section */}
          <div className="pt-4 border-t border-[var(--dark-600)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="block text-sm font-medium text-[var(--brand-light)]">
                  {t('animationEffect')}
                </label>
                <p className="text-xs text-[var(--brand-light)]/50">
                  {t('animationEffectDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  showPreview 
                    ? 'bg-[var(--brand-purple)] text-white' 
                    : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)]'
                }`}
              >
                <Eye className="w-4 h-4" />
                {showPreview ? t('hidePreview') : t('showPreview')}
              </button>
            </div>

            {/* Animation Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {animationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    handleChange('animation_type', option.value);
                    replayAnimation();
                  }}
                  className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                    formData.animation_type === option.value
                      ? 'border-[var(--brand-purple)] bg-[var(--brand-purple)]/10'
                      : 'border-[var(--dark-500)] hover:border-[var(--dark-400)]'
                  }`}
                >
                  <span className={`text-sm font-medium ${
                    formData.animation_type === option.value 
                      ? 'text-[var(--brand-purple)]' 
                      : 'text-[var(--brand-light)]'
                  }`}>
                    {tAnimations(option.labelKey)}
                  </span>
                  <span className="text-xs text-[var(--brand-light)]/50 mt-0.5">
                    {tAnimations(option.descKey)}
                  </span>
                </button>
              ))}
            </div>

            {/* Animation Preview */}
            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-[var(--brand-light)]/70">{t('animationPreview')}</span>
                      <button
                        type="button"
                        onClick={replayAnimation}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] text-sm transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        {t('replay')}
                      </button>
                    </div>
                    
                    <div className="relative h-32 flex items-center justify-center bg-[var(--dark-800)] rounded-lg overflow-hidden">
                      {/* Background grid */}
                      <div 
                        className="absolute inset-0 opacity-10"
                        style={{
                          backgroundImage: `linear-gradient(var(--brand-light) 1px, transparent 1px), linear-gradient(90deg, var(--brand-light) 1px, transparent 1px)`,
                          backgroundSize: '20px 20px',
                        }}
                      />
                      
                      <motion.div
                        key={previewKey}
                        initial="hidden"
                        animate="visible"
                        variants={currentVariants}
                        transition={{ 
                          duration: 0.6, 
                          ease: formData.animation_type === 'bounce-up' ? [0.68, -0.55, 0.265, 1.55] : 'easeOut'
                        }}
                        className="relative z-10"
                      >
                        <div className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-xl px-6 py-4 shadow-lg">
                          <div className="text-[var(--dark-900)] font-bold text-lg">
                            {formData.title || t('featureTitle')}
                          </div>
                          <div className="text-[var(--dark-900)]/70 text-sm mt-1">
                            {tAnimations(currentAnimation.labelKey)} {t('animation')}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Media Section */}
          <div className="pt-4 border-t border-[var(--dark-600)]">
            <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-3">
              {t('media')}
            </label>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { value: 'image', label: tMedia('image'), icon: ImageIcon },
                { value: 'video', label: tMedia('video'), icon: Video },
                { value: 'lottie', label: tMedia('lottie'), icon: FileJson },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleChange('media_type', option.value)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                      formData.media_type === option.value
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                        : 'border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:border-[var(--dark-400)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                className="relative h-48 rounded-xl overflow-hidden bg-[var(--dark-700)] border-2 border-dashed border-[var(--dark-500)] cursor-pointer hover:border-[var(--brand-primary)] transition-colors flex items-center justify-center"
                onClick={() => document.getElementById('media-input')?.click()}
              >
                {preview ? (
                  formData.media_type === 'video' ? (
                    <video src={preview} className="w-full h-full object-cover" controls />
                  ) : (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="flex flex-col items-center text-[var(--brand-light)]/40">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-sm">{t('clickToUpload')}</span>
                  </div>
                )}
                <input
                  id="media-input"
                  type="file"
                  accept={formData.media_type === 'video' ? 'video/*' : formData.media_type === 'lottie' ? '.json' : 'image/*'}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('altText')}
                  </label>
                  <input
                    type="text"
                    value={formData.alt_text}
                    onChange={(e) => handleChange('alt_text', e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    placeholder={t('altTextPlaceholder')}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Page Preview */}
      {showPreview && (formData.title || preview) && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('fullPreview')}</h2>
              <p className="text-sm text-[var(--brand-light)]/50 mt-1">
                {t('fullPreviewDesc')}
              </p>
            </div>
            <button
              type="button"
              onClick={replayAnimation}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-purple)] text-white text-sm font-medium hover:bg-[var(--brand-purple)]/90 transition-colors"
            >
              <Play className="w-4 h-4" />
              {t('playAnimation')}
            </button>
          </div>
          
          <div className="p-4 sm:p-8 bg-[var(--dark-900)]">
            {formData.layout === 'grid' ? (
              /* Grid Layout Preview */
              <motion.div 
                key={`grid-${previewKey}`}
                className="max-w-2xl mx-auto"
                initial="hidden"
                animate="visible"
                variants={currentVariants}
                transition={{ 
                  duration: 0.6, 
                  ease: formData.animation_type === 'bounce-up' ? [0.68, -0.55, 0.265, 1.55] : 'easeOut'
                }}
              >
                <div className="bg-[var(--dark-800)] rounded-3xl border border-[var(--dark-600)] overflow-hidden">
                  <div className="aspect-video relative bg-[var(--dark-700)]">
                    {preview ? (
                      formData.media_type === 'video' ? (
                        <video src={preview} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                      ) : (
                        <img src={preview} alt={formData.alt_text} className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--brand-light)]/30">
                        <ImageIcon className="w-16 h-16" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-800)] via-transparent to-transparent" />
                  </div>
                  <div className="p-6 -mt-16 relative z-10">
                    <h3 className="text-2xl font-bold text-[var(--brand-light)] mb-2 font-heading">
                      {formData.title || t('featureTitle')}
                    </h3>
                    <p className="text-[var(--brand-light)]/70">
                      {formData.description || t('featureDescriptionPlaceholder')}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Left/Right Layout Preview */
              <div className={`flex flex-col md:flex-row items-center gap-8 ${
                formData.layout === 'right' ? 'md:flex-row-reverse' : ''
              }`}>
                <motion.div 
                  key={`text-${previewKey}`}
                  className="flex-1 space-y-4"
                  initial="hidden"
                  animate="visible"
                  variants={currentVariants}
                  transition={{ 
                    duration: 0.6, 
                    delay: 0.1,
                    ease: formData.animation_type === 'bounce-up' ? [0.68, -0.55, 0.265, 1.55] : 'easeOut'
                  }}
                >
                  <h3 className="text-3xl font-bold text-[var(--brand-light)] font-heading">
                    {formData.title || t('featureTitle')}
                  </h3>
                  <p className="text-lg text-[var(--brand-light)]/70">
                    {formData.description || t('featureDescriptionLong')}
                  </p>
                </motion.div>

                <motion.div 
                  key={`media-${previewKey}`}
                  className="flex-1 w-full"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0, scale: 0.95 },
                    visible: { opacity: 1, scale: 1 }
                  }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-[var(--dark-700)] border border-[var(--dark-600)]">
                    <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-[var(--brand-purple)]/20 blur-3xl" />
                    
                    <div className="relative aspect-video">
                      {preview ? (
                        formData.media_type === 'video' ? (
                          <video src={preview} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                        ) : (
                          <img src={preview} alt={formData.alt_text} className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--brand-light)]/30">
                          <ImageIcon className="w-16 h-16" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
