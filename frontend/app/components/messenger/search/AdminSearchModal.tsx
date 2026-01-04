'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { messengerApi } from '../../../../lib/messenger-api';
import QuickMessageModal from '../QuickMessageModal';
import { User } from '../../../../types/user';
import { useToast } from '../../../../hooks/useToast';

interface AdminSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMessageSent?: (conversationId?: number) => void;
    onError?: (errorMsg: string) => void;
    darkMode?: boolean;
}

export default function AdminSearchModal({ isOpen, onClose, onMessageSent, onError, darkMode = false }: AdminSearchModalProps) {
    const t = useTranslations('messages.adminSearch');
    const [searchQuery, setSearchQuery] = useState('');
    const [allAdmins, setAllAdmins] = useState<User[]>([]);
    const [filteredAdmins, setFilteredAdmins] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [failedAvatars, setFailedAvatars] = useState<Set<number>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Toast state
    const { success, error, info, warning } = useToast();

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Load all admins when modal opens
    useEffect(() => {
        if (isOpen) {
            loadAdmins();
        }
    }, [isOpen]);

    // Reset when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setAllAdmins([]);
            setFilteredAdmins([]);
            setSelectedAdmin(null);
            setShowMessageModal(false);
            setFailedAvatars(new Set());
        }
    }, [isOpen]);

    // Filter admins when search query changes
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredAdmins(allAdmins);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = allAdmins.filter(admin => 
                admin.first_name?.toLowerCase().includes(query) ||
                admin.last_name?.toLowerCase().includes(query) ||
                admin.email?.toLowerCase().includes(query) ||
                admin.nickname?.toLowerCase().includes(query) ||
                (admin.club?.name && admin.club.name.toLowerCase().includes(query)) ||
                (admin.municipality?.name && admin.municipality.name.toLowerCase().includes(query))
            );
            setFilteredAdmins(filtered);
        }
    }, [searchQuery, allAdmins]);

    const loadAdmins = async () => {
        setLoading(true);
        try {
            // Call API without search query to get all available admins
            const res = await messengerApi.searchAdmins('');
            const admins = res.data.results || [];
            setAllAdmins(admins);
            setFilteredAdmins(admins);
        } catch (err: any) {
            console.error('Failed to load admins:', err);
            setAllAdmins([]);
            setFilteredAdmins([]);
            const errorMsg = err?.response?.data?.error || t('failedToLoadAdmins');
            error(errorMsg);
            if (onError) {
                onError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

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
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
            >
                <div
                    className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col ${
                        darkMode 
                            ? 'bg-[var(--dark-800)] border border-[var(--dark-500)]' 
                            : 'bg-white'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b bg-[var(--brand-purple)] rounded-t-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">{t('title')}</h2>
                                <p className="text-sm text-white/80">
                                    {allAdmins.length > 0 
                                        ? t('adminsAvailable', { count: allAdmins.length })
                                        : t('searchForAdmin')
                                    }
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="transition-colors text-white/80 hover:text-white"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('filterPlaceholder')}
                                className="block w-full pl-10 pr-3 py-3 rounded-lg bg-white/95 border border-white/20 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-white/50 focus:border-white/50"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Admin List */}
                    <div className="flex-1 overflow-y-auto p-6 bg-white">
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">
                                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3 border-[var(--brand-purple)]" />
                                <p>{t('loadingAdmins')}</p>
                            </div>
                        ) : allAdmins.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <p className="font-medium">{t('noAdminsAvailable')}</p>
                                <p className="text-xs mt-2 text-gray-400">
                                    {t('noAdminsMessage')}
                                </p>
                            </div>
                        ) : filteredAdmins.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>{t('noAdminsFound', { query: searchQuery })}</p>
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="text-sm mt-2 text-[var(--brand-purple)] hover:text-[var(--brand-purple)]/80"
                                >
                                    {t('clearSearch')}
                                </button>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {filteredAdmins.map((admin) => (
                                    <li key={admin.id}>
                                        <button
                                            onClick={() => handleAdminSelect(admin)}
                                            className="w-full p-4 flex items-center gap-3 rounded-lg transition-colors text-left hover:bg-gray-50"
                                        >
                                            {/* Avatar */}
                                            {admin.avatar_url && admin.avatar_url.trim() && !failedAvatars.has(admin.id) ? (
                                                <img
                                                    src={admin.avatar_url}
                                                    alt={`${admin.first_name} ${admin.last_name}`}
                                                    className="w-12 h-12 rounded-full object-cover bg-gray-200 border-2 border-gray-100 flex-shrink-0"
                                                    onError={() => {
                                                        setFailedAvatars(prev => new Set(prev).add(admin.id));
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full flex items-center justify-center font-semibold bg-blue-100 text-blue-600 flex-shrink-0">
                                                    {admin.first_name?.[0] || 'A'}
                                                </div>
                                            )}
                                            
                                            {/* Admin Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-gray-900">
                                                    {admin.first_name} {admin.last_name}
                                                    {admin.nickname && (
                                                        <span className="font-normal ml-2 text-gray-500">({admin.nickname})</span>
                                                    )}
                                                </div>
                                                <div className="text-sm truncate text-gray-500">{admin.email}</div>
                                                <div className="flex flex-col gap-1 mt-1">
                                                    {admin.role && (
                                                        <div className="text-xs text-gray-400">
                                                            {admin.role === 'CLUB_ADMIN' ? t('clubStaff') : admin.role === 'MUNICIPALITY_ADMIN' ? t('municipalityAdmin') : admin.role.replace('_', ' ')}
                                                        </div>
                                                    )}
                                                    {/* Club Admin Info */}
                                                    {admin.club && (
                                                        <div className="text-xs text-gray-600">
                                                            <span className="font-medium">{t('club')}:</span> {admin.club.name}
                                                            {admin.club.municipality && (
                                                                <span className="ml-1 text-gray-500">
                                                                    ({admin.club.municipality}
                                                                    {admin.club.is_followed && !admin.club.is_in_youth_municipality && (
                                                                        <span className="ml-1 text-[var(--brand-purple)]">• {t('following')}</span>
                                                                    )}
                                                                    )
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* Municipality Admin Info */}
                                                    {admin.municipality && (
                                                        <div className="text-xs text-gray-600">
                                                            <span className="font-medium">{t('municipality')}:</span> {admin.municipality.name}
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
                    darkMode={darkMode}
                />
            )}
            
            {/* Toast Notification */}
        </>
    );
}
