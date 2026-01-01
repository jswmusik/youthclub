'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { visits, users } from '@/lib/api';
import { useToast } from '../../../hooks/useToast';
import { Search, UserPlus, X, CheckCircle2, Loader2, Users } from 'lucide-react';
import { getMediaUrl } from '@/app/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clubId: string | number;
}

export default function ManualCheckInModal({ isOpen, onClose, onSuccess, clubId }: Props) {
  const t = useTranslations('clubVisits.manualCheckInModal');
  const [query, setQuery] = useState('');
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [checkedInUserIds, setCheckedInUserIds] = useState<Set<number>>(new Set());
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { success, error: showError, warning } = useToast();

  // Helper function to get user initials
  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || 'U';
  };

  // Fetch all members and active sessions when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoadingMembers(true);
        try {
          // Fetch all youth members and active sessions in parallel
          const [membersRes, sessionsRes] = await Promise.all([
            users.search(''),
            visits.getActiveSessions(clubId)
          ]);

          // Process members - filter out inactive/deleted users
          const members = membersRes.data.results || membersRes.data || [];
          const activeMembers = members.filter((member: any) => member.is_active !== false);
          
          // Sort alphabetically by first name
          const sortedMembers = activeMembers.sort((a: any, b: any) => {
            const nameA = (a.first_name || '').toLowerCase();
            const nameB = (b.first_name || '').toLowerCase();
            return nameA.localeCompare(nameB, 'sv'); // Swedish locale for proper sorting
          });
          setAllMembers(sortedMembers);

          // Process active sessions to get checked-in user IDs
          const sessions = sessionsRes.data.results || sessionsRes.data || [];
          const checkedInIds = new Set<number>(
            sessions
              .filter((session: any) => !session.check_out_at) // Only active sessions
              .map((session: any) => session.user_details?.id || session.user)
          );
          setCheckedInUserIds(checkedInIds);
        } catch (e) {
          console.error('Failed to fetch data:', e);
          setAllMembers([]);
          setCheckedInUserIds(new Set());
        } finally {
          setLoadingMembers(false);
        }
      };
      fetchData();
    }
  }, [isOpen, clubId]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedUser(null);
      setFocusedField(null);
      // Clear data so it refreshes on next open
      setAllMembers([]);
      setCheckedInUserIds(new Set());
    } else {
      // Focus search input when modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Filter members based on search query and exclude already checked-in users
  const filteredMembers = useMemo(() => {
    // First, filter out users who are already checked in
    let available = allMembers.filter((member: any) => !checkedInUserIds.has(member.id));
    
    if (!query.trim()) {
      return available;
    }
    const searchLower = query.toLowerCase().trim();
    return available.filter((member: any) => {
      const fullName = `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase();
      const email = (member.email || '').toLowerCase();
      return fullName.includes(searchLower) || email.includes(searchLower);
    });
  }, [query, allMembers, checkedInUserIds]);

  const handleSubmit = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const response = await visits.manualCheckIn({ user_id: selectedUser.id });
      
      // Check if user is already checked in (backend returns 200 with message "User is already here!")
      if (response.data?.message && (response.data.message.toLowerCase().includes('already here') || response.data.message.toLowerCase().includes('already checked'))) {
        warning(t('alreadyCheckedIn', { name: `${selectedUser.first_name} ${selectedUser.last_name}` }));
        // Add to checked-in set to remove from list
        setCheckedInUserIds(prev => new Set([...prev, selectedUser.id]));
        setSelectedUser(null);
        setQuery('');
        return;
      }
      
      // Success! User was checked in
      success(t('checkedInSuccess', { name: `${selectedUser.first_name} ${selectedUser.last_name}` }));
      
      // Add to checked-in set to remove from list
      setCheckedInUserIds(prev => new Set([...prev, selectedUser.id]));
      setQuery('');
      setSelectedUser(null);
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      // Handle error response
      const errorMessage = error.response?.data?.message || error.response?.data?.error || '';
      if (errorMessage.toLowerCase().includes('already here') || errorMessage.toLowerCase().includes('already checked')) {
        warning(t('alreadyCheckedIn', { name: `${selectedUser.first_name} ${selectedUser.last_name}` }));
        // Add to checked-in set to remove from list
        setCheckedInUserIds(prev => new Set([...prev, selectedUser.id]));
        setSelectedUser(null);
        setQuery('');
      } else {
        showError(t('failedToCheckIn'));
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4 md:p-6"
        onClick={handleBackdropClick}
      >
        <div 
          className="w-full h-full sm:h-auto sm:max-h-[70vh] md:max-h-[65vh] sm:max-w-lg bg-[var(--dark-800)] border-y sm:border border-[var(--dark-600)] shadow-2xl rounded-none sm:rounded-2xl flex flex-col relative overflow-hidden"
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
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              {/* Search Input */}
              {!selectedUser ? (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="relative flex-shrink-0">
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
                    {loadingMembers && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                        <Loader2 className="h-4 w-4 text-[var(--brand-primary)] animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {/* Member Count */}
                  <div className="flex items-center justify-between mt-3 mb-2 px-1 flex-shrink-0">
                    <div className="flex items-center gap-2 text-sm text-[var(--brand-light)]/50">
                      <Users className="h-4 w-4" />
                      <span>
                        {query.trim() 
                          ? t('showingFiltered', { count: filteredMembers.length, total: allMembers.length })
                          : t('totalMembers', { count: allMembers.length })
                        }
                      </span>
                    </div>
                    {query.trim() && (
                      <button
                        onClick={() => setQuery('')}
                        className="text-xs text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 transition-colors"
                      >
                        {t('clearSearch')}
                      </button>
                    )}
                  </div>
                  
                  {/* Member List - Scrollable with reasonable height */}
                  <div className="flex-1 overflow-y-auto bg-[var(--dark-700)]/50 border border-[var(--dark-600)] rounded-xl min-h-[200px] max-h-[40vh] sm:max-h-[35vh] md:max-h-[30vh]">
                    {loadingMembers ? (
                      <div className="flex flex-col items-center justify-center py-12 text-[var(--brand-light)]/50">
                        <Loader2 className="h-8 w-8 animate-spin mb-3 text-[var(--brand-primary)]" />
                        <span className="text-sm">{t('loadingMembers')}</span>
                      </div>
                    ) : filteredMembers.length > 0 ? (
                      <div className="divide-y divide-[var(--dark-600)]">
                        {filteredMembers.map((user: any) => (
                          <button
                            key={user.id}
                            onClick={() => { setSelectedUser(user); }}
                            className="w-full text-left p-3 hover:bg-[var(--dark-600)] flex items-center gap-3 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-xl border-2 border-[var(--dark-500)] bg-[var(--dark-700)] overflow-hidden flex-shrink-0">
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
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-[var(--brand-light)]/50">
                        <Search className="h-8 w-8 mb-3 opacity-50" />
                        <span className="text-sm">{t('noMembersFound')}</span>
                        {query.trim() && (
                          <button
                            onClick={() => setQuery('')}
                            className="mt-2 text-xs text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 transition-colors"
                          >
                            {t('clearSearch')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
