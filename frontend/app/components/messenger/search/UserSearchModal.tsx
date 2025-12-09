'use client';

import { useState, useEffect, useRef } from 'react';
import { messengerApi } from '../../../../lib/messenger-api';
import QuickMessageModal from '../QuickMessageModal';
import { User } from '../../../../types/user';

interface UserSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMessageSent?: () => void;
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

    const handleMessageSent = () => {
        setShowMessageModal(false);
        setSelectedUser(null);
        // Notify parent of success
        if (onMessageSent) {
            onMessageSent();
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
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
            >
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Send Individual Message</h2>
                                <p className="text-sm text-gray-500">Search for a user to message</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* User Type Selection */}
                        {!userType ? (
                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-gray-700">Select user type:</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setUserType('YOUTH')}
                                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
                                    >
                                        <div className="text-2xl mb-2">👤</div>
                                        <div className="font-semibold text-gray-700">Youth Member</div>
                                    </button>
                                    <button
                                        onClick={() => setUserType('GUARDIAN')}
                                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
                                    >
                                        <div className="text-2xl mb-2">👨‍👩‍👧</div>
                                        <div className="font-semibold text-gray-700">Guardian</div>
                                    </button>
                                    <button
                                        onClick={() => setUserType('STAFF')}
                                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
                                    >
                                        <div className="text-2xl mb-2">👔</div>
                                        <div className="font-semibold text-gray-700">Staff Member</div>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setUserType(null);
                                        setSearchQuery('');
                                        setSearchResults([]);
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <span className="text-sm font-semibold text-gray-700">
                                    Searching: {userType === 'YOUTH' ? 'Youth Members' : userType === 'GUARDIAN' ? 'Guardians' : 'Staff Members'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Search Input */}
                    {userType && (
                        <div className="p-6 border-b border-gray-200">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={`Search ${userType === 'YOUTH' ? 'youth members' : userType === 'GUARDIAN' ? 'guardians' : 'staff members'} by name or email...`}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {searching && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Search Results */}
                    {userType && (
                        <div className="flex-1 overflow-y-auto p-6">
                            {!searchQuery.trim() ? (
                                <div className="text-center text-gray-500 py-8">
                                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <p>Start typing to search...</p>
                                </div>
                            ) : searchResults.length === 0 && !searching ? (
                                <div className="text-center text-gray-500 py-8">
                                    <p>No users found matching "{searchQuery}"</p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {searchResults.map((user) => (
                                        <li key={user.id}>
                                            <button
                                                onClick={() => handleUserSelect(user)}
                                                className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                                            >
                                                {/* Avatar */}
                                                {user.avatar_url ? (
                                                    <img
                                                        src={user.avatar_url}
                                                        alt={`${user.first_name} ${user.last_name}`}
                                                        className="w-12 h-12 rounded-full object-cover bg-gray-200"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                                                        {user.first_name?.[0] || 'U'}
                                                    </div>
                                                )}
                                                
                                                {/* User Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-gray-900">
                                                        {user.first_name} {user.last_name}
                                                        {user.nickname && (
                                                            <span className="text-gray-500 font-normal ml-2">({user.nickname})</span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500 truncate">{user.email}</div>
                                                    {user.role && (
                                                        <div className="text-xs text-gray-400 mt-1">
                                                            {user.role.replace('_', ' ')}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Arrow */}
                                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
