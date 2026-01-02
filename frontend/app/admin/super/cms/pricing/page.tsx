'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Save, Plus, Edit, Trash2, GripVertical, Eye, AlertTriangle,
  FileText, MessageSquare, Search, Sparkles, ArrowLeft
} from 'lucide-react';
import { useToast } from '../../../../../hooks/useToast';
import Skeleton from '@/app/components/ui/Skeleton';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PricingContent {
  id?: number;
  hero_title: string;
  hero_subtitle: string;
  hero_tagline: string;
  cta_title: string;
  cta_description: string;
  cta_button_text: string;
  cta_button_url: string;
  trust_section_title: string;
  trust_section_description: string;
  trust_stat_municipalities: string;
  trust_stat_active_users: string;
  trust_stat_satisfaction: string;
  trust_stat_uptime: string;
  meta_title: string;
  meta_description: string;
  og_title: string;
  og_description: string;
  og_image: string | null;
  ai_description: string;
}

interface FAQ {
  id?: number;
  question: string;
  answer: string;
  order: number;
  is_active: boolean;
}

// Sortable FAQ Item Component
function SortableFAQItem({ 
  faq, 
  onEdit, 
  onDelete,
  hiddenLabel
}: { 
  faq: FAQ; 
  onEdit: (faq: FAQ) => void; 
  onDelete: (faq: FAQ) => void;
  hiddenLabel: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: faq.id || 0 });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
        faq.is_active
          ? 'bg-[var(--dark-700)] border-[var(--dark-600)]'
          : 'bg-[var(--dark-700)]/50 border-[var(--dark-600)]/50 opacity-60'
      } ${isDragging ? 'shadow-lg ring-2 ring-[var(--brand-primary)]/50' : ''}`}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="text-[var(--brand-light)]/40 pt-1 cursor-grab active:cursor-grabbing hover:text-[var(--brand-light)]/60"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-[var(--brand-light)] mb-1">{faq.question}</h4>
        <p className="text-sm text-[var(--brand-light)]/60 line-clamp-2">{faq.answer}</p>
      </div>
      <div className="flex items-center gap-2">
        {!faq.is_active && (
          <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
            {hiddenLabel}
          </span>
        )}
        <button
          onClick={() => onEdit(faq)}
          className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-all flex items-center justify-center"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(faq)}
          className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20 transition-all flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function PricingCMSPage() {
  const t = useTranslations('cmsAdmin.pricing');
  const [content, setContent] = useState<PricingContent>({
    hero_title: '',
    hero_subtitle: '',
    hero_tagline: '',
    cta_title: '',
    cta_description: '',
    cta_button_text: '',
    cta_button_url: '',
    trust_section_title: '',
    trust_section_description: '',
    trust_stat_municipalities: '50+',
    trust_stat_active_users: '100K+',
    trust_stat_satisfaction: '4.9/5',
    trust_stat_uptime: '99.9%',
    meta_title: '',
    meta_description: '',
    og_title: '',
    og_description: '',
    og_image: null,
    ai_description: '',
  });
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingFaq, setSavingFaq] = useState(false);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<FAQ | null>(null);
  const { success, error } = useToast();

  const inputClasses = `
    w-full px-4 py-3.5 
    bg-[var(--dark-700)] 
    border-2 border-[var(--dark-500)]
    rounded-xl 
    text-[var(--brand-light)] 
    placeholder-[var(--brand-light)]/40 
    focus:ring-0 focus:border-[var(--brand-primary)] 
    outline-none 
    transition-all duration-200
    text-base
  `;

  const labelClasses = "block text-sm font-semibold text-[var(--brand-light)]/80 mb-2";

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contentRes, faqsRes] = await Promise.all([
        api.get('/cms/pricing-content/'),
        api.get('/cms/pricing-faqs/')
      ]);
      
      if (contentRes.data) {
        setContent(contentRes.data);
      }
      
      const faqData = faqsRes.data.results || faqsRes.data;
      setFaqs(Array.isArray(faqData) ? faqData : []);
    } catch (err) {
      console.error('Failed to fetch pricing data:', err);
      error(t('toast.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContent = async () => {
    try {
      setSaving(true);
      await api.patch('/cms/pricing-content/update_content/', content);
      success(t('toast.saveSuccess'));
    } catch (err) {
      console.error('Failed to save content:', err);
      error(t('toast.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFaq = async () => {
    if (!editingFaq?.question?.trim() || !editingFaq?.answer?.trim()) {
      error(t('toast.faqQuestionAnswerRequired'));
      return;
    }

    try {
      setSavingFaq(true);
      if (editingFaq.id) {
        await api.patch(`/cms/pricing-faqs/${editingFaq.id}/`, editingFaq);
        success(t('toast.faqUpdateSuccess'));
      } else {
        await api.post('/cms/pricing-faqs/', {
          ...editingFaq,
          order: faqs.length
        });
        success(t('toast.faqCreateSuccess'));
      }
      setFaqDialogOpen(false);
      setEditingFaq(null);
      fetchData();
    } catch (err) {
      console.error('Failed to save FAQ:', err);
      error(t('toast.faqSaveFailed'));
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async () => {
    if (!faqToDelete?.id) return;

    try {
      await api.delete(`/cms/pricing-faqs/${faqToDelete.id}/`);
      success(t('toast.faqDeleteSuccess'));
      setDeleteDialogOpen(false);
      setFaqToDelete(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete FAQ:', err);
      error(t('toast.faqDeleteFailed'));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = faqs.findIndex((faq) => faq.id === active.id);
      const newIndex = faqs.findIndex((faq) => faq.id === over.id);

      const newFaqs = arrayMove(faqs, oldIndex, newIndex);
      
      // Update local state immediately for responsive UI
      setFaqs(newFaqs);

      // Update order in backend
      try {
        const updatePromises = newFaqs.map((faq, index) => 
          api.patch(`/cms/pricing-faqs/${faq.id}/`, { order: index })
        );
        await Promise.all(updatePromises);
        success(t('toast.faqReorderSuccess'));
      } catch (err) {
        console.error('Failed to update FAQ order:', err);
        error(t('toast.faqReorderFailed'));
        // Revert on error
        fetchData();
      }
    }
  };

  const openNewFaq = () => {
    setEditingFaq({
      question: '',
      answer: '',
      order: faqs.length,
      is_active: true
    });
    setFaqDialogOpen(true);
  };

  const openEditFaq = (faq: FAQ) => {
    setEditingFaq({ ...faq });
    setFaqDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
        <div className="sm:max-w-3xl sm:mx-auto sm:px-6">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-3xl sm:mx-auto sm:px-6">
        
        {/* Header with Back Button */}
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8 px-4 sm:px-0">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/super/cms"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                {t('heroSection.title')}
              </h1>
              <p className="text-[var(--brand-light)]/50 text-sm mt-1">
                {t('heroSection.description')}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-700)]"
            onClick={() => window.open('/pricing', '_blank')}
          >
            <Eye className="w-4 h-4 mr-2" />
            {t('previewButton')}
          </Button>
        </div>

        {/* Hero Section Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('heroSection.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('heroSection.description')}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className={labelClasses}>{t('heroSection.taglineLabel')}</label>
              <Input
                value={content.hero_tagline}
                onChange={(e) => setContent({ ...content, hero_tagline: e.target.value })}
                placeholder={t('heroSection.taglinePlaceholder')}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>{t('heroSection.titleLabel')}</label>
              <Input
                value={content.hero_title}
                onChange={(e) => setContent({ ...content, hero_title: e.target.value })}
                placeholder={t('heroSection.titlePlaceholder')}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>{t('heroSection.subtitleLabel')}</label>
              <Textarea
                value={content.hero_subtitle}
                onChange={(e) => setContent({ ...content, hero_subtitle: e.target.value })}
                placeholder={t('heroSection.subtitlePlaceholder')}
                rows={3}
                className={`${inputClasses} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* CTA Section Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('ctaSection.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('ctaSection.description')}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className={labelClasses}>{t('ctaSection.ctaTitleLabel')}</label>
              <Input
                value={content.cta_title}
                onChange={(e) => setContent({ ...content, cta_title: e.target.value })}
                placeholder={t('ctaSection.ctaTitlePlaceholder')}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>{t('ctaSection.ctaDescriptionLabel')}</label>
              <Textarea
                value={content.cta_description}
                onChange={(e) => setContent({ ...content, cta_description: e.target.value })}
                placeholder={t('ctaSection.ctaDescriptionPlaceholder')}
                rows={2}
                className={`${inputClasses} resize-none`}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClasses}>{t('ctaSection.buttonTextLabel')}</label>
                <Input
                  value={content.cta_button_text}
                  onChange={(e) => setContent({ ...content, cta_button_text: e.target.value })}
                  placeholder={t('ctaSection.buttonTextPlaceholder')}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>{t('ctaSection.buttonUrlLabel')}</label>
                <Input
                  value={content.cta_button_url}
                  onChange={(e) => setContent({ ...content, cta_button_url: e.target.value })}
                  placeholder={t('ctaSection.buttonUrlPlaceholder')}
                  className={inputClasses}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Trust Section Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('trustSection.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('trustSection.description')}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className={labelClasses}>{t('trustSection.sectionTitleLabel')}</label>
              <Input
                value={content.trust_section_title}
                onChange={(e) => setContent({ ...content, trust_section_title: e.target.value })}
                placeholder={t('trustSection.sectionTitlePlaceholder')}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>{t('trustSection.descriptionLabel')}</label>
              <Textarea
                value={content.trust_section_description}
                onChange={(e) => setContent({ ...content, trust_section_description: e.target.value })}
                placeholder={t('trustSection.descriptionPlaceholder')}
                rows={3}
                className={`${inputClasses} resize-none`}
              />
            </div>
            
            {/* Trust Stats */}
            <div className="pt-4 border-t border-[var(--dark-600)]">
              <label className={`${labelClasses} mb-4`}>{t('trustSection.statsTitle')}</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--brand-light)]/60 mb-2">{t('trustSection.municipalitiesLabel')}</label>
                  <Input
                    value={content.trust_stat_municipalities}
                    onChange={(e) => setContent({ ...content, trust_stat_municipalities: e.target.value })}
                    placeholder={t('trustSection.municipalitiesPlaceholder')}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--brand-light)]/60 mb-2">{t('trustSection.activeUsersLabel')}</label>
                  <Input
                    value={content.trust_stat_active_users}
                    onChange={(e) => setContent({ ...content, trust_stat_active_users: e.target.value })}
                    placeholder={t('trustSection.activeUsersPlaceholder')}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--brand-light)]/60 mb-2">{t('trustSection.satisfactionLabel')}</label>
                  <Input
                    value={content.trust_stat_satisfaction}
                    onChange={(e) => setContent({ ...content, trust_stat_satisfaction: e.target.value })}
                    placeholder={t('trustSection.satisfactionPlaceholder')}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--brand-light)]/60 mb-2">{t('trustSection.uptimeLabel')}</label>
                  <Input
                    value={content.trust_stat_uptime}
                    onChange={(e) => setContent({ ...content, trust_stat_uptime: e.target.value })}
                    placeholder={t('trustSection.uptimePlaceholder')}
                    className={inputClasses}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEO Section Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)] flex items-center justify-center">
                <Search className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('seoSection.title')}</h2>
                <p className="text-sm text-[var(--brand-light)]/50">{t('seoSection.description')}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className={labelClasses}>{t('seoSection.metaTitleLabel')}</label>
              <Input
                value={content.meta_title}
                onChange={(e) => setContent({ ...content, meta_title: e.target.value })}
                placeholder={t('seoSection.metaTitlePlaceholder')}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>{t('seoSection.metaDescriptionLabel')}</label>
              <Textarea
                value={content.meta_description}
                onChange={(e) => setContent({ ...content, meta_description: e.target.value })}
                placeholder={t('seoSection.metaDescriptionPlaceholder')}
                rows={2}
                className={`${inputClasses} resize-none`}
              />
            </div>
            <div className="h-px bg-[var(--dark-600)]" />
            <div>
              <label className={labelClasses}>{t('seoSection.ogTitleLabel')}</label>
              <Input
                value={content.og_title}
                onChange={(e) => setContent({ ...content, og_title: e.target.value })}
                placeholder={t('seoSection.ogTitlePlaceholder')}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>{t('seoSection.ogDescriptionLabel')}</label>
              <Textarea
                value={content.og_description}
                onChange={(e) => setContent({ ...content, og_description: e.target.value })}
                placeholder={t('seoSection.ogDescriptionPlaceholder')}
                rows={2}
                className={`${inputClasses} resize-none`}
              />
            </div>
            <div className="h-px bg-[var(--dark-600)]" />
            <div>
              <label className={labelClasses}>{t('seoSection.aiDescriptionLabel')}</label>
              <Textarea
                value={content.ai_description}
                onChange={(e) => setContent({ ...content, ai_description: e.target.value })}
                placeholder={t('seoSection.aiDescriptionPlaceholder')}
                rows={2}
                className={`${inputClasses} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Save Content Button */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 flex justify-end">
            <Button
              onClick={handleSaveContent}
              disabled={saving}
              className="px-8 py-3 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[180px]"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-[var(--dark-900)]/20 border-t-[var(--dark-900)] rounded-full animate-spin" />
                  {t('savingContent')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('saveContentButton')}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* FAQs Section Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('faqsSection.title')}</h2>
                  <p className="text-sm text-[var(--brand-light)]/50">{t('faqsSection.description')}</p>
                </div>
              </div>
              <Button
                onClick={openNewFaq}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)]"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('faqsSection.addFaqButton')}
              </Button>
            </div>
          </div>
          <div className="p-6">
            {faqs.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-[var(--brand-light)]/30 mx-auto mb-4" />
                <p className="text-[var(--brand-light)]/60 mb-4">{t('faqsSection.noFaqsYet')}</p>
                <Button onClick={openNewFaq} variant="outline" className="border-[var(--dark-500)]">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('faqsSection.addFaqButton')}
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={faqs.map(faq => faq.id || 0)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {faqs.map((faq) => (
                      <SortableFAQItem
                        key={faq.id}
                        faq={faq}
                        onEdit={openEditFaq}
                        onDelete={(faq) => {
                          setFaqToDelete(faq);
                          setDeleteDialogOpen(true);
                        }}
                        hiddenLabel={t('faqsSection.hiddenBadge')}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

      </div>

      {/* FAQ Dialog */}
      <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
        <DialogContent className="max-w-lg bg-[var(--dark-800)] border-[var(--dark-600)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--brand-light)]">
              {editingFaq?.id ? t('faqDialog.editTitle') : t('faqDialog.addTitle')}
            </DialogTitle>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {editingFaq?.id ? t('faqDialog.editDescription') : t('faqDialog.addDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('faqDialog.questionLabel')}</Label>
              <Input
                value={editingFaq?.question || ''}
                onChange={(e) => setEditingFaq(prev => prev ? { ...prev, question: e.target.value } : null)}
                placeholder={t('faqDialog.questionPlaceholder')}
                className={inputClasses}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('faqDialog.answerLabel')}</Label>
              <Textarea
                value={editingFaq?.answer || ''}
                onChange={(e) => setEditingFaq(prev => prev ? { ...prev, answer: e.target.value } : null)}
                placeholder={t('faqDialog.answerPlaceholder')}
                rows={4}
                className={`${inputClasses} resize-none`}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--dark-700)]">
              <div>
                <Label className="text-[var(--brand-light)]">{t('faqDialog.activeLabel')}</Label>
                <p className="text-xs text-[var(--brand-light)]/50">{t('faqDialog.activeDescription')}</p>
              </div>
              <Switch
                checked={editingFaq?.is_active ?? true}
                onCheckedChange={(checked) => setEditingFaq(prev => prev ? { ...prev, is_active: checked } : null)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setFaqDialogOpen(false);
                setEditingFaq(null);
              }}
              className="text-[var(--brand-light)] hover:bg-[var(--dark-700)]"
            >
              {t('faqDialog.cancelButton')}
            </Button>
            <Button
              onClick={handleSaveFaq}
              disabled={savingFaq}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)]"
            >
              {savingFaq ? t('faqDialog.savingButton') : editingFaq?.id ? t('faqDialog.updateButton') : t('faqDialog.addButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md bg-[var(--dark-800)] border-[var(--dark-600)]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <DialogTitle className="text-[var(--brand-light)]">{t('deleteDialog.title')}</DialogTitle>
            </div>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {t('deleteDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteDialogOpen(false);
                setFaqToDelete(null);
              }}
              className="text-[var(--brand-light)] hover:bg-[var(--dark-700)]"
            >
              {t('deleteDialog.cancelButton')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFaq}
              className="bg-red-500 hover:bg-red-600"
            >
              {t('deleteDialog.deleteButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
