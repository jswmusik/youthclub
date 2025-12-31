'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Info, AlertCircle, AlertTriangle, Link as LinkIcon, MessageSquare, Settings, Users, Clock, Pin } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';

interface MessageFormProps {
  redirectPath: string;
}

export default function MessageForm({ redirectPath }: MessageFormProps) {
  const t = useTranslations('systemMessages.form');
  const tRoles = useTranslations('systemMessages.roles');
  const router = useRouter();
  
  const ROLES = [
    { id: 'PUBLIC', label: tRoles('public') },
    { id: 'SUPER_ADMIN', label: tRoles('superAdmin') },
    { id: 'MUNICIPALITY_ADMIN', label: tRoles('municipalityAdmin') },
    { id: 'CLUB_ADMIN', label: tRoles('clubAdmin') },
    { id: 'YOUTH_MEMBER', label: tRoles('youthMember') },
    { id: 'GUARDIAN', label: tRoles('guardian') },
  ];
  const [loading, setLoading] = useState(false);
  const { success, error, info, warning } = useToast();
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    message_type: 'INFO',
    target_all: true,
    selected_roles: [] as string[],
    days_active: 7,
    is_sticky: false,
    external_link: ''
  });

  // Calculate progress
  const calculateProgress = () => {
    let filled = 0;
    let total = 2; // title and message are required
    if (formData.title.trim()) filled++;
    if (formData.message.trim()) filled++;
    return Math.round((filled / total) * 100);
  };

  const toggleRole = (role: string) => {
    setFormData(prev => {
      const list = prev.selected_roles.includes(role)
        ? prev.selected_roles.filter(r => r !== role)
        : [...prev.selected_roles, role];
      return { ...prev, selected_roles: list };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (!formData.target_all && formData.selected_roles.length === 0) {
      error(t('validation.selectRole'));
      setLoading(false);
      return;
    }
    
    const expires = new Date();
    expires.setDate(expires.getDate() + parseInt(formData.days_active.toString()));

    const payload: any = {
      title: formData.title.trim(),
      message: formData.message.trim(),
      message_type: formData.message_type,
      target_roles: formData.target_all ? ['ALL'] : formData.selected_roles,
      is_sticky: formData.is_sticky,
      expires_at: expires.toISOString()
    };

    if (formData.external_link && formData.external_link.trim()) {
      payload.external_link = formData.external_link.trim();
    }

    try {
      await api.post('/messages/', payload);
      success(t('toasts.createSuccess'));
      setTimeout(() => router.push(redirectPath), 1000);
    } catch (err: any) {
      console.error('Error creating message:', err);
      const errorMessage = err?.response?.data?.message || 
                          err?.response?.data?.detail || 
                          (typeof err?.response?.data === 'object' ? JSON.stringify(err.response.data) : t('toasts.createFailed'));
      error(errorMessage);
      setLoading(false);
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch(type) {
      case 'INFO': return <Info className="h-5 w-5" />;
      case 'IMPORTANT': return <AlertCircle className="h-5 w-5" />;
      case 'WARNING': return <AlertTriangle className="h-5 w-5" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  const getMessageTypeStyle = (type: string) => {
    switch(type) {
      case 'INFO': return {
        bg: 'bg-[var(--brand-blue)]',
        text: 'text-[var(--brand-blue)]',
        border: 'border-[var(--brand-blue)]'
      };
      case 'IMPORTANT': return {
        bg: 'bg-[#F59E0B]',
        text: 'text-[#F59E0B]',
        border: 'border-[#F59E0B]'
      };
      case 'WARNING': return {
        bg: 'bg-[var(--brand-red)]',
        text: 'text-[var(--brand-red)]',
        border: 'border-[var(--brand-red)]'
      };
      default: return {
        bg: 'bg-[var(--brand-blue)]',
        text: 'text-[var(--brand-blue)]',
        border: 'border-[var(--brand-blue)]'
      };
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

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1rem'
  };

  const progress = calculateProgress();
  const typeStyle = getMessageTypeStyle(formData.message_type);

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
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
            <p className="text-sm text-[var(--brand-light)]/50">{t('subtitle')}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] px-4 sm:px-6 py-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--brand-light)]/50">{t('progress.requiredFields')}</span>
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
          
          {/* Message Details Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            {/* Card Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--brand-light)]">{t('messageDetails.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('messageDetails.subtitle')}</p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="px-4 sm:px-6 py-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                  {t('messageDetails.titleLabel')} <span className="text-[var(--brand-red)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('messageDetails.titlePlaceholder')}
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  onFocus={() => setFocusedField('title')}
                  onBlur={() => setFocusedField(null)}
                  className={inputClasses('title')}
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                  {t('messageDetails.messageLabel')} <span className="text-[var(--brand-red)]">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder={t('messageDetails.messagePlaceholder')}
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  onFocus={() => setFocusedField('message')}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full px-4 py-3 rounded-xl bg-[var(--dark-700)] border-2 ${focusedField === 'message' ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'} text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none transition-all resize-none hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20`}
                />
              </div>

              {/* External Link */}
              <div>
                <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                  {t('messageDetails.externalLinkLabel')}
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--brand-light)]/40" />
                  <input
                    type="url"
                    placeholder={t('messageDetails.externalLinkPlaceholder')}
                    value={formData.external_link}
                    onChange={e => setFormData({...formData, external_link: e.target.value})}
                    onFocus={() => setFocusedField('external_link')}
                    onBlur={() => setFocusedField(null)}
                    className={`${inputClasses('external_link')} pl-11`}
                  />
                </div>
                <p className="text-xs text-[var(--brand-light)]/40 mt-2">
                  {t('messageDetails.externalLinkHelp')}
                </p>
              </div>
            </div>
          </div>

          {/* Message Settings Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            {/* Card Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center">
                  <Settings className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--brand-light)]">{t('settings.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('settings.subtitle')}</p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="px-4 sm:px-6 py-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Message Type */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('settings.messageTypeLabel')}
                  </label>
                  <select
                    value={formData.message_type}
                    onChange={e => setFormData({...formData, message_type: e.target.value})}
                    className="w-full h-12 px-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] outline-none transition-all appearance-none cursor-pointer hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]"
                    style={selectArrowStyle}
                  >
                    <option value="INFO">{t('settings.messageTypeInfo')}</option>
                    <option value="IMPORTANT">{t('settings.messageTypeImportant')}</option>
                    <option value="WARNING">{t('settings.messageTypeWarning')}</option>
                  </select>
                  
                  {/* Type Preview */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${typeStyle.bg} flex items-center justify-center`}>
                      {getMessageTypeIcon(formData.message_type)}
                      <span className="text-white">{/* Icon renders here */}</span>
                    </div>
                    <span className={`text-sm font-medium ${typeStyle.text}`}>
                      {formData.message_type}
                    </span>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                    {t('settings.durationLabel')} <span className="text-[var(--brand-red)]">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--brand-light)]/40" />
                    <input
                      type="number"
                      min="1"
                      max="365"
                      required
                      value={formData.days_active}
                      onChange={e => setFormData({...formData, days_active: parseInt(e.target.value) || 7})}
                      onFocus={() => setFocusedField('days_active')}
                      onBlur={() => setFocusedField(null)}
                      className={`${inputClasses('days_active')} pl-11`}
                    />
                  </div>
                  <p className="text-xs text-[var(--brand-light)]/40 mt-2">
                    {t('settings.durationHelp')}
                  </p>
                </div>
              </div>

              {/* Sticky Message Toggle */}
              <div 
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.is_sticky 
                    ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30' 
                    : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                }`}
                onClick={() => setFormData({...formData, is_sticky: !formData.is_sticky})}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  formData.is_sticky 
                    ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' 
                    : 'border-[var(--dark-400)] bg-transparent'
                }`}>
                  {formData.is_sticky && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Pin className="w-4 h-4 text-[var(--brand-primary)]" />
                    <span className="font-semibold text-[var(--brand-light)]">{t('settings.stickyTitle')}</span>
                  </div>
                  <p className="text-sm text-[var(--brand-light)]/50 mt-1">
                    {t('settings.stickyDescription')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Target Audience Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            {/* Card Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--brand-light)]">{t('audience.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('audience.subtitle')}</p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="px-4 sm:px-6 py-6 space-y-6">
              {/* All Roles Toggle */}
              <div 
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.target_all 
                    ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30' 
                    : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                }`}
                onClick={() => setFormData({...formData, target_all: !formData.target_all, selected_roles: !formData.target_all ? [] : formData.selected_roles})}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  formData.target_all 
                    ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' 
                    : 'border-[var(--dark-400)] bg-transparent'
                }`}>
                  {formData.target_all && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-[var(--brand-light)]">{t('audience.allRolesTitle')}</span>
                  <p className="text-sm text-[var(--brand-light)]/50 mt-1">
                    {t('audience.allRolesDescription')}
                  </p>
                </div>
              </div>

              {/* Specific Roles Selection */}
              {!formData.target_all && (
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-3">
                    {t('audience.selectRolesLabel')}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ROLES.map(role => (
                      <div
                        key={role.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.selected_roles.includes(role.id)
                            ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30'
                            : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                        }`}
                        onClick={() => toggleRole(role.id)}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          formData.selected_roles.includes(role.id)
                            ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]'
                            : 'border-[var(--dark-400)] bg-transparent'
                        }`}>
                          {formData.selected_roles.includes(role.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium text-[var(--brand-light)]">{role.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              disabled={loading || !formData.title.trim() || !formData.message.trim()}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('buttons.sending') : t('buttons.send')}
            </button>
          </div>

        </form>
      </div>

      </div>
  );
}
