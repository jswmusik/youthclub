'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X, Heart, Image, Smile, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import { useToast } from '../../hooks/useToast';

interface InterestFormProps {
  initialData?: any;
  redirectPath: string;
}

export default function InterestForm({ initialData, redirectPath }: InterestFormProps) {
  const t = useTranslations('interests.form');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { success, error, info, warning } = useToast();
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    icon: initialData?.icon || '',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData?.avatar ? getMediaUrl(initialData.avatar) : null
  );

  // Calculate progress
  const calculateProgress = () => {
    let filled = 0;
    let total = 1; // Only name is required
    if (formData.name.trim()) filled++;
    return Math.round((filled / total) * 100);
  };

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        icon: initialData.icon || '',
      });
      setAvatarFile(null);
      setAvatarPreview(initialData.avatar ? getMediaUrl(initialData.avatar) : null);
    } else {
      setFormData({
        name: '',
        icon: '',
      });
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }, [initialData]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('icon', formData.icon);
      
      if (avatarFile) {
        data.append('avatar', avatarFile);
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/interests/${initialData.id}/`, data, config);
        success(t('toasts.updateSuccess'));
      } else {
        await api.post('/interests/', data, config);
        success(t('toasts.createSuccess'));
      }

      setTimeout(() => router.push(redirectPath), 1000);

    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.name ? t('toasts.duplicateName') : t('toasts.operationFailed');
      error(msg);
      setLoading(false);
    }
  };

  const inputClasses = (field: string) => `
    w-full h-12 px-4 rounded-xl
    bg-[var(--dark-700)] border-2 
    ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)] placeholder-[var(--brand-light)]/30
    outline-none transition-all duration-200
    hover:border-[var(--brand-primary)]/50
    focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
  `;

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-3xl sm:mx-auto sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 sm:px-0 mb-6">
          <Link href={redirectPath}>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
              {initialData ? t('editTitle') : t('createTitle')}
            </h1>
            <p className="text-sm text-[var(--brand-light)]/50">{t('subtitle')}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] px-4 sm:px-6 py-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--brand-light)]/50">{t('progress')}</span>
            <span className="text-sm font-bold text-[var(--brand-primary)]">{progress}%</span>
          </div>
          <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Basic Information Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            {/* Card Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--brand-light)]">{t('basicInfo.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('basicInfo.subtitle')}</p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="px-4 sm:px-6 py-6 space-y-6">
              {/* Interest Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                  {t('basicInfo.nameLabel')} <span className="text-[var(--brand-red)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('basicInfo.namePlaceholder')}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  className={inputClasses('name')}
                />
                <p className="text-xs text-[var(--brand-light)]/40 mt-2">
                  {t('basicInfo.nameHelp')}
                </p>
              </div>

              {/* Icon (Emoji) */}
              <div>
                <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                  {t('basicInfo.iconLabel')}
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('basicInfo.iconPlaceholder')}
                      value={formData.icon}
                      onChange={e => setFormData({ ...formData, icon: e.target.value })}
                      onFocus={() => setFocusedField('icon')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-20 h-12 text-center text-2xl rounded-xl bg-[var(--dark-700)] border-2 ${focusedField === 'icon' ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'} text-[var(--brand-light)] outline-none transition-all hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20`}
                    />
                    <Smile className="absolute -right-2 -top-2 w-5 h-5 text-[var(--brand-yellow)]" />
                  </div>
                  <p className="text-sm text-[var(--brand-light)]/50">
                    {t('basicInfo.iconHelp')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cover Image Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            {/* Card Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center">
                  <Image className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--brand-light)]">{t('coverImage.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('coverImage.subtitle')}</p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="px-4 sm:px-6 py-6">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Image Preview */}
                <div 
                  className="relative w-32 h-32 rounded-xl border-2 border-dashed border-[var(--dark-500)] bg-[var(--dark-700)] flex items-center justify-center overflow-hidden cursor-pointer hover:border-[var(--brand-primary)]/50 transition-all group flex-shrink-0"
                  onClick={() => document.getElementById('avatar-input')?.click()}
                >
                  {avatarPreview ? (
                    <>
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <Upload className="w-8 h-8 text-[var(--brand-light)]/30 mx-auto mb-2" />
                      <span className="text-xs text-[var(--brand-light)]/40">{t('coverImage.clickToUpload')}</span>
                      <span className="block text-[10px] text-[var(--brand-light)]/30 mt-1">{t('coverImage.squareImage')}</span>
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <button 
                      type="button"
                      onClick={() => document.getElementById('avatar-input')?.click()}
                      className="px-4 py-2.5 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 font-medium hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)] transition-all"
                    >
                      {t('coverImage.chooseFile')}
                    </button>
                    {avatarPreview && (
                      <button 
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-4 py-2.5 rounded-xl bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 text-[var(--brand-red)] font-medium hover:bg-[var(--brand-red)]/20 transition-all flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        {t('coverImage.remove')}
                      </button>
                    )}
                  </div>
                  
                  <div className="bg-[var(--dark-700)] rounded-xl p-3 border border-[var(--dark-500)]">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-[var(--brand-yellow)] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-[var(--brand-light)]/50">
                        {t('coverImage.tip')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <input 
                id="avatar-input"
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 px-4 sm:px-0 pt-4 pb-8">
            <button 
              type="button"
              onClick={() => router.push(redirectPath)}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 font-medium hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)] transition-all disabled:opacity-50"
            >
              {t('buttons.cancel')}
            </button>
            <button 
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('buttons.saving') : initialData ? t('buttons.update') : t('buttons.create')}
            </button>
          </div>

        </form>
      </div>

      </div>
  );
}
