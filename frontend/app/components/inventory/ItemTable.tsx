'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Item, inventoryApi } from '@/lib/inventory-api';
import Link from 'next/link';
import { Eye, Edit, Trash2, Package, ChevronLeft, Tag, Users } from 'lucide-react';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { getMediaUrl } from '@/app/utils';

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick: () => void;
}

function SwipeableCard({ children, onView, onEdit, onDelete, onClick }: SwipeableCardProps) {
  const t = useTranslations('inventoryAdmin');
  const [isOpen, setIsOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionWidth = 140;
  const threshold = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = startX - e.touches[0].clientX;
    if (isOpen) {
      const newX = Math.max(-actionWidth, Math.min(0, -actionWidth + (startX - e.touches[0].clientX) * -1));
      setCurrentX(newX);
    } else {
      const newX = Math.max(-actionWidth, Math.min(0, -diff));
      setCurrentX(newX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (isOpen) {
      if (currentX > -actionWidth + threshold) {
        setIsOpen(false);
        setCurrentX(0);
      } else {
        setCurrentX(-actionWidth);
      }
    } else {
      if (currentX < -threshold) {
        setIsOpen(true);
        setCurrentX(-actionWidth);
      } else {
        setCurrentX(0);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isOpen && Math.abs(currentX) < 5) {
      onClick();
    } else if (isOpen) {
      setIsOpen(false);
      setCurrentX(0);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit();
    setIsOpen(false);
    setCurrentX(0);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
    setIsOpen(false);
    setCurrentX(0);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node) && isOpen) {
        setIsOpen(false);
        setCurrentX(0);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={cardRef} className="relative overflow-hidden">
      {/* Action buttons (behind the card) */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          onClick={handleEditClick}
          className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-blue)] text-white transition-all active:bg-[var(--brand-blue)]/80"
        >
          <Edit className="w-5 h-5" />
          <span className="text-xs font-medium">{t('actions.edit')}</span>
        </button>
        <button
          onClick={handleDeleteClick}
          className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-red)] text-white transition-all active:bg-[var(--brand-red)]/80"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs font-medium">{t('actions.delete')}</span>
        </button>
      </div>

      {/* Swipeable card content */}
      <div
        className="relative bg-[var(--dark-700)] transition-transform duration-200 ease-out cursor-pointer"
        style={{ 
          transform: `translateX(${isDragging ? currentX : (isOpen ? -actionWidth : 0)}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {children}
        {/* Swipe hint indicator */}
        {!isOpen && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/20 pointer-events-none">
            <ChevronLeft className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}

interface ItemTableProps {
  items: Item[];
  basePath: string;
  onDelete?: () => void;
  onDeleteError?: (error: string) => void;
  buildUrlWithParams?: (path: string) => string;
}

export default function ItemTable({ items, basePath, onDelete, onDeleteError, buildUrlWithParams }: ItemTableProps) {
  const router = useRouter();
  const t = useTranslations('inventoryAdmin');
  const [itemToDelete, setItemToDelete] = useState<{ id: number; title: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const itemsArray = Array.isArray(items) ? items : [];

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setDeletingId(itemToDelete.id);
    try {
      await inventoryApi.deleteItem(itemToDelete.id);
      if (onDelete) {
        onDelete();
      } else {
        router.refresh();
      }
      setItemToDelete(null);
    } catch (error: any) {
      console.error('Delete error:', error);
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || t('toast.failedToDelete');
      if (onDeleteError) {
        onDeleteError(errorMessage);
      }
      setItemToDelete(null);
    } finally {
      setDeletingId(null);
    }
  };
  
  const getStatusBadge = (status: string, activeLoan: any) => {
    switch(status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30">
            {t('status.available')}
          </span>
        );
      case 'BORROWED':
        return (
          <div className="flex flex-col items-start gap-1">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border border-[var(--brand-blue)]/30">
              {t('status.borrowed')}
            </span>
            {activeLoan && (
              <span className="text-xs text-[var(--brand-light)]/50">
                {t('status.by')} {activeLoan.user_name} 
                {activeLoan.is_guest && <span className="text-[var(--brand-peach)] font-bold ml-1">{t('status.guest')}</span>}
              </span>
            )}
          </div>
        );
      case 'MAINTENANCE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30">
            {t('status.broken')}
          </span>
        );
      case 'MISSING':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--dark-600)] text-[var(--brand-light)]/70 border border-[var(--dark-500)]">
            {t('status.missing')}
          </span>
        );
      case 'HIDDEN':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--dark-600)] text-[var(--brand-light)]/70 border border-[var(--dark-500)]">
            {t('status.hidden')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--dark-600)] text-[var(--brand-light)]/70 border border-[var(--dark-500)]">
            {status}
          </span>
        );
    }
  };

  if (itemsArray.length === 0) {
    return (
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-[var(--brand-light)]/30" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noItemsFound')}</h3>
        <p className="text-[var(--brand-light)]/50 text-sm">{t('emptyState.addItemMessage')}</p>
      </div>
    );
  }

  return (
    <>
      {/* MOBILE: Swipeable Cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {itemsArray.map(item => (
          <SwipeableCard
            key={item.id}
            onClick={() => router.push(buildUrlWithParams ? buildUrlWithParams(`${basePath}/view/${item.id}`) : `${basePath}/view/${item.id}`)}
            onEdit={() => router.push(buildUrlWithParams ? buildUrlWithParams(`${basePath}/edit/${item.id}`) : `${basePath}/edit/${item.id}`)}
            onDelete={() => setItemToDelete({ id: item.id, title: item.title })}
          >
            <div className="border-y border-[var(--dark-600)] p-4">
              <div className="flex items-start gap-3">
                {/* Image */}
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--dark-600)] border border-[var(--dark-500)] flex items-center justify-center">
                  {item.image ? (
                    <img src={getMediaUrl(item.image) || ''} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-5 h-5 text-[var(--brand-primary)]" />
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-[var(--brand-light)] truncate">
                    {item.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-xs text-[var(--brand-light)]/50 truncate">
                    {item.internal_note || t('noDescription')}
                  </p>
                  
                  {/* Badges */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.category_details && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
                        <Tag className="w-3 h-3" />
                        {item.category_details.icon} {item.category_details.name}
                      </span>
                    )}
                    {getStatusBadge(item.status, item.active_loan)}
                    {item.queue_count > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-peach)]/20 text-[var(--brand-peach)]">
                        <Users className="w-3 h-3" />
                        {item.queue_count} {t('waiting')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SwipeableCard>
        ))}
      </div>

      {/* DESKTOP: Table */}
      <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--dark-600)]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.item')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.category')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.queue')}</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                </tr>
              </thead>
          <tbody>
            {itemsArray.map((item, index) => (
              <tr 
                key={item.id} 
                className={`${index !== itemsArray.length - 1 ? 'border-b border-[var(--dark-600)]/50' : ''} hover:bg-[var(--dark-700)]/30 transition-colors`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--dark-600)] border border-[var(--dark-500)] flex items-center justify-center">
                      {item.image ? (
                        <img src={getMediaUrl(item.image) || ''} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-[var(--brand-primary)]" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--brand-light)]">{item.title}</div>
                      <div className="text-xs text-[var(--brand-light)]/50 truncate max-w-[200px]">{item.internal_note || t('noDescription')}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {item.category_details ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
                      {item.category_details.icon} {item.category_details.name}
                    </span>
                  ) : (
                    <span className="text-sm text-[var(--brand-light)]/40">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(item.status, item.active_loan)}
                </td>
                <td className="px-6 py-4">
                  {item.queue_count > 0 ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-peach)]">
                      <Users className="w-3.5 h-3.5" />
                      {item.queue_count} {t('waiting')}
                    </span>
                  ) : (
                    <span className="text-sm text-[var(--brand-light)]/40">{t('empty')}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={buildUrlWithParams ? buildUrlWithParams(`${basePath}/view/${item.id}`) : `${basePath}/view/${item.id}`}>
                      <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
                        <Eye className="w-4 h-4" />
                      </button>
                    </Link>
                    <Link href={buildUrlWithParams ? buildUrlWithParams(`${basePath}/edit/${item.id}`) : `${basePath}/edit/${item.id}`}>
                      <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
                        <Edit className="w-4 h-4" />
                      </button>
                    </Link>
                    <button 
                      onClick={() => setItemToDelete({ id: item.id, title: item.title })}
                      disabled={deletingId === item.id}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isVisible={!!itemToDelete}
        onClose={() => {
          if (!deletingId) {
            setItemToDelete(null);
          }
        }}
        onConfirm={handleDelete}
        title={t('modals.deleteItem.title')}
        message={itemToDelete ? t('modals.deleteItem.message', { name: itemToDelete.title }) : ''}
        confirmButtonText={t('modals.deleteItem.confirm')}
        cancelButtonText={t('modals.deleteItem.cancel')}
        isLoading={!!deletingId}
        variant="danger"
        darkMode={true}
      />
    </>
  );
}
