'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MenuItem, Page } from '@/types/cms';
import { X, Loader2, Link as LinkIcon, ExternalLink } from 'lucide-react';

type LocationType = 'header' | 'footer' | 'community_footer';

interface MenuFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<MenuItem>) => Promise<void>;
  initialData?: MenuItem | null;
  location: LocationType;
  pages: Page[];
  language: string;
}

export default function MenuFormDialog({ isOpen, onClose, onSave, initialData, location, pages, language }: MenuFormDialogProps) {
  const t = useTranslations('cmsAdmin.navigation.dialog');
  const [label, setLabel] = useState('');
  const [linkType, setLinkType] = useState<'page' | 'external'>('page');
  const [pageId, setPageId] = useState<string>('');
  const [externalUrl, setExternalUrl] = useState('');
  const [order, setOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setLabel(initialData.label);
      setOrder(initialData.order);
      if (initialData.page) {
        setLinkType('page');
        setPageId(initialData.page.toString());
      } else {
        setLinkType('external');
        setExternalUrl(initialData.external_url || '');
      }
    } else {
      // Reset for create mode
      setLabel('');
      setLinkType('page');
      setPageId('');
      setExternalUrl('');
      setOrder(0);
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        label,
        location,
        order,
        language,
        page: linkType === 'page' ? parseInt(pageId) : null,
        external_url: linkType === 'external' ? externalUrl : '',
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[var(--dark-800)] rounded-2xl w-full max-w-md border border-[var(--dark-600)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--dark-600)]">
          <h3 className="text-lg font-semibold text-[var(--brand-light)]">
            {initialData ? t('editTitle') : t('addTitle')}
          </h3>
          <button 
            onClick={onClose} 
            className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors p-2 rounded-lg hover:bg-[var(--dark-700)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">{t('label')}</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
              placeholder={t('labelPlaceholder')}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">{t('linkType')}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLinkType('page')}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-sm ${
                    linkType === 'page'
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                      : 'border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:border-[var(--dark-400)]'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  {t('page')}
                </button>
                <button
                  type="button"
                  onClick={() => setLinkType('external')}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-sm ${
                    linkType === 'external'
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                      : 'border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:border-[var(--dark-400)]'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  {t('url')}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">{t('order')}</label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
              />
            </div>
          </div>

          {linkType === 'page' ? (
            <div>
              <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">{t('selectPage')}</label>
              <select
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors"
                required
              >
                <option value="">{t('selectPagePlaceholder')}</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id.toString()}>
                    {p.title} (/{p.slug})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">{t('externalUrl')}</label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:border-[var(--brand-primary)] transition-colors"
                placeholder={t('externalUrlPlaceholder')}
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--dark-600)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] rounded-xl transition-all font-medium"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !label}
              className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-2.5 transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialData ? t('update') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
