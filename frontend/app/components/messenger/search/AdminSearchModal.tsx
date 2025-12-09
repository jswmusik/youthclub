'use client';

import { useState, useEffect, useRef } from 'react';
import { messengerApi } from '../../../../lib/messenger-api';
import QuickMessageModal from '../QuickMessageModal';
import { User } from '../../../../types/user';
import Toast from '../../../components/Toast';

interface AdminSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMessageSent?: (conversationId?: number) => void;
    onError?: (errorMsg: string) => void;
}

export default function AdminSearchModal({ isOpen, onClose, onMessageSent, onError }: AdminSearchModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Reset when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
            setSelectedAdmin(null);
            setShowMessageModal(false);
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        if (!isOpen || !searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        setSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await messengerApi.searchAdmins(searchQuery.trim());
                setSearchResults(res.data.results || []);
            } catch (err: any) {
                console.error('Search error:', err);
                setSearchResults([]);
                const errorMsg = err?.response?.data?.error || 'Failed to search admins.';
                setToast({ 
                    message: errorMsg, 
                    type: 'error', 
                    isVisible: true 
                });
                if (onError) {
                    onError(errorMsg);
                }
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, isOpen, onError]);

    const handleAdminSelect = (admin: User) => {
        setSelectedAdmin(admin);
        setShowMessageModal(true);
    };

    const handleMessageSent = (conversationId?: number) => {
        setShowMessageModal(false);
        setSelectedAdmin(null);
        // Notify parent of success with conversation ID
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
                                <h2 className="text-xl font-bold text-gray-800">Contact an Admin</h2>
                                <p className="text-sm text-gray-500">Search for an admin to message</p>
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

                        {/* Search Input */}
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
                                placeholder="Search admins by name or email..."
                                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {searching && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Search Results */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {!searchQuery.trim() ? (
                            <div className="text-center text-gray-500 py-8">
                                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <p>Start typing to search for admins...</p>
                                <p className="text-xs text-gray-400 mt-2">
                                    You can contact admins in your municipality or admins of clubs you follow (even if outside your municipality)
                                </p>
                            </div>
                        ) : searchResults.length === 0 && !searching ? (
                            <div className="text-center text-gray-500 py-8">
                                <p>No admins found matching "{searchQuery}"</p>
                                <p className="text-xs text-gray-400 mt-2">
                                    You can only contact admins in your municipality or admins of clubs you follow
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {searchResults.map((admin) => (
                                    <li key={admin.id}>
                                        <button
                                            onClick={() => handleAdminSelect(admin)}
                                            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                                        >
                                            {/* Avatar */}
                                            {admin.avatar_url ? (
                                                <img
                                                    src={admin.avatar_url}
                                                    alt={`${admin.first_name} ${admin.last_name}`}
                                                    className="w-12 h-12 rounded-full object-cover bg-gray-200"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                                                    {admin.first_name?.[0] || 'A'}
                                                </div>
                                            )}
                                            
                                            {/* Admin Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-gray-900">
                                                    {admin.first_name} {admin.last_name}
                                                    {admin.nickname && (
                                                        <span className="text-gray-500 font-normal ml-2">({admin.nickname})</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500 truncate">{admin.email}</div>
                                                <div className="flex flex-col gap-1 mt-1">
                                                    {admin.role && (
                                                        <div className="text-xs text-gray-400">
                                                            {admin.role.replace('_', ' ')}
                                                        </div>
                                                    )}
                                                    {/* Club Admin Info */}
                                                    {admin.club && (
                                                        <div className="text-xs text-gray-600">
                                                            <span className="font-medium">Club:</span> {admin.club.name}
                                                            {admin.club.municipality && (
                                                                <span className="text-gray-500 ml-1">
                                                                    ({admin.club.municipality}
                                                                    {admin.club.is_followed && !admin.club.is_in_youth_municipality && (
                                                                        <span className="text-blue-600 ml-1">• Following</span>
                                                                    )}
                                                                    )
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* Municipality Admin Info */}
                                                    {admin.municipality && (
                                                        <div className="text-xs text-gray-600">
                                                            <span className="font-medium">Municipality:</span> {admin.municipality.name}
                                                        </div>
                                                    )}
                                                </div>
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
                </div>
            </div>

            {/* Quick Message Modal */}
            {showMessageModal && selectedAdmin && (
                <QuickMessageModal
                    isOpen={showMessageModal}
                    onClose={() => {
                        setShowMessageModal(false);
                        setSelectedAdmin(null);
                    }}
                    recipientId={selectedAdmin.id}
                    recipientName={`${selectedAdmin.first_name} ${selectedAdmin.last_name}`}
                    onSuccess={handleMessageSent}
                    onError={handleMessageError}
                />
            )}
            
            {/* Toast Notification */}
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />
        </>
    );
}
