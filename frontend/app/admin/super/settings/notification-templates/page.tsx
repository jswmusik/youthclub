'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { 
  Bell, 
  Search, 
  ChevronRight, 
  Eye, 
  Save,
  Languages,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '../../../../../hooks/useToast';

interface NotificationTemplateTranslation {
  id: number;
  language: string;
  language_display: string;
  title: string;
  body: string;
  updated_at: string;
}

interface NotificationTemplate {
  id: number;
  type: string;
  type_display: string;
  name: string;
  description: string;
  category: string;
  category_display: string;
  available_variables: { name: string; description: string }[];
  is_active: boolean;
  translations: NotificationTemplateTranslation[];
  created_at: string;
  updated_at: string;
}

interface Language {
  value: string;
  labelKey: string;
}

const LANGUAGES: Language[] = [
  { value: 'sv', labelKey: 'languages.swedish' },
  { value: 'en', labelKey: 'languages.english' },
  { value: 'ar', labelKey: 'languages.arabic' },
  { value: 'da', labelKey: 'languages.danish' },
  { value: 'fi', labelKey: 'languages.finnish' },
  { value: 'nb', labelKey: 'languages.norwegian' },
  { value: 'prs', labelKey: 'languages.dariPersian' },
  { value: 'so', labelKey: 'languages.somali' },
];

