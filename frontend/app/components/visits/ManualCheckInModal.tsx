'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { visits, users } from '@/lib/api';
import { useToast } from '../../../hooks/useToast';
import { Search, UserPlus, X, CheckCircle2, Loader2 } from 'lucide-react';
import { getMediaUrl } from '@/app/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualCheckInModal({ isOpen, onClose, onSuccess }: Props) {
  const t = useTranslations('clubVisits.manualCheckInModal');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { success, error: showError, info, warning } = useToast();

  // Helper function to get user initials
  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || 'U';
  };

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedUser(null);
      setFocusedField(null);
    } else {
      // Focus search input when modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Debounce Search
  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setTimeout(async () => {
      if (query.length > 2) {
        setSearching(true);
        try {
          const res = await users.search(query);
          setResults(res.data.results || res.data || []);
        } catch (e) {
          console.error(e);
          setResults([]);
        } finally {
          setSearching(false);
        }
      } else {
        setResults([]);
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleSubmit = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const response = await visits.manualCheckIn({ user_id: selectedUser.id });
      
      // Check if user is already checked in (backend returns 200 with message instead of error)
      if (response.data?.message && (response.data.message.toLowerCase().includes('already here') || response.data.message.toLowerCase().includes('already checked'))) {
        warning(t('alreadyCheckedIn'));
        setLoading(false);
        return;
      }
      
      success(t('checkInSuccess'));
      setQuery('');
      setSelectedUser(null);
      setResults([]);
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      // Also check error response for the message
      const errorMessage = error.response?.data?.message || error.response?.data?.error || t('failedToCheckIn');
      if (errorMessage.includes('already here') || errorMessage.includes('already checked in')) {
        warning(t('alreadyCheckedIn'));
      } else {
        showError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const inputClasses = `
    w-full h-11 sm:h-12 px-4 pl-10 rounded-xl
    bg-[var(--dark-700)] border-2 
    ${focusedField === 'search' ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)] placeholder-[var(--brand-light)]/30
    outline-none transition-all duration-200
    hover:border-[var(--brand-primary)]/50
    focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
  `;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4"
        onClick={handleBackdropClick}
      >
        <div 
          className="w-full h-full sm:h-auto sm:max-w-lg bg-[var(--dark-800)] border-y sm:border border-[var(--dark-600)] shadow-2xl rounded-none sm:rounded-2xl flex flex-col max-h-[90vh] relative overflow-visible"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 flex-shrink-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)]">{t('title')}</h2>
            </div>
            <p className="text-sm text-[var(--brand-light)]/50 ml-[52px]">{t('description')}</p>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 flex-1 min-h-0 flex flex-col relative">
            <div className="space-y-4 overflow-y-auto flex-1 pb-20">
              {/* Search Input */}
              {!selectedUser ? (
                <div className="relative z-50">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40 z-10" />
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    className={inputClasses}
                    placeholder={t('searchPlaceholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setFocusedField('search')}
                    onBlur={() => setFocusedField(null)}
                  />
                  
                  {/* Loading Indicator */}
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                      <Loader2 className="h-4 w-4 text-[var(--brand-primary)] animate-spin" />
                    </div>
                  )}
                  
                  {/* Dropdown Results - Positioned directly below input */}
                  {results.length > 0 && (
                    <div className="absolute w-full bg-[var(--dark-800)] border-2 border-[var(--dark-600)] rounded-xl mt-2 shadow-2xl max-h-60 overflow-y-auto z-[1000]">
                      {results.map(user => (
                        <button
                          key={user.id}
                          onClick={() => { setSelectedUser(user); setResults([]); }}
                          className="w-full text-left p-3 hover:bg-[var(--dark-700)] flex items-center gap-3 border-b border-[var(--dark-600)] last:border-0 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-xl border-2 border-[var(--dark-500)] bg-[var(--dark-700)] overflow-hidden flex-shrink-0">
                            {user.avatar ? (
                              <img src={getMediaUrl(user.avatar) || ''} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)]">
                                <span className="text-xs font-bold text-white">
                                  {getInitials(user.first_name, user.last_name)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-[var(--brand-light)] truncate">{user.first_name} {user.last_name}</div>
                            <div className="text-xs text-[var(--brand-light)]/50 truncate">{user.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {query.length > 2 && results.length === 0 && !searching && (
                    <div className="absolute w-full bg-[var(--dark-800)] border-2 border-[var(--dark-600)] rounded-xl mt-2 p-3 text-sm text-[var(--brand-light)]/50 text-center shadow-2xl z-[1000]">
                      {t('noMembersFound')}
                    </div>
                  )}
                </div>
              ) : (
                // Selected User View
                <div className="bg-[var(--dark-700)] rounded-xl border-2 border-[var(--brand-primary)]/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl border-2 border-[var(--brand-primary)] bg-[var(--dark-700)] overflow-hidden flex-shrink-0">
                        {selectedUser.avatar ? (
                          <img src={getMediaUrl(selectedUser.avatar) || ''} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)]">
                            <span className="text-sm font-bold text-white">
                              {getInitials(selectedUser.first_name, selectedUser.last_name)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[var(--brand-light)] truncate">{selectedUser.first_name} {selectedUser.last_name}</div>
                        <div className="text-xs text-[var(--brand-light)]/50 truncate">{selectedUser.email}</div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-[var(--brand-third)] font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          {t('readyToCheckIn')}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setSelectedUser(null); setQuery(''); }}
                      className="w-9 h-9 rounded-xl bg-[var(--dark-600)] hover:bg-[var(--dark-500)] flex items-center justify-center transition-colors text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] flex-shrink-0 ml-3"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/30 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end flex-shrink-0 relative z-20">
            <button 
              onClick={onClose}
              disabled={loading}
              className="h-11 sm:h-12 px-4 sm:px-6 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!selectedUser || loading}
              className="h-11 sm:h-12 px-4 sm:px-6 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('checkingIn')}</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>{t('confirmCheckIn')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
    </>
  );
}
