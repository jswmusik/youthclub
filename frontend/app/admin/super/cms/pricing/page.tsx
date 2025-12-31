'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  FileText, MessageSquare, Search, Image as ImageIcon, Sparkles
} from 'lucide-react';
import { useToast } from '../../../../../hooks/useToast';
import Skeleton from '@/app/components/ui/Skeleton';
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
  onDelete 
}: { 
  faq: FAQ; 
  onEdit: (faq: FAQ) => void; 
  onDelete: (faq: FAQ) => void;
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
      className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
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
            Hidden
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(faq)}
          className="text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(faq)}
          className="text-[var(--brand-light)]/60 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
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
  const { showToast } = useToast();

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
    } catch (error) {
      console.error('Failed to fetch pricing data:', error);
      showToast('Failed to load pricing page content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContent = async () => {
    try {
      setSaving(true);
      await api.patch('/cms/pricing-content/update_content/', content);
      showToast('Pricing page content saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save content:', error);
      showToast('Failed to save pricing page content', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFaq = async () => {
    if (!editingFaq?.question?.trim() || !editingFaq?.answer?.trim()) {
      showToast('Question and answer are required', 'error');
      return;
    }

    try {
      setSavingFaq(true);
      if (editingFaq.id) {
        await api.patch(`/cms/pricing-faqs/${editingFaq.id}/`, editingFaq);
        showToast('FAQ updated successfully', 'success');
      } else {
        await api.post('/cms/pricing-faqs/', {
          ...editingFaq,
          order: faqs.length
        });
        showToast('FAQ created successfully', 'success');
      }
      setFaqDialogOpen(false);
      setEditingFaq(null);
      fetchData();
    } catch (error) {
      console.error('Failed to save FAQ:', error);
      showToast('Failed to save FAQ', 'error');
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async () => {
    if (!faqToDelete?.id) return;

    try {
      await api.delete(`/cms/pricing-faqs/${faqToDelete.id}/`);
      showToast('FAQ deleted successfully', 'success');
      setDeleteDialogOpen(false);
      setFaqToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Failed to delete FAQ:', error);
      showToast('Failed to delete FAQ', 'error');
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
        showToast('FAQ order updated', 'success');
      } catch (error) {
        console.error('Failed to update FAQ order:', error);
        showToast('Failed to update FAQ order', 'error');
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
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Preview Link */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-700)]"
          onClick={() => window.open('/pricing', '_blank')}
        >
          <Eye className="w-4 h-4 mr-2" />
          Preview Pricing Page
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hero Section */}
        <Card className="bg-[var(--dark-800)] border-[var(--dark-600)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-[var(--brand-light)]">Hero Section</CardTitle>
                <CardDescription className="text-[var(--brand-light)]/50">
                  Main heading area of the pricing page
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">Tagline (above title)</Label>
              <Input
                value={content.hero_tagline}
                onChange={(e) => setContent({ ...content, hero_tagline: e.target.value })}
                placeholder="e.g., Simple & Transparent"
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">Title</Label>
              <Input
                value={content.hero_title}
                onChange={(e) => setContent({ ...content, hero_title: e.target.value })}
                placeholder="Choose Your Plan"
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">Subtitle</Label>
              <Textarea
                value={content.hero_subtitle}
                onChange={(e) => setContent({ ...content, hero_subtitle: e.target.value })}
                placeholder="Describe your pricing options..."
                rows={3}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="bg-[var(--dark-800)] border-[var(--dark-600)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-sky)] to-[var(--brand-primary)] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-[var(--brand-light)]">Call to Action</CardTitle>
                <CardDescription className="text-[var(--brand-light)]/50">
                  Bottom section encouraging contact
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">CTA Title</Label>
              <Input
                value={content.cta_title}
                onChange={(e) => setContent({ ...content, cta_title: e.target.value })}
                placeholder="Ready to Get Started?"
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">CTA Description</Label>
              <Textarea
                value={content.cta_description}
                onChange={(e) => setContent({ ...content, cta_description: e.target.value })}
                placeholder="Contact us for a personalized demo..."
                rows={2}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[var(--brand-light)]">Button Text</Label>
                <Input
                  value={content.cta_button_text}
                  onChange={(e) => setContent({ ...content, cta_button_text: e.target.value })}
                  placeholder="Contact Us"
                  className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--brand-light)]">Button URL</Label>
                <Input
                  value={content.cta_button_url}
                  onChange={(e) => setContent({ ...content, cta_button_url: e.target.value })}
                  placeholder="/contact"
                  className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trust Section */}
        <Card className="bg-[var(--dark-800)] border-[var(--dark-600)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-[var(--brand-light)]">Trust Section</CardTitle>
                <CardDescription className="text-[var(--brand-light)]/50">
                  Social proof and trust signals
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">Section Title</Label>
              <Input
                value={content.trust_section_title}
                onChange={(e) => setContent({ ...content, trust_section_title: e.target.value })}
                placeholder="Trusted by Municipalities"
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">Description</Label>
              <Textarea
                value={content.trust_section_description}
                onChange={(e) => setContent({ ...content, trust_section_description: e.target.value })}
                placeholder="Join hundreds of municipalities..."
                rows={3}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] resize-none"
              />
            </div>
            
            {/* Trust Stats */}
            <div className="pt-4 border-t border-[var(--dark-600)]">
              <Label className="text-[var(--brand-light)] mb-3 block">Trust Statistics</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[var(--brand-light)]/70 text-xs">Municipalities</Label>
                  <Input
                    value={content.trust_stat_municipalities}
                    onChange={(e) => setContent({ ...content, trust_stat_municipalities: e.target.value })}
                    placeholder="50+"
                    className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[var(--brand-light)]/70 text-xs">Active Users</Label>
                  <Input
                    value={content.trust_stat_active_users}
                    onChange={(e) => setContent({ ...content, trust_stat_active_users: e.target.value })}
                    placeholder="100K+"
                    className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[var(--brand-light)]/70 text-xs">Satisfaction Rating</Label>
                  <Input
                    value={content.trust_stat_satisfaction}
                    onChange={(e) => setContent({ ...content, trust_stat_satisfaction: e.target.value })}
                    placeholder="4.9/5"
                    className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[var(--brand-light)]/70 text-xs">Uptime</Label>
                  <Input
                    value={content.trust_stat_uptime}
                    onChange={(e) => setContent({ ...content, trust_stat_uptime: e.target.value })}
                    placeholder="99.9%"
                    className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SEO Section */}
        <Card className="bg-[var(--dark-800)] border-[var(--dark-600)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-[var(--brand-light)]">SEO & Social</CardTitle>
                <CardDescription className="text-[var(--brand-light)]/50">
                  Search engine and social sharing settings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">Meta Title</Label>
              <Input
                value={content.meta_title}
                onChange={(e) => setContent({ ...content, meta_title: e.target.value })}
                placeholder="Pricing - Ungdomsappen"
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">Meta Description</Label>
              <Textarea
                value={content.meta_description}
                onChange={(e) => setContent({ ...content, meta_description: e.target.value })}
                placeholder="Explore our flexible pricing plans..."
                rows={2}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">OG Title (Social)</Label>
              <Input
                value={content.og_title}
                onChange={(e) => setContent({ ...content, og_title: e.target.value })}
                placeholder="Pricing Plans - Ungdomsappen"
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">OG Description</Label>
              <Textarea
                value={content.og_description}
                onChange={(e) => setContent({ ...content, og_description: e.target.value })}
                placeholder="Description for social sharing..."
                rows={2}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">AI Description</Label>
              <Textarea
                value={content.ai_description}
                onChange={(e) => setContent({ ...content, ai_description: e.target.value })}
                placeholder="Description optimized for AI search engines..."
                rows={2}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] resize-none"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Content Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveContent}
          disabled={saving}
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
        >
          {saving ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Page Content
            </>
          )}
        </Button>
      </div>

      {/* FAQs Section */}
      <Card className="bg-[var(--dark-800)] border-[var(--dark-600)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-pink-500 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-[var(--brand-light)]">Frequently Asked Questions</CardTitle>
                <CardDescription className="text-[var(--brand-light)]/50">
                  Manage FAQ items shown on the pricing page
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={openNewFaq}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add FAQ
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {faqs.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-[var(--brand-light)]/30 mx-auto mb-4" />
              <p className="text-[var(--brand-light)]/60 mb-4">No FAQs yet. Add your first FAQ!</p>
              <Button onClick={openNewFaq} variant="outline" className="border-[var(--dark-500)]">
                <Plus className="w-4 h-4 mr-2" />
                Add FAQ
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
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* FAQ Dialog */}
      <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
        <DialogContent className="max-w-lg bg-[var(--dark-800)] border-[var(--dark-600)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--brand-light)]">
              {editingFaq?.id ? 'Edit FAQ' : 'Add New FAQ'}
            </DialogTitle>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {editingFaq?.id ? 'Update the FAQ question and answer.' : 'Create a new FAQ for the pricing page.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">Question</Label>
              <Input
                value={editingFaq?.question || ''}
                onChange={(e) => setEditingFaq(prev => prev ? { ...prev, question: e.target.value } : null)}
                placeholder="What is included in the plan?"
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">Answer</Label>
              <Textarea
                value={editingFaq?.answer || ''}
                onChange={(e) => setEditingFaq(prev => prev ? { ...prev, answer: e.target.value } : null)}
                placeholder="Provide a detailed answer..."
                rows={4}
                className="bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)] resize-none"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--dark-700)]">
              <div>
                <Label className="text-[var(--brand-light)]">Active</Label>
                <p className="text-xs text-[var(--brand-light)]/50">Show this FAQ on the pricing page</p>
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
              Cancel
            </Button>
            <Button
              onClick={handleSaveFaq}
              disabled={savingFaq}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
            >
              {savingFaq ? 'Saving...' : editingFaq?.id ? 'Update FAQ' : 'Add FAQ'}
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
              <DialogTitle className="text-[var(--brand-light)]">Delete FAQ</DialogTitle>
            </div>
            <DialogDescription className="text-[var(--brand-light)]/60">
              Are you sure you want to delete this FAQ? This action cannot be undone.
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
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFaq}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete FAQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

