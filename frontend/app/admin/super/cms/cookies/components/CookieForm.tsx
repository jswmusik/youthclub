'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import RichTextEditor from '@/app/components/RichTextEditor';
import { cmsApi } from '@/lib/cms-api';
import { useToast } from '../../../../../../hooks/useToast';
import { Loader2, Save } from 'lucide-react';

export default function CookieForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations('cmsAdmin.cookies');
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    version: '',
    title: t('form.defaultTitle'),
    description: t('form.defaultDescription'),
    policy_text: '',
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await cmsApi.createCookie(formData);
      showToast(t('toast.published'), "success");
      setFormData({ ...formData, version: '', policy_text: '' });
      onSuccess();
    } catch (error) {
      showToast(t('toast.publishFailed'), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
            {t('form.version')}
          </label>
          <input
            type="text"
            value={formData.version}
            onChange={e => setFormData({...formData, version: e.target.value})}
            className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
            placeholder={t('form.versionPlaceholder')}
            required
          />
          <p className="text-xs text-[var(--brand-light)]/40 mt-1">{t('form.versionHelp')}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
            {t('form.bannerTitle')}
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
          {t('form.shortDescription')}
        </label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
          rows={2}
          className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
          {t('form.fullPolicyText')}
        </label>
        <RichTextEditor 
          content={formData.policy_text}
          onChange={html => setFormData({...formData, policy_text: html})}
          minHeight="200px"
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[var(--dark-600)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFormData({...formData, is_active: !formData.is_active})}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              formData.is_active ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-600)]'
            }`}
          >
            <span 
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                formData.is_active ? 'left-6' : 'left-1'
              }`}
            />
          </button>
          <label className="text-sm text-[var(--brand-light)]/70">
            {t('form.activeImmediately')}
          </label>
        </div>
        <button
          type="submit"
          disabled={saving || !formData.version}
          className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          <Save className="w-4 h-4" />
          {t('form.publishButton')}
        </button>
      </div>
    </form>
  );
}
