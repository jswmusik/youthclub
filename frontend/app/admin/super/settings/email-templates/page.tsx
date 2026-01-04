'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { sanitizeHtml } from '@/lib/sanitize';
import { 
  Mail, 
  Search, 
  Check, 
  X, 
  ChevronRight, 
  Eye, 
  Send, 
  Save,
  Languages,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  FileText,
  List,
  History,
  Code,
  Type
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '../../../../../hooks/useToast';
import dynamic from 'next/dynamic';

// Loading component for the editor (text will be replaced with translation)
const EditorLoadingPlaceholder = () => (
  <div className="h-64 bg-[var(--dark-700)] rounded-xl flex items-center justify-center border border-[var(--dark-500)]">
    <div className="flex items-center gap-2 text-[var(--brand-light)]/40">
      <div className="w-4 h-4 border-2 border-[var(--brand-light)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
    </div>
  </div>
);

// Dynamically import the rich text editor to avoid SSR issues
const DarkRichTextEditor = dynamic(
  () => import('@/app/components/DarkRichTextEditor'),
  { 
    ssr: false,
    loading: () => <EditorLoadingPlaceholder />
  }
);

interface EmailTemplateTranslation {
  id: number;
  language: string;
  language_display: string;
  subject: string;
  body_html: string;
  body_text: string;
  updated_at: string;
}

interface EmailTemplate {
  id: number;
  type: string;
  type_display: string;
  name: string;
  description: string;
  available_variables: { name: string; description: string }[];
  is_active: boolean;
  translations: EmailTemplateTranslation[];
  created_at: string;
  updated_at: string;
}

interface EmailLog {
  id: number;
  recipient_email: string;
  recipient_name: string | null;
  template_type: string;
  subject: string;
  body_preview: string;
  language: string;
  status: string;
  status_display: string;
  error_message: string;
  sent_at: string | null;
  created_at: string;
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

export default function EmailTemplatesPage() {
  const t = useTranslations('emailTemplates');
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'templates' | 'logs'>('templates');
  
  // Template editing
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('sv');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBodyHtml, setEditedBodyHtml] = useState('');
  const [editedBodyText, setEditedBodyText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editorMode, setEditorMode] = useState<'rich' | 'html'>('rich');
  
  // Preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<{ subject: string; body_html: string; body_text: string } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // Test email modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  
  // Log stats
  const [logStats, setLogStats] = useState<{
    total: number;
    last_24h: number;
    last_7d: number;
    last_30d: number;
    by_status: Record<string, number>;
  } | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await api.get('/emails/templates/');
      setTemplates(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching templates:', err);
      showError(t('toast.loadFailed'));
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const [logsResponse, statsResponse] = await Promise.all([
        api.get('/emails/logs/'),
        api.get('/emails/logs/stats/')
      ]);
      setLogs(logsResponse.data.results || logsResponse.data);
      setLogStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTemplates(), fetchLogs()]);
      setLoading(false);
    };
    loadData();
  }, [fetchTemplates, fetchLogs]);

  const handleSelectTemplate = async (template: EmailTemplate) => {
    try {
      const response = await api.get(`/emails/templates/${template.id}/`);
      setSelectedTemplate(response.data);
      
      // Load the translation for the selected language
      const translation = response.data.translations.find(
        (t: EmailTemplateTranslation) => t.language === selectedLanguage
      );
      if (translation) {
        setEditedSubject(translation.subject);
        setEditedBodyHtml(translation.body_html);
        setEditedBodyText(translation.body_text);
      } else {
        setEditedSubject('');
        setEditedBodyHtml('');
        setEditedBodyText('');
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
        setEditedSubject(translation.subject);
        setEditedBodyHtml(translation.body_html);
        setEditedBodyText(translation.body_text);
      } else {
        setEditedSubject('');
        setEditedBodyHtml('');
        setEditedBodyText('');
      }
    }
  };

  const handleSaveTranslation = async () => {
    if (!selectedTemplate) return;
    
    setIsSaving(true);
    try {
      await api.post(`/emails/templates/${selectedTemplate.id}/translations/${selectedLanguage}/`, {
        subject: editedSubject,
        body_html: editedBodyHtml,
        body_text: editedBodyText,
      });
      
      // Refresh template
      await handleSelectTemplate(selectedTemplate);
      success(t('toast.saveSuccess'));
    } catch (err) {
      console.error('Error saving translation:', err);
      showError(t('toast.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      await api.patch(`/emails/templates/${template.id}/`, {
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
      const response = await api.post(`/emails/templates/${selectedTemplate.id}/preview/`, {
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

  const handleSendTest = async () => {
    if (!selectedTemplate || !testEmail) return;
    
    setIsSendingTest(true);
    try {
      const response = await api.post(`/emails/templates/${selectedTemplate.id}/send-test/`, {
        language: selectedLanguage,
        to_email: testEmail,
      });
      
      if (response.data.success) {
        success(t('toast.testSent', { email: testEmail }));
        setShowTestModal(false);
        setTestEmail('');
        fetchLogs(); // Refresh logs
      } else {
        showError(response.data.error || t('toast.testFailed'));
      }
    } catch (err: any) {
      console.error('Error sending test email:', err);
      showError(err.response?.data?.error || t('toast.testFailed'));
    } finally {
      setIsSendingTest(false);
    }
  };

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.type_display.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
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
            <Mail className="h-6 w-6 text-[var(--dark-900)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
            <p className="text-sm text-[var(--brand-light)]/50">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'templates' | 'logs')}>
        <TabsList className="bg-[var(--dark-700)] border border-[var(--dark-500)] p-1">
          <TabsTrigger 
            value="templates" 
            className="text-[var(--brand-light)]/70 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-[var(--dark-900)]"
          >
            <FileText className="h-4 w-4 mr-2" />
            {t('tabs.templates')}
          </TabsTrigger>
          <TabsTrigger 
            value="logs" 
            className="text-[var(--brand-light)]/70 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-[var(--dark-900)]"
          >
            <History className="h-4 w-4 mr-2" />
            {t('tabs.emailLogs')}
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
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
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--brand-light)] truncate">
                            {template.name}
                          </span>
                          {!template.is_active && (
                            <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                              {t('disabled')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[var(--brand-light)]/50 mt-1 truncate">
                          {template.type_display}
                        </p>
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
                    <div className="p-3 bg-[var(--dark-700)] rounded-lg border border-[var(--dark-500)]">
                      <p className="text-xs font-medium text-[var(--brand-light)]/70 mb-2">{t('editor.availableVariables')}</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.available_variables?.map((variable) => (
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

                    {/* Subject */}
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-sm font-medium text-[var(--brand-light)]">{t('editor.subjectLine')}</Label>
                      <Input
                        id="subject"
                        value={editedSubject}
                        onChange={(e) => setEditedSubject(e.target.value)}
                        placeholder={t('editor.subjectPlaceholder')}
                        className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40"
                      />
                    </div>

                    {/* Email Body with Mode Toggle */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-[var(--brand-light)]">{t('editor.emailBody')}</Label>
                        
                        {/* Editor Mode Toggle */}
                        <div className="flex items-center gap-1 p-1 bg-[var(--dark-700)] rounded-lg border border-[var(--dark-500)]">
                          <button
                            type="button"
                            onClick={() => setEditorMode('rich')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                              editorMode === 'rich'
                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                                : 'text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)]'
                            }`}
                          >
                            <Type className="h-3.5 w-3.5" />
                            {t('editor.richText')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditorMode('html')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                              editorMode === 'html'
                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                                : 'text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)]'
                            }`}
                          >
                            <Code className="h-3.5 w-3.5" />
                            {t('editor.html')}
                          </button>
                        </div>
                      </div>
                      
                      {editorMode === 'rich' ? (
                        <DarkRichTextEditor
                          value={editedBodyHtml}
                          onChange={setEditedBodyHtml}
                          placeholder={t('editor.editorPlaceholder')}
                          minHeight="250px"
                        />
                      ) : (
                        <Textarea
                          id="body_html"
                          value={editedBodyHtml}
                          onChange={(e) => setEditedBodyHtml(e.target.value)}
                          placeholder={t('editor.htmlPlaceholder')}
                          className="bg-[var(--dark-700)] border-[var(--dark-500)] min-h-[250px] font-mono text-sm text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40"
                        />
                      )}
                      
                      {editorMode === 'html' && (
                        <p className="text-xs text-[var(--brand-light)]/50">
                          {t('editor.htmlHelp')}
                        </p>
                      )}
                    </div>

                    {/* Plain Text Body */}
                    <div className="space-y-2">
                      <Label htmlFor="body_text" className="text-sm font-medium text-[var(--brand-light)]/70">
                        {t('editor.plainTextVersion')}
                      </Label>
                      <Textarea
                        id="body_text"
                        value={editedBodyText}
                        onChange={(e) => setEditedBodyText(e.target.value)}
                        placeholder={t('editor.plainTextPlaceholder')}
                        className="bg-[var(--dark-700)] border-[var(--dark-500)] min-h-[100px] font-mono text-sm text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40"
                      />
                    </div>
                  </div>

                  {/* Editor Footer */}
                  <div className="p-4 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreview}
                        disabled={isPreviewLoading || !editedSubject || !editedBodyHtml}
                        className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-600)] disabled:text-[var(--brand-light)]/30"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t('editor.preview')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTestEmail(user?.email || '');
                          setShowTestModal(true);
                        }}
                        disabled={!editedSubject || !editedBodyHtml}
                        className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-600)] disabled:text-[var(--brand-light)]/30"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {t('editor.sendTest')}
                      </Button>
                    </div>
                    <Button
                      onClick={handleSaveTranslation}
                      disabled={isSaving || !editedSubject || !editedBodyHtml}
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
                    <Mail className="h-8 w-8 text-[var(--brand-light)]/30" />
                  </div>
                  <h3 className="text-lg font-medium text-[var(--brand-light)]">{t('selectTemplate.title')}</h3>
                  <p className="text-sm text-[var(--brand-light)]/50 mt-2 max-w-sm">
                    {t('selectTemplate.subtitle')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-6">
          {/* Stats Cards */}
          {logStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
                <div className="text-sm text-[var(--brand-light)]/50">{t('logs.stats.totalEmails')}</div>
                <div className="text-2xl font-bold text-[var(--brand-light)]">{logStats.total}</div>
              </div>
              <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
                <div className="text-sm text-[var(--brand-light)]/50">{t('logs.stats.last24h')}</div>
                <div className="text-2xl font-bold text-[var(--brand-primary)]">{logStats.last_24h}</div>
              </div>
              <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
                <div className="text-sm text-[var(--brand-light)]/50">{t('logs.stats.sent')}</div>
                <div className="text-2xl font-bold text-green-400">{logStats.by_status?.sent || 0}</div>
              </div>
              <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
                <div className="text-sm text-[var(--brand-light)]/50">{t('logs.stats.failed')}</div>
                <div className="text-2xl font-bold text-red-400">{logStats.by_status?.failed || 0}</div>
              </div>
            </div>
          )}

          {/* Logs Table */}
          <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
            <div className="p-4 border-b border-[var(--dark-600)] flex items-center justify-between">
              <h3 className="font-semibold text-[var(--brand-light)]">{t('logs.recentEmails')}</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchLogs}
                className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('logs.refresh')}
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--dark-700)]/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--brand-light)]/70">{t('logs.table.status')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--brand-light)]/70">{t('logs.table.recipient')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--brand-light)]/70">{t('logs.table.template')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--brand-light)]/70">{t('logs.table.subject')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--brand-light)]/70">{t('logs.table.language')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--brand-light)]/70">{t('logs.table.sentAt')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--dark-600)]">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[var(--brand-light)]/50">
                        {t('logs.noEmails')}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--dark-700)]/30">
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={getStatusColor(log.status)}>
                            {log.status === 'sent' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {log.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                            {log.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {log.status_display}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-[var(--brand-light)]">{log.recipient_email}</div>
                          {log.recipient_name && (
                            <div className="text-xs text-[var(--brand-light)]/50">{log.recipient_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--brand-light)]/70">
                          {log.template_type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--brand-light)] max-w-xs truncate">
                          {log.subject}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 bg-[var(--dark-600)] rounded text-[var(--brand-light)]/70">
                            {log.language.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--brand-light)]/70">
                          {log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-[var(--dark-800)] border-[var(--dark-600)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--brand-light)]">{t('previewModal.title')}</DialogTitle>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {t('previewModal.subtitle')}
            </DialogDescription>
          </DialogHeader>
          
          {previewContent && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-[var(--brand-light)]/70">{t('previewModal.subject')}</Label>
                <p className="mt-1 p-3 bg-[var(--dark-700)] rounded-lg text-[var(--brand-light)]">
                  {previewContent.subject}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-[var(--brand-light)]/70">{t('previewModal.htmlPreview')}</Label>
                <div 
                  className="mt-1 p-4 bg-white rounded-lg text-gray-900"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewContent.body_html) }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Test Email Modal */}
      <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
        <DialogContent className="bg-[var(--dark-800)] border-[var(--dark-600)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--brand-light)]">{t('testModal.title')}</DialogTitle>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {t('testModal.subtitle')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-email" className="text-[var(--brand-light)]">{t('testModal.emailAddress')}</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder={t('testModal.emailPlaceholder')}
                className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40"
              />
            </div>
            <p className="text-xs text-[var(--brand-light)]/50">
              {t('testModal.note')}
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowTestModal(false)}
              className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-700)]"
            >
              {t('testModal.cancel')}
            </Button>
            <Button
              onClick={handleSendTest}
              disabled={isSendingTest || !testEmail}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 text-white"
            >
              {isSendingTest ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {t('testModal.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

