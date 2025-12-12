'use client';

import { useState, useEffect, useRef } from 'react';
import { messengerApi } from '../../../../lib/messenger-api';
import QuickMessageModal from '../QuickMessageModal';
import { User } from '../../../../types/user';

interface UserSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMessageSent?: (conversationId?: number) => void;
    onError?: (errorMsg: string) => void;
}

export default function UserSearchModal({ isOpen, onClose, onMessageSent, onError }: UserSearchModalProps) {
    const [userType, setUserType] = useState<'YOUTH' | 'GUARDIAN' | 'STAFF' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showMessageModal, setShowMessageModal] = useState(false);
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

    return (
        <>
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
            >
                <div
                    className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col border border-gray-100 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 sm:p-6 border-b border-gray-100 flex-shrink-0">
                        <div className="flex justify-between items-start gap-4 mb-4">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-xl sm:text-2xl font-bold text-[#121213]">Send Individual Message</h2>
                                <p className="text-sm text-gray-500 mt-1">Search for a user to message</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 active:bg-gray-100 rounded-full p-1 transition-colors flex-shrink-0 touch-manipulation"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* User Type Selection */}
                        {!userType ? (
                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-[#121213]">Select user type:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                    <button
                                        onClick={() => setUserType('YOUTH')}
                                        className="p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:border-[#4D4DA4] hover:bg-[#EBEBFE]/30 active:bg-[#EBEBFE]/50 transition-all text-center touch-manipulation"
                                    >
                                        <div className="text-xl sm:text-2xl mb-2">👤</div>
                                        <div className="font-semibold text-[#121213] text-sm sm:text-base">Youth Member</div>
                                    </button>
                                    <button
                                        onClick={() => setUserType('GUARDIAN')}
                                        className="p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:border-[#4D4DA4] hover:bg-[#EBEBFE]/30 active:bg-[#EBEBFE]/50 transition-all text-center touch-manipulation"
                                    >
                                        <div className="text-xl sm:text-2xl mb-2">👨‍👩‍👧</div>
                                        <div className="font-semibold text-[#121213] text-sm sm:text-base">Guardian</div>
                                    </button>
                                    <button
                                        onClick={() => setUserType('STAFF')}
                                        className="p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:border-[#4D4DA4] hover:bg-[#EBEBFE]/30 active:bg-[#EBEBFE]/50 transition-all text-center touch-manipulation"
                                    >
                                        <div className="text-xl sm:text-2xl mb-2">👔</div>
                                        <div className="font-semibold text-[#121213] text-sm sm:text-base">Staff Member</div>
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
                                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100 rounded-full p-1 transition-colors touch-manipulation"
                                >
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <span className="text-sm font-semibold text-[#121213]">
                                    Searching: {userType === 'YOUTH' ? 'Youth Members' : userType === 'GUARDIAN' ? 'Guardians' : 'Staff Members'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Search Input */}
                    {userType && (
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex-shrink-0">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={`Search ${userType === 'YOUTH' ? 'youth members' : userType === 'GUARDIAN' ? 'guardians' : 'staff members'}...`}
                                    className="block w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#4D4DA4] focus:border-[#4D4DA4] focus:bg-white transition-colors"
                                />
                                {searching && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-[#4D4DA4] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Search Results */}
                    {userType && (
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
                            {!searchQuery.trim() ? (
                                <div className="text-center text-gray-500 py-8 sm:py-12">
                                    <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <p className="text-sm sm:text-base">Start typing to search...</p>
                                </div>
                            ) : searchResults.length === 0 && !searching ? (
                                <div className="text-center text-gray-500 py-8 sm:py-12">
                                    <p className="text-sm sm:text-base">No users found matching "{searchQuery}"</p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {searchResults.map((user) => (
                                        <li key={user.id}>
                                            <button
                                                onClick={() => handleUserSelect(user)}
                                                className="w-full p-3 sm:p-4 flex items-center gap-3 hover:bg-[#EBEBFE]/30 active:bg-[#EBEBFE]/50 rounded-lg transition-colors text-left touch-manipulation border border-transparent hover:border-[#EBEBFE]"
                                            >
                                                {/* Avatar */}
                                                {user.avatar_url ? (
                                                    <img
                                                        src={user.avatar_url}
                                                        alt={`${user.first_name} ${user.last_name}`}
                                                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover bg-gray-200 border border-gray-200 flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#EBEBFE] flex items-center justify-center text-[#4D4DA4] font-semibold text-sm sm:text-base flex-shrink-0 border border-[#EBEBFE]">
                                                        {user.first_name?.[0] || 'U'}
                                                    </div>
                                                )}
                                                
                                                {/* User Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-[#121213] text-sm sm:text-base truncate">
                                                        {user.first_name} {user.last_name}
                                                        {user.nickname && (
                                                            <span className="text-gray-500 font-normal ml-2">({user.nickname})</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs sm:text-sm text-gray-500 truncate">{user.email}</div>
                                                    {user.role && (
                                                        <div className="text-xs text-gray-400 mt-0.5">
                                                            {user.role.replace('_', ' ')}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Arrow */}
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
