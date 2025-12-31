'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Package, Clock, CheckCircle2, AlertTriangle, ChevronLeft, User, Calendar, Eye } from 'lucide-react';

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onView?: () => void;
  onClick: () => void;
  showActions?: boolean;
}

function SwipeableCard({ children, onView, onClick, showActions = true }: SwipeableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionWidth = 70;
  const threshold = 35;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!showActions) return;
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !showActions) return;
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
    if (!showActions) return;
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

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onView) onView();
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
      {showActions && (
        <div className="absolute inset-y-0 right-0 flex items-stretch">
          <button
            onClick={handleViewClick}
            className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-blue)] text-white transition-all active:bg-[var(--brand-blue)]/80"
          >
            <Eye className="w-5 h-5" />
            <span className="text-xs font-medium">{t('labels.view')}</span>
          </button>
        </div>
      )}

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
        {showActions && !isOpen && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/20 pointer-events-none">
            <ChevronLeft className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}

interface LendingSession {
    id: number;
    item: number;
    item_title: string;
    user_name: string;
    borrowed_at: string;
    due_at?: string;
    returned_at: string | null;
    status: string;
    is_guest: boolean;
}

interface LendingHistoryTableProps {
    sessions: LendingSession[];
    showReturnButton?: boolean;
    onReturnItem?: (itemId: number) => void;
}

