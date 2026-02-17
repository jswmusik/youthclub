'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { sanitizeHtml } from '@/lib/sanitize';
import { 
  Shield, 
  Search, 
  Check, 
  X, 
  ChevronRight, 
  Eye, 
  Save,
  Languages,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  History,
  Code,
  Type,
  Plus,
  Copy,
  Trash2
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

// Loading component for the editor
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

interface ConsentTypeTranslation {
  id: number;
  language: string;
  language_display: string;
  name: string;
  description: string;
  consent_text: string;
  updated_at: string;
}

interface ConsentTypeVersion {
  id: number;
  version: string;
  consent_text_snapshot: string;
  translations_snapshot: Record<string, any>;
  created_at: string;
  created_by_name: string | null;
  change_summary: string;
}

interface ConsentType {
  id: number;
  code: string;
  name: string;
  description: string;
  version: string;
  is_required: boolean;
  is_active: boolean;
  legal_basis: string;
  consent_text: string;
  document_url: string;
  display_order: number;
  translations: ConsentTypeTranslation[];
  versions: ConsentTypeVersion[];
  created_by_name: string | null;
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

export default function GDPRDocumentsPage() {
  const t = useTranslations('gdprDocuments');
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [documents, setDocuments] = useState<ConsentType[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'documents' | 'stats'>('documents');
  
  // Document editing
  const [selectedDocument, setSelectedDocument] = useState<ConsentType | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('sv');
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedConsentText, setEditedConsentText] = useState('');
  const [editedLegalBasis, setEditedLegalBasis] = useState('');
  const [editedDocumentUrl, setEditedDocumentUrl] = useState('');
  const [editedDisplayOrder, setEditedDisplayOrder] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [editorMode, setEditorMode] = useState<'rich' | 'html'>('rich');
  
  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    code: '',
    name: '',
    description: '',
    consent_text: '',
    version: '1.0',
    legal_basis: '',
    document_url: '',
    is_required: false,
    is_active: true,
    display_order: 0,
  });
  
  // Version modal
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionFormData, setVersionFormData] = useState({
    new_version: '',
    change_summary: '',
  });
  
  // Version history modal
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [versionHistory, setVersionHistory] = useState<ConsentTypeVersion[]>([]);
  
  // Preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<{ name: string; description: string; consent_text: string } | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await api.get('/gdpr/admin/consent-types/');
      setDocuments(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching documents:', err);
      showError(t('toast.loadFailed'));
    }
  }, []); // Remove dependencies to prevent infinite loop

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/gdpr/admin/consent-types/stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []); // Remove dependencies to prevent infinite loop

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDocuments(), fetchStats()]);
      setLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleSelectDocument = async (document: ConsentType) => {
    try {
      const response = await api.get(`/gdpr/admin/consent-types/${document.id}/`);
      setSelectedDocument(response.data);
      
      // Load the translation for the selected language
      const translation = response.data.translations.find(
        (t: ConsentTypeTranslation) => t.language === selectedLanguage
      );
      if (translation) {
        setEditedName(translation.name);
        setEditedDescription(translation.description);
        setEditedConsentText(translation.consent_text);
      } else {
        setEditedName(response.data.name);
        setEditedDescription(response.data.description);
        setEditedConsentText(response.data.consent_text);
      }
      
      // Load base document fields
      setEditedLegalBasis(response.data.legal_basis || '');
      setEditedDocumentUrl(response.data.document_url || '');
      setEditedDisplayOrder(response.data.display_order || 0);
    } catch (err) {
      console.error('Error fetching document details:', err);
      showError(t('toast.loadDetailsFailed'));
    }
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    if (selectedDocument) {
      const translation = selectedDocument.translations.find(t => t.language === language);
      if (translation) {
        setEditedName(translation.name);
        setEditedDescription(translation.description);
        setEditedConsentText(translation.consent_text);
      } else {
        setEditedName(selectedDocument.name);
        setEditedDescription(selectedDocument.description);
        setEditedConsentText(selectedDocument.consent_text);
      }
    }
  };

  const handleSaveTranslation = async () => {
    if (!selectedDocument) return;
    
    setIsSaving(true);
    try {
      await api.post(`/gdpr/admin/consent-types/${selectedDocument.id}/translations/${selectedLanguage}/`, {
        name: editedName,
        description: editedDescription,
        consent_text: editedConsentText,
      });
      
      // Refresh document
      await handleSelectDocument(selectedDocument);
      success(t('toast.translationSaveSuccess'));
    } catch (err) {
      console.error('Error saving translation:', err);
      showError(t('toast.translationSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDocument = async () => {
    if (!selectedDocument) return;
    
    setIsSaving(true);
    try {
      const payload: any = {
        legal_basis: editedLegalBasis,
        display_order: editedDisplayOrder,
      };
      
      // Only include document_url if it's not empty
      if (editedDocumentUrl && editedDocumentUrl.trim() !== '') {
        payload.document_url = editedDocumentUrl;
      }
      
      await api.patch(`/gdpr/admin/consent-types/${selectedDocument.id}/`, payload);
      
      await fetchDocuments();
      success(t('toast.saveSuccess'));
    } catch (err) {
      console.error('Error saving document:', err);
      showError(t('toast.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (document: ConsentType) => {
    try {
      await api.post(`/gdpr/admin/consent-types/${document.id}/toggle-active/`);
      await fetchDocuments();
      success(document.is_active ? t('toast.documentDisabled') : t('toast.documentEnabled'));
    } catch (err) {
      console.error('Error toggling document:', err);
      showError(t('toast.updateFailed'));
    }
  };

  const handleToggleRequired = async (document: ConsentType) => {
    try {
      await api.post(`/gdpr/admin/consent-types/${document.id}/toggle-required/`);
      await fetchDocuments();
      success('Document requirement updated');
    } catch (err) {
      console.error('Error toggling required:', err);
      showError(t('toast.updateFailed'));
    }
  };

  const handleCreateDocument = async () => {
    if (!createFormData.code || !createFormData.name || !createFormData.consent_text) {
      showError('Please fill in all required fields');
      return;
    }
    
    setIsSaving(true);
    try {
      await api.post('/gdpr/admin/consent-types/', createFormData);
      await fetchDocuments();
      setShowCreateModal(false);
      setCreateFormData({
        code: '',
        name: '',
        description: '',
        consent_text: '',
        version: '1.0',
        legal_basis: '',
        document_url: '',
        is_required: false,
        is_active: true,
        display_order: 0,
      });
      success(t('toast.createSuccess'));
    } catch (err: any) {
      console.error('Error creating document:', err);
      showError(err.response?.data?.detail || t('toast.createFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishVersion = async () => {
    if (!selectedDocument || !versionFormData.new_version) return;
    
    setIsSaving(true);
    try {
      await api.post(`/gdpr/admin/consent-types/${selectedDocument.id}/publish-version/`, versionFormData);
      await handleSelectDocument(selectedDocument);
      await fetchDocuments();
      setShowVersionModal(false);
      setVersionFormData({ new_version: '', change_summary: '' });
      success(t('toast.versionPublished'));
    } catch (err: any) {
      console.error('Error publishing version:', err);
      showError(err.response?.data?.detail || t('toast.versionPublishFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewVersionHistory = async (document: ConsentType) => {
    try {
      const response = await api.get(`/gdpr/admin/consent-types/${document.id}/versions/`);
      setVersionHistory(response.data);
      setShowVersionHistoryModal(true);
    } catch (err) {
      console.error('Error fetching version history:', err);
      showError('Failed to load version history');
    }
  };

  const handleDuplicate = async (document: ConsentType) => {
    const newCode = prompt('Enter code for duplicated document:');
    if (!newCode) return;
    
    try {
      await api.post(`/gdpr/admin/consent-types/${document.id}/duplicate/`, { new_code: newCode });
      await fetchDocuments();
      success(t('toast.duplicateSuccess'));
    } catch (err: any) {
      console.error('Error duplicating document:', err);
      showError(err.response?.data?.detail || t('toast.duplicateFailed'));
    }
  };

  const handlePreview = () => {
    setPreviewContent({
      name: editedName,
      description: editedDescription,
      consent_text: editedConsentText,
    });
    setShowPreview(true);
  };

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Shield className="h-6 w-6 text-[var(--dark-900)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
            <p className="text-sm text-[var(--brand-light)]/50">
              {t('subtitle')}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 text-[var(--dark-900)]"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('createNew')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'documents' | 'stats')}>
        <TabsList className="bg-[var(--dark-700)] border border-[var(--dark-500)] p-1">
          <TabsTrigger 
            value="documents" 
            className="text-[var(--brand-light)]/70 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-[var(--dark-900)]"
          >
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger 
            value="stats" 
            className="text-[var(--brand-light)]/70 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-[var(--dark-900)]"
          >
            <History className="h-4 w-4 mr-2" />
            {t('stats.title')}
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Document List */}
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
                {filteredDocuments.map((document) => (
                  <button
                    key={document.id}
                    onClick={() => handleSelectDocument(document)}
                    className={`w-full p-4 text-left hover:bg-[var(--dark-700)] transition-colors ${
                      selectedDocument?.id === document.id ? 'bg-[var(--brand-primary)]/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[var(--brand-light)] truncate">
                            {document.name}
                          </span>
                          {document.is_required && (
                            <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                              {t('required')}
                            </Badge>
                          )}
                          {!document.is_active && (
                            <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-400 border-gray-500/30">
                              {t('disabled')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[var(--brand-light)]/50 mt-1 truncate">
                          {document.code} (v{document.version})
                        </p>
                        <div className="flex items-center gap-1 mt-2">
                          {document.translations?.length > 0 ? (
                            document.translations.map((trans) => (
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

            {/* Document Editor */}
            <div className="lg:col-span-2 bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
              {selectedDocument ? (
                <div className="flex flex-col h-full">
                  {/* Editor Header */}
                  <div className="p-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div>
                        <h2 className="font-semibold text-[var(--brand-light)]">{selectedDocument.name}</h2>
                        <p className="text-sm text-[var(--brand-light)]/50">
                          {selectedDocument.code} (v{selectedDocument.version})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={selectedDocument.is_active}
                          onCheckedChange={() => handleToggleActive(selectedDocument)}
                        />
                        <span className="text-sm text-[var(--brand-light)]/70">
                          {selectedDocument.is_active ? t('editor.active') : t('disabled')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleRequired(selectedDocument)}
                        className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
                      >
                        {selectedDocument.is_required ? <XCircle className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        {selectedDocument.is_required ? 'Remove Required' : 'Make Required'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowVersionModal(true)}
                        className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
                      >
                        <History className="h-4 w-4 mr-2" />
                        {t('actions.publishVersion')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewVersionHistory(selectedDocument)}
                        className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {t('actions.viewVersions')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(selectedDocument)}
                        className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {t('actions.duplicate')}
                      </Button>
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
                          const hasTranslation = selectedDocument.translations?.some(trans => trans.language === lang.value);
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
                    {/* Document Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-[var(--brand-light)]">{t('editor.documentName')}</Label>
                      <Input
                        id="name"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder={t('editor.namePlaceholder')}
                        className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium text-[var(--brand-light)]">{t('editor.description')}</Label>
                      <Textarea
                        id="description"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        placeholder={t('editor.descriptionPlaceholder')}
                        className="bg-[var(--dark-700)] border-[var(--dark-500)] min-h-[60px] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40"
                      />
                    </div>

                    {/* Consent Text with Mode Toggle */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-[var(--brand-light)]">{t('editor.consentText')}</Label>
                        
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
                          value={editedConsentText}
                          onChange={setEditedConsentText}
                          placeholder={t('editor.consentTextPlaceholder')}
                          minHeight="300px"
                        />
                      ) : (
                        <Textarea
                          id="consent_text"
                          value={editedConsentText}
                          onChange={(e) => setEditedConsentText(e.target.value)}
                          placeholder={t('editor.consentTextPlaceholder')}
                          className="bg-[var(--dark-700)] border-[var(--dark-500)] min-h-[300px] font-mono text-sm text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40"
                        />
                      )}
                      
                      {editorMode === 'html' && (
                        <p className="text-xs text-[var(--brand-light)]/50">
                          {t('editor.htmlHelp')}
                        </p>
                      )}
                    </div>

                    {/* Legal Basis */}
                    <div className="space-y-2">
                      <Label htmlFor="legal_basis" className="text-sm font-medium text-[var(--brand-light)]">{t('editor.legalBasis')}</Label>
                      <Input
                        id="legal_basis"
                        value={editedLegalBasis}
                        onChange={(e) => setEditedLegalBasis(e.target.value)}
                        placeholder={t('editor.legalBasisPlaceholder')}
                        className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40"
                      />
                    </div>

                    {/* Document URL */}
                    <div className="space-y-2">
                      <Label htmlFor="document_url" className="text-sm font-medium text-[var(--brand-light)]">{t('editor.documentUrl')}</Label>
                      <Input
                        id="document_url"
                        value={editedDocumentUrl}
                        onChange={(e) => setEditedDocumentUrl(e.target.value)}
                        placeholder={t('editor.documentUrlPlaceholder')}
                        className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40"
                      />
                    </div>

                    {/* Display Order */}
                    <div className="space-y-2">
                      <Label htmlFor="display_order" className="text-sm font-medium text-[var(--brand-light)]">{t('editor.displayOrder')}</Label>
                      <Input
                        id="display_order"
                        type="number"
                        value={editedDisplayOrder}
                        onChange={(e) => setEditedDisplayOrder(parseInt(e.target.value) || 0)}
                        className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]"
                      />
                    </div>
                  </div>

                  {/* Editor Footer */}
                  <div className="p-4 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/30 flex items-center justify-between gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreview}
                      disabled={!editedName || !editedConsentText}
                      className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-600)] disabled:text-[var(--brand-light)]/30"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t('editor.preview')}
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleSaveDocument}
                        disabled={isSaving}
                        className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
                      >
                        {isSaving ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {t('editor.saveDocument')}
                      </Button>
                      <Button
                        onClick={handleSaveTranslation}
                        disabled={isSaving || !editedName || !editedConsentText}
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
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-[var(--dark-700)] flex items-center justify-center mb-4">
                    <Shield className="h-8 w-8 text-[var(--brand-light)]/30" />
                  </div>
                  <h3 className="text-lg font-medium text-[var(--brand-light)]">{t('selectDocument.title')}</h3>
                  <p className="text-sm text-[var(--brand-light)]/50 mt-2 max-w-sm">
                    {t('selectDocument.subtitle')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="mt-6">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
                <div className="text-sm text-[var(--brand-light)]/50">{t('stats.totalDocuments')}</div>
                <div className="text-2xl font-bold text-[var(--brand-light)]">{stats.consent_types?.total || 0}</div>
              </div>
              <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
                <div className="text-sm text-[var(--brand-light)]/50">{t('stats.activeDocuments')}</div>
                <div className="text-2xl font-bold text-green-400">{stats.consent_types?.active || 0}</div>
              </div>
              <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
                <div className="text-sm text-[var(--brand-light)]/50">{t('stats.requiredDocuments')}</div>
                <div className="text-2xl font-bold text-red-400">{stats.consent_types?.required || 0}</div>
              </div>
              <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
                <div className="text-sm text-[var(--brand-light)]/50">{t('stats.totalConsents')}</div>
                <div className="text-2xl font-bold text-[var(--brand-primary)]">{stats.user_consents?.total || 0}</div>
              </div>
              <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
                <div className="text-sm text-[var(--brand-light)]/50">{t('stats.activeConsents')}</div>
                <div className="text-2xl font-bold text-green-400">{stats.user_consents?.active || 0}</div>
              </div>
              <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
                <div className="text-sm text-[var(--brand-light)]/50">{t('stats.withdrawnConsents')}</div>
                <div className="text-2xl font-bold text-gray-400">{stats.user_consents?.withdrawn || 0}</div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Document Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[var(--dark-800)] border-[var(--dark-600)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--brand-light)]">{t('createModal.title')}</DialogTitle>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {t('createModal.subtitle')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-code" className="text-[var(--brand-light)]">{t('createModal.code')}</Label>
              <Input
                id="create-code"
                value={createFormData.code}
                onChange={(e) => setCreateFormData({...createFormData, code: e.target.value})}
                placeholder={t('createModal.codePlaceholder')}
                className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]"
              />
              <p className="text-xs text-[var(--brand-light)]/50">{t('createModal.codeHelp')}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-name" className="text-[var(--brand-light)]">{t('createModal.name')}</Label>
              <Input
                id="create-name"
                value={createFormData.name}
                onChange={(e) => setCreateFormData({...createFormData, name: e.target.value})}
                placeholder={t('createModal.namePlaceholder')}
                className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-description" className="text-[var(--brand-light)]">{t('createModal.description')}</Label>
              <Textarea
                id="create-description"
                value={createFormData.description}
                onChange={(e) => setCreateFormData({...createFormData, description: e.target.value})}
                placeholder={t('createModal.descriptionPlaceholder')}
                className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-consent-text" className="text-[var(--brand-light)]">{t('createModal.consentText')}</Label>
              <Textarea
                id="create-consent-text"
                value={createFormData.consent_text}
                onChange={(e) => setCreateFormData({...createFormData, consent_text: e.target.value})}
                placeholder={t('createModal.consentTextPlaceholder')}
                className="bg-[var(--dark-700)] border-[var(--dark-500)] min-h-[150px] text-[var(--brand-light)]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-version" className="text-[var(--brand-light)]">{t('createModal.version')}</Label>
              <Input
                id="create-version"
                value={createFormData.version}
                onChange={(e) => setCreateFormData({...createFormData, version: e.target.value})}
                placeholder={t('createModal.versionPlaceholder')}
                className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateModal(false)}
              className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-700)]"
            >
              {t('createModal.cancel')}
            </Button>
            <Button
              onClick={handleCreateDocument}
              disabled={isSaving}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 text-white"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {t('createModal.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Version Modal */}
      <Dialog open={showVersionModal} onOpenChange={setShowVersionModal}>
        <DialogContent className="bg-[var(--dark-800)] border-[var(--dark-600)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--brand-light)]">{t('versionModal.title')}</DialogTitle>
            <DialogDescription className="text-[var(--brand-light)]/60">
              {t('versionModal.subtitle')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-400">
                {t('versionModal.warning')}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[var(--brand-light)]">{t('versionModal.currentVersion')}</Label>
              <p className="text-2xl font-bold text-[var(--brand-primary)]">{selectedDocument?.version}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-version" className="text-[var(--brand-light)]">{t('versionModal.newVersion')}</Label>
              <Input
                id="new-version"
                value={versionFormData.new_version}
                onChange={(e) => setVersionFormData({...versionFormData, new_version: e.target.value})}
                placeholder={t('versionModal.newVersionPlaceholder')}
                className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="change-summary" className="text-[var(--brand-light)]">{t('versionModal.changeSummary')}</Label>
              <Textarea
                id="change-summary"
                value={versionFormData.change_summary}
                onChange={(e) => setVersionFormData({...versionFormData, change_summary: e.target.value})}
                placeholder={t('versionModal.changeSummaryPlaceholder')}
                className="bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowVersionModal(false)}
              className="border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-700)]"
            >
              {t('versionModal.cancel')}
            </Button>
            <Button
              onClick={handlePublishVersion}
              disabled={isSaving || !versionFormData.new_version}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 text-white"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <History className="h-4 w-4 mr-2" />
              )}
              {t('versionModal.publish')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Modal */}
      <Dialog open={showVersionHistoryModal} onOpenChange={setShowVersionHistoryModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-[var(--dark-800)] border-[var(--dark-600)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--brand-light)]">{t('versionHistory.title')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {versionHistory.length === 0 ? (
              <p className="text-center text-[var(--brand-light)]/50 py-8">{t('versionHistory.noVersions')}</p>
            ) : (
              versionHistory.map((version) => (
                <div key={version.id} className="p-4 bg-[var(--dark-700)] rounded-lg border border-[var(--dark-600)]">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-[var(--brand-light)]">{t('versionHistory.version')} {version.version}</h4>
                      <p className="text-xs text-[var(--brand-light)]/50">
                        {t('versionHistory.publishedBy')} {version.created_by_name || 'Unknown'} • {new Date(version.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {version.change_summary && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-[var(--brand-light)]/70">{t('versionHistory.changes')}:</p>
                      <p className="text-sm text-[var(--brand-light)]/90 mt-1">{version.change_summary}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-[var(--dark-800)] border-[var(--dark-600)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--brand-light)]">Document Preview</DialogTitle>
          </DialogHeader>
          
          {previewContent && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-[var(--brand-light)]/70">Document Name:</Label>
                <p className="mt-1 p-3 bg-[var(--dark-700)] rounded-lg text-[var(--brand-light)] font-semibold">
                  {previewContent.name}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-[var(--brand-light)]/70">Description:</Label>
                <p className="mt-1 p-3 bg-[var(--dark-700)] rounded-lg text-[var(--brand-light)]">
                  {previewContent.description}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-[var(--brand-light)]/70">Legal Text:</Label>
                <div 
                  className="mt-1 p-4 bg-white rounded-lg text-gray-900"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewContent.consent_text) }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

