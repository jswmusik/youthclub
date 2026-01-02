'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Save,
  X,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { useToast } from '@/hooks/useToast';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import dynamic from 'next/dynamic';

// Dynamically import the rich text editor to avoid SSR issues
const DarkRichTextEditor = dynamic(
  () => import('@/app/components/DarkRichTextEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-64 bg-[var(--dark-700)] rounded-xl flex items-center justify-center border border-[var(--dark-500)]">
        <div className="flex items-center gap-2 text-[var(--brand-light)]/40">
          <div className="w-4 h-4 border-2 border-[var(--brand-light)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
          <span>Laddar editor...</span>
        </div>
      </div>
    )
  }
);

interface Boilerplate {
  id: number;
  name: string;
  usage: string;
  usage_display: string;
  content: string;
  description: string;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

const USAGE_OPTIONS = [
  { value: 'terms_and_conditions', label: 'Villkor' },
  { value: 'club_policies', label: 'Klubbregler' },
  { value: 'privacy_policy', label: 'Integritetspolicy' },
  { value: 'general', label: 'Allmän' },
];

export default function BoilerplatesPage() {
  const t = useTranslations('boilerplates');
  const { toast: showToast } = useToast();
  
  const [boilerplates, setBoilerplates] = useState<Boilerplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [usageFilter, setUsageFilter] = useState<string>('');
  
  // Selected/editing state
  const [selectedBoilerplate, setSelectedBoilerplate] = useState<Boilerplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [editName, setEditName] = useState('');
  const [editUsage, setEditUsage] = useState('general');
  const [editContent, setEditContent] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editOrder, setEditOrder] = useState(0);
  
  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createUsage, setCreateUsage] = useState('general');
  const [createDescription, setCreateDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Delete confirmation
  const [itemToDelete, setItemToDelete] = useState<Boilerplate | null>(null);

  const fetchBoilerplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (usageFilter) params.set('usage', usageFilter);
      
      const response = await api.get(`/cms/boilerplates/?${params.toString()}`);
      setBoilerplates(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching boilerplates:', error);
      showToast(t('toast.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }, [usageFilter]);

  useEffect(() => {
    fetchBoilerplates();
  }, [fetchBoilerplates]);

  const handleSelectBoilerplate = async (bp: Boilerplate) => {
    try {
      const response = await api.get(`/cms/boilerplates/${bp.id}/`);
      const fullBp = response.data;
      setSelectedBoilerplate(fullBp);
      setEditName(fullBp.name);
      setEditUsage(fullBp.usage);
      setEditContent(fullBp.content);
      setEditDescription(fullBp.description);
      setEditIsActive(fullBp.is_active);
      setEditOrder(fullBp.order);
      setIsEditing(false);
    } catch (error) {
      console.error('Error fetching boilerplate:', error);
      showToast(t('toast.loadFailed'), 'error');
    }
  };

  const handleSave = async () => {
    if (!selectedBoilerplate) return;
    
    setIsSaving(true);
    try {
      await api.patch(`/cms/boilerplates/${selectedBoilerplate.id}/`, {
        name: editName,
        usage: editUsage,
        content: editContent,
        description: editDescription,
        is_active: editIsActive,
        order: editOrder,
      });
      
      showToast(t('toast.saveSuccess'), 'success');
      setIsEditing(false);
      fetchBoilerplates();
      
      // Update selected boilerplate
      setSelectedBoilerplate({
        ...selectedBoilerplate,
        name: editName,
        usage: editUsage,
        content: editContent,
        description: editDescription,
        is_active: editIsActive,
        order: editOrder,
      });
    } catch (error) {
      console.error('Error saving boilerplate:', error);
      showToast(t('toast.saveFailed'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    
    setIsCreating(true);
    try {
      const response = await api.post('/cms/boilerplates/', {
        name: createName,
        usage: createUsage,
        description: createDescription,
        content: '',
        is_active: true,
        order: boilerplates.length,
      });
      
      showToast(t('toast.createSuccess'), 'success');
      setShowCreateDialog(false);
      setCreateName('');
      setCreateUsage('general');
      setCreateDescription('');
      
      // Select the new boilerplate
      handleSelectBoilerplate(response.data);
      setIsEditing(true);
      fetchBoilerplates();
    } catch (error) {
      console.error('Error creating boilerplate:', error);
      showToast(t('toast.createFailed'), 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      await api.delete(`/cms/boilerplates/${itemToDelete.id}/`);
      showToast(t('toast.deleteSuccess'), 'success');
      
      if (selectedBoilerplate?.id === itemToDelete.id) {
        setSelectedBoilerplate(null);
      }
      
      fetchBoilerplates();
    } catch (error) {
      console.error('Error deleting boilerplate:', error);
      showToast(t('toast.deleteFailed'), 'error');
    } finally {
      setItemToDelete(null);
    }
  };

  const handleCopyContent = () => {
    if (selectedBoilerplate) {
      navigator.clipboard.writeText(selectedBoilerplate.content);
      showToast(t('toast.copied'), 'success');
    }
  };

  const filteredBoilerplates = boilerplates.filter(bp => 
    bp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bp.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUsageColor = (usage: string) => {
    switch (usage) {
      case 'terms_and_conditions': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'club_policies': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'privacy_policy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading && boilerplates.length === 0) {
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
            <FileText className="h-6 w-6 text-[var(--dark-900)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-[var(--brand-light)]">{t('title')}</h1>
            <p className="text-sm text-gray-600 dark:text-[var(--brand-light)]/50">
              {t('subtitle')}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 text-[var(--dark-900)]"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('createNew')}
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Boilerplate List */}
        <div className="lg:col-span-1 bg-white dark:bg-[var(--dark-800)] rounded-xl border border-gray-200 dark:border-[var(--dark-600)] overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 dark:border-[var(--dark-600)] space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-[var(--brand-light)]/40" />
              <Input
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-gray-50 dark:bg-[var(--dark-700)] border-gray-300 dark:border-[var(--dark-500)] text-gray-900 dark:text-[var(--brand-light)] placeholder:text-gray-500 dark:placeholder:text-[var(--brand-light)]/40"
              />
            </div>
            <Select value={usageFilter || 'all'} onValueChange={(val) => setUsageFilter(val === 'all' ? '' : val)}>
              <SelectTrigger className="bg-gray-50 dark:bg-[var(--dark-700)] border-gray-300 dark:border-[var(--dark-500)] text-gray-900 dark:text-[var(--brand-light)]">
                <SelectValue placeholder={t('filterByUsage')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allUsages')}</SelectItem>
                {USAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* List */}
          <div className="divide-y divide-gray-200 dark:divide-[var(--dark-600)] max-h-[600px] overflow-y-auto">
            {filteredBoilerplates.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-[var(--brand-light)]/50">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('noBoilerplates')}</p>
              </div>
            ) : (
              filteredBoilerplates.map((bp) => (
                <button
                  key={bp.id}
                  onClick={() => handleSelectBoilerplate(bp)}
                  className={`w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-[var(--dark-700)] transition-colors ${
                    selectedBoilerplate?.id === bp.id ? 'bg-gray-100 dark:bg-[var(--dark-700)]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-[var(--brand-light)] truncate">
                          {bp.name}
                        </span>
                        {!bp.is_active && (
                          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                            {t('inactive')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${getUsageColor(bp.usage)}`}>
                          {bp.usage_display}
                        </Badge>
                      </div>
                      {bp.description && (
                        <p className="text-xs text-gray-500 dark:text-[var(--brand-light)]/50 mt-1 truncate">
                          {bp.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 dark:text-[var(--brand-light)]/30 flex-shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editor Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-[var(--dark-800)] rounded-xl border border-gray-200 dark:border-[var(--dark-600)] overflow-hidden">
          {selectedBoilerplate ? (
            <div className="flex flex-col h-full">
              {/* Editor Header */}
              <div className="p-4 border-b border-gray-200 dark:border-[var(--dark-600)] bg-gray-50 dark:bg-[var(--dark-700)]/30">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-gray-50 dark:bg-[var(--dark-700)] border-gray-300 dark:border-[var(--dark-500)] text-gray-900 dark:text-[var(--brand-light)] font-semibold"
                        placeholder={t('namePlaceholder')}
                      />
                    ) : (
                      <h2 className="font-semibold text-gray-900 dark:text-[var(--brand-light)]">{selectedBoilerplate.name}</h2>
                    )}
                    {!isEditing && selectedBoilerplate.description && (
                      <p className="text-sm text-gray-500 dark:text-[var(--brand-light)]/50 mt-1">{selectedBoilerplate.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyContent}
                          className="border-gray-300 dark:border-[var(--dark-500)] text-gray-700 dark:text-[var(--brand-light)] hover:bg-gray-100 dark:hover:bg-[var(--dark-600)]"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {t('copy')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                          className="border-gray-300 dark:border-[var(--dark-500)] text-gray-700 dark:text-[var(--brand-light)] hover:bg-gray-100 dark:hover:bg-[var(--dark-600)]"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {t('edit')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setItemToDelete(selectedBoilerplate)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Editor Form */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {isEditing ? (
                  <>
                    {/* Description */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-[var(--brand-light)]">{t('description')}</Label>
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder={t('descriptionPlaceholder')}
                        className="bg-gray-50 dark:bg-[var(--dark-700)] border-gray-300 dark:border-[var(--dark-500)] text-gray-900 dark:text-[var(--brand-light)] placeholder:text-gray-500 dark:placeholder:text-[var(--brand-light)]/40"
                      />
                    </div>

                    {/* Usage & Status Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-[var(--brand-light)]">{t('usage')}</Label>
                        <Select value={editUsage} onValueChange={setEditUsage}>
                          <SelectTrigger className="bg-gray-50 dark:bg-[var(--dark-700)] border-gray-300 dark:border-[var(--dark-500)] text-gray-900 dark:text-[var(--brand-light)]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {USAGE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-[var(--brand-light)]">{t('order')}</Label>
                        <Input
                          type="number"
                          value={editOrder}
                          onChange={(e) => setEditOrder(parseInt(e.target.value) || 0)}
                          className="bg-gray-50 dark:bg-[var(--dark-700)] border-gray-300 dark:border-[var(--dark-500)] text-gray-900 dark:text-[var(--brand-light)]"
                        />
                      </div>
                    </div>

                    {/* Active Switch */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[var(--dark-700)] rounded-lg border border-gray-300 dark:border-[var(--dark-500)]">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-[var(--brand-light)]">{t('activeStatus')}</div>
                        <div className="text-sm text-gray-500 dark:text-[var(--brand-light)]/50">{t('activeStatusDescription')}</div>
                      </div>
                      <Switch
                        checked={editIsActive}
                        onCheckedChange={setEditIsActive}
                      />
                    </div>

                    {/* Content Editor */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-[var(--brand-light)]">{t('content')}</Label>
                      <DarkRichTextEditor
                        value={editContent}
                        onChange={setEditContent}
                        placeholder={t('contentPlaceholder')}
                        minHeight="300px"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* View Mode - Meta Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 dark:bg-[var(--dark-700)] rounded-lg border border-gray-300 dark:border-[var(--dark-500)]">
                        <div className="text-xs text-gray-500 dark:text-[var(--brand-light)]/50 mb-1">{t('usage')}</div>
                        <Badge variant="outline" className={getUsageColor(selectedBoilerplate.usage)}>
                          {selectedBoilerplate.usage_display}
                        </Badge>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-[var(--dark-700)] rounded-lg border border-gray-300 dark:border-[var(--dark-500)]">
                        <div className="text-xs text-gray-500 dark:text-[var(--brand-light)]/50 mb-1">{t('status')}</div>
                        <Badge variant="outline" className={selectedBoilerplate.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                          {selectedBoilerplate.is_active ? t('active') : t('inactive')}
                        </Badge>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-[var(--brand-light)]">{t('contentPreview')}</Label>
                      <div 
                        className="p-4 bg-gray-50 dark:bg-[var(--dark-700)] rounded-lg border border-gray-300 dark:border-[var(--dark-500)] prose dark:prose-invert max-w-none min-h-[200px]"
                        dangerouslySetInnerHTML={{ __html: selectedBoilerplate.content || `<p class="text-gray-400 dark:text-[var(--brand-light)]/40 italic">${t('noContent')}</p>` }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Editor Footer */}
              {isEditing && (
                <div className="p-4 border-t border-gray-200 dark:border-[var(--dark-600)] bg-gray-50 dark:bg-[var(--dark-700)]/30 flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      if (selectedBoilerplate) {
                        setEditName(selectedBoilerplate.name);
                        setEditUsage(selectedBoilerplate.usage);
                        setEditContent(selectedBoilerplate.content);
                        setEditDescription(selectedBoilerplate.description);
                        setEditIsActive(selectedBoilerplate.is_active);
                        setEditOrder(selectedBoilerplate.order);
                      }
                    }}
                    className="border-gray-300 dark:border-[var(--dark-500)] text-gray-700 dark:text-[var(--brand-light)] hover:bg-gray-100 dark:hover:bg-[var(--dark-700)]"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('cancel')}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !editName.trim()}
                    className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 text-white"
                  >
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {t('save')}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[var(--dark-700)] flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-gray-400 dark:text-[var(--brand-light)]/30" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-[var(--brand-light)]">{t('selectBoilerplate.title')}</h3>
              <p className="text-sm text-gray-500 dark:text-[var(--brand-light)]/50 mt-2 max-w-sm">
                {t('selectBoilerplate.subtitle')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white dark:bg-[var(--dark-800)] border-gray-200 dark:border-[var(--dark-600)]">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-[var(--brand-light)]">{t('createDialog.title')}</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-[var(--brand-light)]/60">
              {t('createDialog.subtitle')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name" className="text-gray-700 dark:text-[var(--brand-light)]">{t('name')}</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={t('namePlaceholder')}
                className="bg-gray-50 dark:bg-[var(--dark-700)] border-gray-300 dark:border-[var(--dark-500)] text-gray-900 dark:text-[var(--brand-light)] placeholder:text-gray-500 dark:placeholder:text-[var(--brand-light)]/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-usage" className="text-gray-700 dark:text-[var(--brand-light)]">{t('usage')}</Label>
              <Select value={createUsage} onValueChange={setCreateUsage}>
                <SelectTrigger className="bg-gray-50 dark:bg-[var(--dark-700)] border-gray-300 dark:border-[var(--dark-500)] text-gray-900 dark:text-[var(--brand-light)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description" className="text-gray-700 dark:text-[var(--brand-light)]">{t('description')}</Label>
              <Input
                id="create-description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                className="bg-gray-50 dark:bg-[var(--dark-700)] border-gray-300 dark:border-[var(--dark-500)] text-gray-900 dark:text-[var(--brand-light)] placeholder:text-gray-500 dark:placeholder:text-[var(--brand-light)]/40"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              className="border-gray-300 dark:border-[var(--dark-500)] text-gray-700 dark:text-[var(--brand-light)] hover:bg-gray-100 dark:hover:bg-[var(--dark-700)]"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !createName.trim()}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 text-[var(--dark-900)]"
            >
              {isCreating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title={t('deleteModal.title')}
        message={t('deleteModal.message', { name: itemToDelete?.name })}
        confirmButtonText={t('deleteModal.confirm')}
        cancelButtonText={t('deleteModal.cancel')}
        variant="danger"
        darkMode={true}
      />
    </div>
  );
}

