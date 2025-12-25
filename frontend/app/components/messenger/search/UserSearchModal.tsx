'use client';

import { useState, useEffect, useRef } from 'react';
import { messengerApi } from '../../../../lib/messenger-api';
import QuickMessageModal from '../QuickMessageModal';
import { User } from '../../../../types/user';
import { User as UserIcon, ShieldCheck, UserCog, Search, X } from 'lucide-react';

interface UserSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMessageSent?: (conversationId?: number) => void;
    onError?: (errorMsg: string) => void;
    darkMode?: boolean;
}

export default function UserSearchModal({ isOpen, onClose, onMessageSent, onError, darkMode = false }: UserSearchModalProps) {
    const [userType, setUserType] = useState<'YOUTH' | 'GUARDIAN' | 'STAFF' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Reset when modal closes
    useEffect(() => {
        if (!isOpen) {
            setUserType(null);
            setSearchQuery('');
            setSearchResults([]);
            setSelectedUser(null);
            setShowMessageModal(false);
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        if (!isOpen || !userType || !searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        setSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await messengerApi.searchUsers(searchQuery.trim(), userType);
                setSearchResults(res.data.results || []);
            } catch (err: any) {
                console.error('Search error:', err);
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, userType, isOpen]);

    const handleUserSelect = (user: User) => {
        setSelectedUser(user);
        setShowMessageModal(true);
    };

    const handleMessageSent = (conversationId?: number) => {
        setShowMessageModal(false);
        setSelectedUser(null);
        // Notify parent of success with conversationId
        if (onMessageSent) {
            onMessageSent(conversationId);
        }
        onClose();
    };
    
    const handleMessageError = (errorMsg: string) => {
        // Notify parent of error
        if (onError) {
            onError(errorMsg);
        }
    };

    if (!isOpen) return null;

    const inputClasses = `
        w-full h-11 sm:h-12 pl-10 sm:pl-12 pr-4 rounded-xl
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
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
            >
                <div
                    className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] shadow-2xl w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 sm:p-6 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 flex-shrink-0">
                        <div className="flex justify-between items-start gap-4 mb-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                        <UserIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)]">Send Individual Message</h2>
                                </div>
                                <p className="text-sm text-[var(--brand-light)]/50 ml-[52px]">Search for a user to message</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--dark-600)] hover:bg-[var(--dark-500)] flex items-center justify-center transition-colors text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] flex-shrink-0"
                            >
                                <X className="h-5 w-5 sm:h-6 sm:w-6" />
                            </button>
                        </div>

                        {/* User Type Selection */}
                        {!userType ? (
                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-[var(--brand-light)]">Select user type:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                    <button
                                        onClick={() => setUserType('YOUTH')}
                                        className="group p-4 sm:p-5 border-2 border-[var(--dark-500)] rounded-xl hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 active:bg-[var(--brand-primary)]/20 transition-all text-center touch-manipulation flex flex-col items-center gap-3"
                                    >
                                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[var(--brand-primary)]/20 group-hover:bg-[var(--brand-primary)] flex items-center justify-center transition-colors">
                                            <UserIcon className="w-6 h-6 sm:w-7 sm:w-7 text-[var(--brand-primary)] group-hover:text-white transition-colors" strokeWidth={2} />
                                        </div>
                                        <div className="font-semibold text-[var(--brand-light)] text-sm sm:text-base">Youth Member</div>
                                    </button>
                                    <button
                                        onClick={() => setUserType('GUARDIAN')}
                                        className="group p-4 sm:p-5 border-2 border-[var(--dark-500)] rounded-xl hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 active:bg-[var(--brand-primary)]/20 transition-all text-center touch-manipulation flex flex-col items-center gap-3"
                                    >
                                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[var(--brand-primary)]/20 group-hover:bg-[var(--brand-primary)] flex items-center justify-center transition-colors">
                                            <ShieldCheck className="w-6 h-6 sm:w-7 sm:w-7 text-[var(--brand-primary)] group-hover:text-white transition-colors" strokeWidth={2} />
                                        </div>
                                        <div className="font-semibold text-[var(--brand-light)] text-sm sm:text-base">Guardian</div>
                                    </button>
                                    <button
                                        onClick={() => setUserType('STAFF')}
                                        className="group p-4 sm:p-5 border-2 border-[var(--dark-500)] rounded-xl hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 active:bg-[var(--brand-primary)]/20 transition-all text-center touch-manipulation flex flex-col items-center gap-3"
                                    >
                                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[var(--brand-primary)]/20 group-hover:bg-[var(--brand-primary)] flex items-center justify-center transition-colors">
                                            <UserCog className="w-6 h-6 sm:w-7 sm:w-7 text-[var(--brand-primary)] group-hover:text-white transition-colors" strokeWidth={2} />
                                        </div>
                                        <div className="font-semibold text-[var(--brand-light)] text-sm sm:text-base">Staff Member</div>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 sm:gap-3">
                                <button
                                    onClick={() => {
                                        setUserType(null);
                                        setSearchQuery('');
                                        setSearchResults([]);
                                    }}
                                    className="w-9 h-9 rounded-xl bg-[var(--dark-600)] hover:bg-[var(--dark-500)] flex items-center justify-center transition-colors text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]"
                                >
                                    <svg className="w-4 w-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <span className="text-sm font-semibold text-[var(--brand-light)]">
                                    Searching: {userType === 'YOUTH' ? 'Youth Members' : userType === 'GUARDIAN' ? 'Guardians' : 'Staff Members'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Search Input */}
                    {userType && (
                        <div className="p-4 sm:p-6 border-b border-[var(--dark-600)] flex-shrink-0">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--brand-light)]/40" />
                                </div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={`Search ${userType === 'YOUTH' ? 'youth members' : userType === 'GUARDIAN' ? 'guardians' : 'staff members'}...`}
                                    className={inputClasses}
                                    onFocus={() => setFocusedField('search')}
                                    onBlur={() => setFocusedField(null)}
                                />
                                {searching && (
                                    <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
                                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Search Results */}
                    {userType && (
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
                            {!searchQuery.trim() ? (
                                <div className="text-center text-[var(--brand-light)]/50 py-8 sm:py-12">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 rounded-xl bg-[var(--dark-700)] flex items-center justify-center">
                                        <Search className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--brand-light)]/30" />
                                    </div>
                                    <p className="text-sm sm:text-base">Start typing to search...</p>
                                </div>
                            ) : searchResults.length === 0 && !searching ? (
                                <div className="text-center text-[var(--brand-light)]/50 py-8 sm:py-12">
                                    <p className="text-sm sm:text-base">No users found matching "{searchQuery}"</p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {searchResults.map((user) => (
                                        <li key={user.id}>
                                            <button
                                                onClick={() => handleUserSelect(user)}
                                                className="w-full p-3 sm:p-4 flex items-center gap-3 hover:bg-[var(--dark-700)] active:bg-[var(--dark-600)] rounded-xl transition-colors text-left touch-manipulation border border-transparent hover:border-[var(--brand-primary)]/30"
                                            >
                                                {/* Avatar */}
                                                {user.avatar_url ? (
                                                    <img
                                                        src={user.avatar_url}
                                                        alt={`${user.first_name} ${user.last_name}`}
                                                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover bg-[var(--dark-600)] border border-[var(--dark-500)] flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--brand-primary)]/20 flex items-center justify-center text-[var(--brand-primary)] font-semibold text-sm sm:text-base flex-shrink-0 border border-[var(--brand-primary)]/30">
                                                        {user.first_name?.[0] || 'U'}
                                                    </div>
                                                )}
                                                
                                                {/* User Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-[var(--brand-light)] text-sm sm:text-base truncate">
                                                        {user.first_name} {user.last_name}
                                                        {user.nickname && (
                                                            <span className="text-[var(--brand-light)]/50 font-normal ml-2">({user.nickname})</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs sm:text-sm text-[var(--brand-light)]/50 truncate">{user.email}</div>
                                                    {user.role && (
                                                        <div className="text-xs text-[var(--brand-light)]/40 mt-0.5">
                                                            {user.role.replace('_', ' ')}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Arrow */}
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--brand-light)]/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Message Modal */}
            {showMessageModal && selectedUser && (
                <QuickMessageModal
                    isOpen={showMessageModal}
                    onClose={() => {
                        setShowMessageModal(false);
                        setSelectedUser(null);
                    }}
                    recipientId={selectedUser.id}
                    recipientName={`${selectedUser.first_name} ${selectedUser.last_name}`}
                    onSuccess={handleMessageSent}
                    onError={handleMessageError}
                />
            )}
        </>
    );
}