export default function LendingHistoryTable({ sessions, showReturnButton = false, onReturnItem }: LendingHistoryTableProps) {
    const t = useTranslations('inventoryAdmin.history');
    const sessionsArray = Array.isArray(sessions) ? sessions : [];
    
    const isOverdue = (dueAt?: string) => {
        if (!dueAt) return false;
        return new Date(dueAt) < new Date();
    };

    const getStatusBadge = (session: LendingSession) => {
        const overdue = session.status === 'ACTIVE' && isOverdue(session.due_at);
        
        if (session.status === 'ACTIVE') {
            return overdue ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30">
                    <AlertTriangle className="w-3 h-3" />
                    {t('status.overdue')}
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30">
                    <Clock className="w-3 h-3" />
                    {t('status.active')}
                </span>
            );
        }
        
        if (session.status === 'RETURNED_USER') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--dark-600)] text-[var(--brand-light)]/70 border border-[var(--dark-500)]">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('status.returned')}
                </span>
            );
        }
        
        if (session.status === 'RETURNED_SYSTEM') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30">
                    {t('status.systemAuto')}
                </span>
            );
        }
        
        if (session.status === 'RETURNED_ADMIN') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
                    {t('status.adminReturn')}
                </span>
            );
        }
        
        return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--dark-600)] text-[var(--brand-light)]/70 border border-[var(--dark-500)]">
                {session.status}
            </span>
        );
    };
    
    if (sessionsArray.length === 0) {
        return (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-[var(--brand-light)]/30" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noHistoryFound')}</h3>
                <p className="text-[var(--brand-light)]/50 text-sm">{t('emptyState.lendingHistoryWillAppear')}</p>
            </div>
        );
    }
    
    return (
        <>
            {/* Mobile: Swipeable Cards */}
            <div className="flex flex-col gap-3 md:hidden">
                {sessionsArray.map((session) => {
                    const overdue = session.status === 'ACTIVE' && isOverdue(session.due_at);
                    return (
                        <SwipeableCard
                            key={session.id}
                            onClick={() => {}}
                            onView={() => {}}
                            showActions={false}
                        >
                            <div className={`border-y border-[var(--dark-600)] p-4 ${overdue ? 'border-l-4 border-l-[var(--brand-red)]' : session.is_guest ? 'border-l-4 border-l-[var(--brand-peach)]' : ''}`}>
                                <div className="flex items-start gap-3">
                                    {/* Icon */}
                                    <div className="w-10 h-10 rounded-xl flex-shrink-0 bg-[var(--dark-600)] border border-[var(--dark-500)] flex items-center justify-center">
                                        <Package className="w-5 h-5 text-[var(--brand-primary)]" />
                                    </div>
                                    
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-base font-semibold text-[var(--brand-light)] truncate">
                                                    {session.item_title}
                                                </h3>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <User className="w-3 h-3 text-[var(--brand-light)]/40" />
                                                    <p className="text-xs text-[var(--brand-light)]/50 truncate">
                                                        {session.user_name}
                                                    </p>
                                                    {session.is_guest && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--brand-peach)]/20 text-[var(--brand-peach)]">
                                                            {t('labels.guest')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {getStatusBadge(session)}
                                        </div>
                                        
                                        {/* Times */}
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3 text-[var(--brand-light)]/40" />
                                                <span className="text-xs text-[var(--brand-light)]/50">{t('labels.out')}</span>
                                                <span className="text-xs text-[var(--brand-light)]">
                                                    {format(new Date(session.borrowed_at), 'MMM d, HH:mm')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3 h-3 text-[var(--brand-light)]/40" />
                                                <span className="text-xs text-[var(--brand-light)]/50">{t('labels.due')}</span>
                                                <span className={`text-xs ${overdue ? 'text-[var(--brand-red)] font-semibold' : 'text-[var(--brand-light)]'}`}>
                                                    {session.due_at ? format(new Date(session.due_at), 'MMM d, HH:mm') : '-'}
                                                </span>
                                            </div>
                                            {session.returned_at && (
                                                <div className="flex items-center gap-1.5 col-span-2">
                                                    <CheckCircle2 className="w-3 h-3 text-[var(--brand-green)]" />
                                                    <span className="text-xs text-[var(--brand-light)]/50">{t('labels.returned')}</span>
                                                    <span className="text-xs text-[var(--brand-light)]">
                                                        {format(new Date(session.returned_at), 'MMM d, HH:mm')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Return Button */}
                                        {showReturnButton && session.status === 'ACTIVE' && onReturnItem && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onReturnItem(session.item);
                                                }}
                                                className="mt-3 w-full py-2 rounded-xl text-sm font-bold bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90 transition-all"
                                            >
                                                {t('labels.returnItem')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </SwipeableCard>
                    );
                })}
            </div>

            {/* Desktop: Table */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--dark-600)]">
                            <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.item')}</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.borrower')}</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.timeOut')}</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.dueDate')}</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.timeIn')}</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                            {showReturnButton && (
                                <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {sessionsArray.map((session, index) => {
                            const overdue = session.status === 'ACTIVE' && isOverdue(session.due_at);
                            return (
                                <tr 
                                    key={session.id} 
                                    className={`${index !== sessionsArray.length - 1 ? 'border-b border-[var(--dark-600)]/50' : ''} hover:bg-[var(--dark-700)]/30 transition-colors ${overdue ? 'bg-[var(--brand-red)]/5' : session.is_guest ? 'bg-[var(--brand-peach)]/5' : ''}`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-[var(--dark-600)] border border-[var(--dark-500)] flex items-center justify-center">
                                                <Package className="w-4 h-4 text-[var(--brand-primary)]" />
                                            </div>
                                            <span className="font-semibold text-[var(--brand-light)]">{session.item_title}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[var(--brand-light)]">{session.user_name}</span>
                                            {session.is_guest && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30">
                                                    {t('labels.guest')}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-[var(--brand-light)]/60">
                                            {format(new Date(session.borrowed_at), 'MMM d, HH:mm')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {session.due_at ? (
                                            <span className={`text-sm font-semibold ${overdue ? 'text-[var(--brand-red)]' : 'text-[var(--brand-light)]'}`}>
                                                {format(new Date(session.due_at), 'MMM d, HH:mm')}
                                                {overdue && ' ⚠️'}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-[var(--brand-light)]/40">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-[var(--brand-light)]/60">
                                            {session.returned_at ? format(new Date(session.returned_at), 'MMM d, HH:mm') : '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(session)}
                                    </td>
                                    {showReturnButton && (
                                        <td className="px-6 py-4 text-right">
                                            {session.status === 'ACTIVE' && onReturnItem && (
                                                <button
                                                    onClick={() => onReturnItem(session.item)}
                                                    className="px-4 py-2 rounded-xl text-sm font-bold bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90 transition-all"
                                                >
                                                    {t('labels.returnItem')}
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
}
