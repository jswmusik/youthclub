'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cmsApi } from '@/lib/cms-api';
import { MenuItem, Page } from '@/types/cms';
import { Plus, Pencil, Trash2, Navigation, Link as LinkIcon, ExternalLink, Users, GripVertical, Globe } from 'lucide-react';
import { useToast } from '../../../../../hooks/useToast';
import MenuFormDialog from './components/MenuFormDialog';
import ConfirmationModal from '../../../../components/ConfirmationModal';
import LanguageSelector, { LanguageBadge, type LanguageCode, LANGUAGES } from '../../../components/LanguageSelector';

// Skeleton Component
function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-[var(--dark-600)] rounded ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite, pulse 2s infinite'
      }}
    />
  );
}

type LocationType = 'header' | 'footer' | 'community_footer';

export default function NavigationManager() {
  const t = useTranslations('cmsAdmin.navigation');
  const { success, error } = useToast();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Language filter
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('sv');

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [activeLocation, setActiveLocation] = useState<LocationType>('header');
  
  // Delete Modal State
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<MenuItem | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<number | null>(null);
  const [dragLocation, setDragLocation] = useState<LocationType | null>(null);

  const fetchData = async () => {
    try {
      const [menuData, pagesData] = await Promise.all([
        cmsApi.getMenuItems(),
        cmsApi.getPages(),
      ]);
      setItems(menuData);
      setPages(pagesData);
    } catch (err) {
      console.error(err);
      error(t('toast.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (data: Partial<MenuItem>) => {
    try {
      if (editingItem) {
        await cmsApi.updateMenuItem(editingItem.id, data);
        success(t('toast.itemUpdated'));
      } else {
        await cmsApi.createMenuItem(data);
        success(t('toast.itemCreated'));
      }
      fetchData();
    } catch (err) {
      error(t('toast.saveFailed'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await cmsApi.deleteMenuItem(itemToDelete.id);
      setItems(items.filter(i => i.id !== itemToDelete.id));
      success(t('toast.itemDeleted'));
    } catch (err) {
      error(t('toast.deleteFailed'));
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const openCreate = (loc: LocationType) => {
    setEditingItem(null);
    setActiveLocation(loc);
    setIsDialogOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setActiveLocation(item.location as LocationType);
    setIsDialogOpen(true);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: MenuItem, location: LocationType) => {
    setDraggedItem(item);
    setDragLocation(location);
    e.dataTransfer.effectAllowed = 'move';
    // Add visual feedback
    setTimeout(() => {
      const element = document.getElementById(`menu-item-${item.id}`);
      if (element) element.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (draggedItem) {
      const element = document.getElementById(`menu-item-${draggedItem.id}`);
      if (element) element.style.opacity = '1';
    }
    setDraggedItem(null);
    setDragOverItemId(null);
    setDragLocation(null);
  };

  const handleDragOver = (e: React.DragEvent, item: MenuItem) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (item.id !== draggedItem?.id && item.location === dragLocation) {
      setDragOverItemId(item.id);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverItemId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetItem: MenuItem) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetItem.id || draggedItem.location !== targetItem.location) {
      setDragOverItemId(null);
      return;
    }

    const location = targetItem.location as LocationType;
    const locationItems = items
      .filter(i => i.location === location)
      .sort((a, b) => a.order - b.order);

    // Calculate new order
    const draggedIndex = locationItems.findIndex(i => i.id === draggedItem.id);
    const targetIndex = locationItems.findIndex(i => i.id === targetItem.id);

    // Create new order array
    const newOrder = [...locationItems];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    // Update local state immediately for visual feedback
    const updatedItems = items.map(item => {
      const newIndex = newOrder.findIndex(i => i.id === item.id);
      if (newIndex !== -1) {
        return { ...item, order: newIndex };
      }
      return item;
    });
    setItems(updatedItems);

    // Update backend
    try {
      // Update each item's order
      await Promise.all(
        newOrder.map((item, index) => 
          cmsApi.updateMenuItem(item.id, { order: index })
        )
      );
      success(t('toast.orderUpdated'));
    } catch (err) {
      console.error('Failed to update order:', err);
      error(t('toast.orderFailed'));
      // Refresh to get correct state
      fetchData();
    }

    setDragOverItemId(null);
  };

  // Filter items by selected language
  const filteredItems = items.filter(i => i.language === selectedLanguage);
  const headerItems = filteredItems.filter(i => i.location === 'header').sort((a, b) => a.order - b.order);
  const footerItems = filteredItems.filter(i => i.location === 'footer').sort((a, b) => a.order - b.order);
  const communityFooterItems = filteredItems.filter(i => i.location === 'community_footer').sort((a, b) => a.order - b.order);

  const renderMenuList = (
    locationItems: MenuItem[], 
    title: string, 
    subtitle: string,
    location: LocationType,
    accentColor: string
  ) => (
    <div className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--dark-600)] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--brand-light)]">{title}</h2>
          <p className="text-sm text-[var(--brand-light)]/50">{subtitle}</p>
        </div>
        <button
          onClick={() => openCreate(location)}
          className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-4 py-2.5 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          {t('add')}
        </button>
      </div>
      
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : locationItems.length === 0 ? (
          <div className="text-center py-8 text-[var(--brand-light)]/40">
            <Navigation className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('emptyState')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {locationItems.length > 1 && (
              <p className="text-xs text-[var(--brand-light)]/40 mb-3 flex items-center gap-1">
                <GripVertical className="w-3 h-3" />
                {t('dragToReorder')}
              </p>
            )}
            {locationItems.map((item, index) => (
              <div 
                key={item.id}
                id={`menu-item-${item.id}`}
                draggable
                onDragStart={(e) => handleDragStart(e, item, location)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, item)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item)}
                className={`flex items-center justify-between p-4 bg-[var(--dark-700)] rounded-xl border-2 transition-all cursor-move select-none ${
                  dragOverItemId === item.id
                    ? `border-${accentColor} scale-[1.02] bg-${accentColor}/10`
                    : 'border-[var(--dark-600)] hover:border-[var(--dark-500)]'
                }`}
                style={{
                  borderColor: dragOverItemId === item.id ? `var(--${accentColor})` : undefined,
                  backgroundColor: dragOverItemId === item.id ? `var(--${accentColor})10` : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Drag Handle */}
                  <div className="flex items-center gap-2 text-[var(--brand-light)]/40">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  
                  {/* Order Badge */}
                  <span 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ 
                      backgroundColor: `var(--${accentColor})/0.2`,
                      color: `var(--${accentColor})`
                    }}
                  >
                    {index + 1}
                  </span>
                  
                  {/* Item Info */}
                  <div>
                    <div className="font-medium text-[var(--brand-light)]">{item.label}</div>
                    <div className="text-xs text-[var(--brand-light)]/50 flex items-center gap-1">
                      {item.page ? (
                        <>
                          <LinkIcon className="w-3 h-3" />
                          /{item.page_slug || '...'}
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-3 h-3" />
                          {item.external_url}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(item);
                    }}
                    className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-all flex items-center justify-center"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete(item);
                    }}
                    className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20 transition-all flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Language Selector */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 sm:px-6 py-4">
        <LanguageSelector
          value={selectedLanguage}
          onChange={(lang) => setSelectedLanguage(lang)}
          label="Select language to manage navigation for"
          variant="pills"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 px-4 sm:px-0">
        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
              <Navigation className="h-5 w-5 text-[var(--dark-900)]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.totalItems')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-primary)]">{items.length}</div>
        </div>

        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
              <Navigation className="h-5 w-5 text-[var(--dark-900)]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.header')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{headerItems.length}</div>
        </div>

        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
              <Navigation className="h-5 w-5 text-[var(--dark-900)]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.publicFooter')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{footerItems.length}</div>
        </div>

        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
              <Users className="h-5 w-5 text-[var(--dark-900)]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.community')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-purple)]">{communityFooterItems.length}</div>
        </div>

        <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)] flex items-center justify-center">
              <LinkIcon className="h-5 w-5 text-[var(--dark-900)]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.pages')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-peach)]">{pages.length}</div>
        </div>
      </div>

      {/* Navigation Lists - 3 columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 sm:px-0">
        {/* Header Navigation */}
        {renderMenuList(
          headerItems,
          t('sections.topNavigation'),
          t('sections.topNavigationDesc'),
          'header',
          'brand-blue'
        )}

        {/* Public Footer Navigation */}
        {renderMenuList(
          footerItems,
          t('sections.publicFooter'),
          t('sections.publicFooterDesc'),
          'footer',
          'brand-green'
        )}

        {/* Community Footer Navigation */}
        {renderMenuList(
          communityFooterItems,
          t('sections.communityFooter'),
          t('sections.communityFooterDesc'),
          'community_footer',
          'brand-purple'
        )}
      </div>

      <MenuFormDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        initialData={editingItem}
        location={activeLocation}
        pages={pages.filter(p => p.language === selectedLanguage)}
        language={selectedLanguage}
      />

      <ConfirmationModal
        isVisible={itemToDelete !== null}
        onClose={() => {
          if (!isDeleting) {
            setItemToDelete(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title={t('deleteModal.title')}
        message={t('deleteModal.message', { label: itemToDelete?.label || '' })}
        confirmButtonText={t('deleteModal.confirm')}
        cancelButtonText={t('deleteModal.cancel')}
        variant="danger"
        darkMode={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