export default function NotificationTemplatesPage() {
  const t = useTranslations('notificationTemplates');
  const { success, error: showError } = useToast();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Template editing
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('sv');
  const [editedTitle, setEditedTitle] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<{ title: string; body: string } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      // Fetch all templates (override pagination with high page_size)
      const response = await api.get('/notifications/templates/?page_size=100');
      setTemplates(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchTemplates();
      setLoading(false);
    };
    loadData();
  }, [fetchTemplates]);

  const handleSelectTemplate = async (template: NotificationTemplate) => {
    try {
      const response = await api.get(`/notifications/templates/${template.id}/`);
      setSelectedTemplate(response.data);
      
      // Load the translation for the selected language
      const translation = response.data.translations.find(
        (t: NotificationTemplateTranslation) => t.language === selectedLanguage
      );
      if (translation) {
        setEditedTitle(translation.title);
        setEditedBody(translation.body);
      } else {
        setEditedTitle('');
        setEditedBody('');
      }
    } catch (err) {
      console.error('Error fetching template details:', err);
      showError(t('toast.loadDetailsFailed'));
    }
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    if (selectedTemplate) {
      const translation = selectedTemplate.translations.find(t => t.language === language);
      if (translation) {
        setEditedTitle(translation.title);
        setEditedBody(translation.body);
      } else {
        setEditedTitle('');
        setEditedBody('');
      }
    }
  };

  const handleSaveTranslation = async () => {
    if (!selectedTemplate) return;
    
    setIsSaving(true);
    try {
      await api.post(`/notifications/templates/${selectedTemplate.id}/translations/${selectedLanguage}/`, {
        title: editedTitle,
        body: editedBody,
      });
      
      // Refresh template
      await handleSelectTemplate(selectedTemplate);
      await fetchTemplates();
      success(t('toast.saveSuccess'));
    } catch (err) {
      console.error('Error saving translation:', err);
      showError(t('toast.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (template: NotificationTemplate) => {
    try {
      await api.patch(`/notifications/templates/${template.id}/`, {
        is_active: !template.is_active,
      });
      await fetchTemplates();
      success(template.is_active ? t('toast.templateDisabled') : t('toast.templateEnabled'));
    } catch (err) {
      console.error('Error toggling template:', err);
      showError(t('toast.updateFailed'));
    }
  };

  const handlePreview = async () => {
    if (!selectedTemplate) return;
    
    setIsPreviewLoading(true);
    try {
      const response = await api.post(`/notifications/templates/${selectedTemplate.id}/preview/`, {
        language: selectedLanguage,
      });
      setPreviewContent(response.data);
      setShowPreview(true);
    } catch (err) {
      console.error('Error generating preview:', err);
      showError(t('toast.previewFailed'));
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.type_display.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category_display.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'EVENT': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'BOOKING': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'REWARD': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'NEWS': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'GROUP': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'SYSTEM': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'INVENTORY': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'QUESTIONNAIRE': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
            <Bell className="h-6 w-6 text-[var(--dark-900)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
            <p className="text-sm text-[var(--brand-light)]/50">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1 bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
          <div className="p-4 border-b border-[var(--dark-600)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40" />
              <Input
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40"
              />
            </div>
          </div>
          
          <div className="divide-y divide-[var(--dark-600)] max-h-[600px] overflow-y-auto">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`w-full p-4 text-left hover:bg-[var(--dark-700)] transition-colors ${
                  selectedTemplate?.id === template.id ? 'bg-[var(--brand-primary)]/10' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[var(--brand-light)] truncate">
                        {template.name}
                      </span>
                      {!template.is_active && (
                        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                          {t('disabled')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-[10px] ${getCategoryColor(template.category)}`}>
                        {template.category_display}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {template.translations?.length > 0 ? (
                        template.translations.map((trans) => (
                          <span
                            key={trans.language}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--dark-600)] text-[var(--brand-light)]/70"
                          >
                            {trans.language.toUpperCase()}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-[var(--brand-light)]/60">{t('noTranslations')}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--brand-light)]/30 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-2 bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
          {selectedTemplate ? (
            <div className="flex flex-col h-full">
              {/* Editor Header */}
              <div className="p-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-[var(--brand-light)]">{selectedTemplate.name}</h2>
                    <p className="text-sm text-[var(--brand-light)]/50">{selectedTemplate.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={selectedTemplate.is_active}
                      onCheckedChange={() => handleToggleActive(selectedTemplate)}
                    />
                    <span className="text-sm text-[var(--brand-light)]/70">
                      {selectedTemplate.is_active ? t('editor.active') : t('disabled')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Language Selector */}
              <div className="px-4 py-3 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/20">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-[var(--brand-primary)]" />
                    <Label className="text-sm font-medium text-[var(--brand-light)]">{t('editor.language')}</Label>
                  </div>
                  <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-48 bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {t(lang.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Quick language badges */}
                  <div className="hidden sm:flex items-center gap-1">
                    {LANGUAGES.map((lang) => {
                      const hasTranslation = selectedTemplate.translations?.some(trans => trans.language === lang.value);
                      return (
                        <button
                          key={lang.value}
                          onClick={() => handleLanguageChange(lang.value)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            selectedLanguage === lang.value
                              ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                              : hasTranslation
                              ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-500)]'
                              : 'bg-[var(--dark-700)] text-[var(--brand-light)]/40 hover:bg-[var(--dark-600)]'
                          }`}
                        >
                          {lang.value.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Editor Form */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {/* Available Variables */}
                {selectedTemplate.available_variables?.length > 0 && (
                  <div className="p-3 bg-[var(--dark-700)] rounded-lg border border-[var(--dark-500)]">
                    <p className="text-xs font-medium text-[var(--brand-light)]/70 mb-2">{t('editor.availableVariables')}</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.available_variables.map((variable) => (
                        <code
                          key={variable.name}
                          className="text-xs px-2 py-1 bg-[var(--dark-600)] rounded text-[var(--brand-primary)] cursor-help"
                          title={variable.description}
                        >
                          {'{{' + variable.name + '}}'}
                        </code>
                      ))}
                    </div>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-[var(--brand-light)]">{t('editor.notificationTitle')}</Label>
                  <Input
                    id="title"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    placeholder={t('editor.titlePlaceholder')}
                    className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40"
                  />
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <Label htmlFor="body" className="text-sm font-medium text-[var(--brand-light)]">{t('editor.notificationBody')}</Label>
                  <Textarea
                    id="body"
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    placeholder={t('editor.bodyPlaceholder')}
                    className="bg-[var(--dark-700)] border-[var(--dark-500)] min-h-[150px] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40"
                  />
                  <p className="text-xs text-[var(--brand-light)]/50">
                    {t('editor.bodyHelp')}
                  </p>
                </div>
              </div>

              {/* Editor Footer */}
              <div className="p-4 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreview}
                    disabled={isPreviewLoading || !editedTitle || !editedBody}
                    className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-600)] disabled:text-[var(--brand-light)]/30"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {t('editor.preview')}
                  </Button>
                </div>
                <Button
                  onClick={handleSaveTranslation}
                  disabled={isSaving || !editedTitle || !editedBody}
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 text-[var(--dark-900)]"
                >
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {t('editor.saveTranslation')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--dark-700)] flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-[var(--brand-light)]/30" />
              </div>
              <h3 className="text-lg font-medium text-[var(--brand-light)]">{t('selectTemplate.title')}</h3>
              <p className="text-sm text-[var(--brand-light)]/50 mt-2 max-w-sm">
                {t('selectTemplate.subtitle')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg bg-[var(--dark-800)] border-[var(--dark-600)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--brand-light)]">{t('previewModal.title')}</DialogTitle>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {t('previewModal.subtitle')}
            </DialogDescription>
          </DialogHeader>
          
          {previewContent && (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--dark-700)] rounded-lg border border-[var(--dark-500)]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--brand-primary)]/20 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-5 w-5 text-[var(--brand-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[var(--brand-light)]">{previewContent.title}</h4>
                    <p className="text-sm text-[var(--brand-light)]/70 mt-1">{previewContent.body}</p>
                    <p className="text-xs text-[var(--brand-light)]/40 mt-2">{t('previewModal.justNow')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

