'use client';

import { ConversationList as ConversationListType } from '../../../../types/messenger';
import ConversationList from '../conversation/ConversationList';
import ConversationDetail from '../conversation/ConversationDetail';
import BroadcastComposerModal from '../broadcast/BroadcastComposerModal';
import UserSearchModal from '../search/UserSearchModal';
import { useToast } from '../../../../hooks/useToast';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mail, User, Users, UsersRound, Settings, Megaphone, Plus, Search, X, ArrowLeft, Inbox, RefreshCw } from 'lucide-react';

interface ThreeColumnLayoutProps {
    conversations: ConversationListType[];
    selectedThreadId: number | null;
    onSelectThread: (id: number) => void;
    loading: boolean;
    filter: string;
    onSetFilter: (filter: string) => void;
    searchQuery: string;
    onSetSearchQuery: (query: string) => void;
    onRefresh: () => void;
    scope?: 'GLOBAL' | 'MUNICIPALITY' | 'CLUB';
    darkMode?: boolean;
}

export default function ThreeColumnLayout({
    conversations,
    selectedThreadId,
    onSelectThread,
    loading,
    filter,
    onSetFilter,
    searchQuery,
    onSetSearchQuery,
    onRefresh,
    scope = 'CLUB',
    darkMode = false
}: ThreeColumnLayoutProps) {
    const t = useTranslations('inboxAdmin');
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    
    // Toast state
    const { success, error, info, warning } = useToast();

    // Filter options with Lucide icons
    const filters = [
        { id: 'ALL', label: t('filters.allMessages'), icon: Mail },
        { id: 'YOUTH', label: t('filters.youth'), icon: User },
        { id: 'GUARDIAN', label: t('filters.guardians'), icon: UsersRound },
        { id: 'GROUP', label: t('filters.groups'), icon: Users },
        { id: 'SYSTEM', label: t('filters.systemHQ'), icon: Settings },
    ];

    const filteredConversations = conversations;
    const totalUnreadCount = filteredConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

    // Base classes for dark mode
    const baseClasses = darkMode 
        ? 'bg-[var(--dark-800)] md:border md:border-[var(--dark-600)]' 
        : 'bg-white border border-gray-100';

    return (
        <div className={`flex flex-col md:flex-row h-full min-h-0 md:rounded-2xl overflow-hidden w-full max-w-full ${baseClasses}`} style={{ height: '100%', maxHeight: '100%' }}>
            
            {/* COL 1: Filters & Tools - Mobile: horizontal scrollable bar, Desktop: sidebar */}
            <div className={`
                flex md:flex-col md:w-16 lg:w-48 xl:w-64 
                border-b md:border-b-0 md:border-r 
                ${darkMode ? 'border-[var(--dark-600)] bg-[var(--dark-700)]/50' : 'border-gray-100 bg-[#EBEBFE]/30'}
                p-2 sm:p-3 md:p-3 lg:p-4 
                gap-2 md:gap-0 
                overflow-x-auto md:overflow-x-visible 
                min-w-0 max-w-full 
                transition-all duration-200 
                flex-shrink-0
                ${selectedThreadId ? 'hidden md:flex' : 'flex'}
            `}>
                {/* Mobile: Back button when viewing chat */}
                {selectedThreadId && (
                    <button 
                        onClick={() => onSelectThread(0 as any)}
                        className={`md:hidden flex-shrink-0 font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap ${
                            darkMode 
                                ? 'bg-[var(--dark-600)] hover:bg-[var(--dark-500)] text-[var(--brand-light)]' 
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                        aria-label={t('actions.backToInbox')}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>{t('actions.back')}</span>
                    </button>
                )}
                
                {/* Action Buttons */}
                <div className="flex md:flex-col gap-2 md:gap-2 lg:gap-3 md:min-w-0">
                    <button 
                        onClick={() => setShowSearchModal(true)}
                        className={`flex-shrink-0 md:w-full font-semibold py-2 px-3 sm:px-4 md:px-2 lg:px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap ${
                            darkMode 
                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/80' 
                                : 'bg-[#4D4DA4] hover:bg-[#FF5485] text-white'
                        }`}
                        title={t('actions.newMessageTitle')}
                    >
                        <Plus className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden sm:inline md:hidden lg:inline">{t('actions.newMessage')}</span>
                    </button>
                    <button 
                        onClick={() => setShowBroadcastModal(true)}
                        className={`flex-shrink-0 md:w-full font-semibold py-2 px-3 sm:px-4 md:px-2 lg:px-4 rounded-xl transition-all mb-0 md:mb-3 lg:mb-4 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap ${
                            darkMode 
                                ? 'bg-[var(--brand-purple)] text-white hover:bg-[var(--brand-purple)]/80' 
                                : 'bg-[#4D4DA4] hover:bg-[#FF5485] text-white'
                        }`}
                        title={t('actions.broadcastTitle')}
                    >
                        <Megaphone className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden sm:inline md:hidden lg:inline">{t('actions.broadcast')}</span>
                    </button>
                </div>

                {/* Filters */}
                <nav className="flex md:flex-col gap-1 md:gap-1 lg:gap-1 overflow-x-auto md:overflow-x-visible pb-1 sm:pb-2 md:pb-0">
                    {filters.map(f => {
                        const Icon = f.icon;
                        const isActive = filter === f.id;
                        return (
                            <button
                                key={f.id}
                                onClick={() => onSetFilter(f.id)}
                                className={`flex-shrink-0 md:w-full text-left px-2 sm:px-3 md:px-2 lg:px-3 py-2 md:py-2 lg:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center justify-center md:justify-start gap-2 ${
                                    darkMode 
                                        ? isActive 
                                            ? 'bg-[var(--dark-600)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/30' 
                                            : 'text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]'
                                        : isActive 
                                            ? 'bg-white text-[#4D4DA4] shadow-sm border border-[#EBEBFE]' 
                                            : 'text-gray-600 hover:bg-white hover:text-[#121213]'
                                }`}
                                title={f.label}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                <span className="hidden lg:inline">{f.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* COL 2: Conversation List */}
            <div className={`
                w-full md:w-56 lg:w-72 xl:w-80 2xl:w-96 md:min-w-[200px] lg:min-w-[260px] 
                border-r flex flex-col min-w-0 max-w-full
                ${darkMode ? 'border-[var(--dark-600)] bg-[var(--dark-800)]' : 'border-gray-100 bg-white'}
                ${selectedThreadId ? 'hidden md:flex' : 'flex'}
            `}>
                <div className={`p-3 sm:p-4 border-b flex-shrink-0 ${darkMode ? 'border-[var(--dark-600)]' : 'border-gray-100'}`}>
                    <div className="flex justify-between items-center mb-2 sm:mb-3">
                        <h3 className={`font-bold text-base sm:text-lg ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#121213]'}`}>{t('inbox')}</h3>
                        <div className="flex items-center gap-2">
                            {totalUnreadCount > 0 && (
                                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-[var(--brand-red)] rounded-full">
                                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                                </span>
                            )}
                            <button 
                                onClick={onRefresh}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                                    darkMode 
                                        ? 'text-[var(--brand-light)]/50 hover:text-[var(--brand-primary)] hover:bg-[var(--dark-600)]' 
                                        : 'text-gray-400 hover:text-[#4D4DA4] hover:bg-gray-100'
                                }`}
                                title={t('actions.refresh')}
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    {/* Search Field */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className={`h-4 w-4 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSetSearchQuery(e.target.value)}
                            placeholder={t('searchPlaceholder')}
                            className={`block w-full pl-9 pr-9 py-2 text-sm rounded-xl transition-all ${
                                darkMode 
                                    ? 'bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:border-[var(--brand-primary)] focus:ring-0 outline-none' 
                                    : 'border-0 bg-gray-50 focus:ring-2 focus:ring-[#4D4DA4] focus:bg-white'
                            }`}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSetSearchQuery('')}
                                className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                                    darkMode ? 'text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                    {loading ? (
                        <div className={`p-6 sm:p-8 text-center text-xs sm:text-sm ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3 ${
                                darkMode ? 'border-[var(--dark-500)] border-t-[var(--brand-primary)]' : 'border-gray-200 border-t-[#4D4DA4]'
                            }`} />
                            {t('loadingConversations')}
                        </div>
                    ) : (
                        <ConversationList 
                            conversations={filteredConversations}
                            selectedId={selectedThreadId}
                            onSelect={onSelectThread}
                            darkMode={darkMode}
                        />
                    )}
                </div>
            </div>

            {/* COL 3: Conversation Detail */}
            <div className={`
                flex-1 flex flex-col min-w-0 max-w-full md:min-w-[300px] h-full min-h-0
                ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-gray-50'}
                ${!selectedThreadId ? 'hidden md:flex' : 'flex'}
            `}>
                {selectedThreadId ? (
                    <ConversationDetail 
                        conversationId={selectedThreadId} 
                        onBack={() => onSelectThread(0 as any)}
                        isAdmin={true}
                        onRefresh={onRefresh}
                        darkMode={darkMode}
                    />
                ) : (
                    <div className={`flex-1 flex items-center justify-center flex-col ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`}>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                            darkMode ? 'bg-[var(--dark-700)]' : 'bg-gray-100'
                        }`}>
                            <Inbox className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-light)]/30' : 'text-gray-300'}`} />
                        </div>
                        <p className="text-sm">{t('skeleton.selectConversation')}</p>
                    </div>
                )}
            </div>

            {/* Broadcast Modal */}
            {showBroadcastModal && (
                <BroadcastComposerModal
                    onClose={() => setShowBroadcastModal(false)}
                    onSuccess={() => {
                        onRefresh();
                        success(t('toast.broadcastSuccess'));
                    }}
                    onError={(errorMsg: string) => {
                        error(errorMsg || t('toast.broadcastFailed'));
                    }}
                    initialScope={scope}
                    darkMode={darkMode}
                />
            )}

            {/* User Search Modal */}
            {showSearchModal && (
                <UserSearchModal
                    isOpen={showSearchModal}
                    onClose={() => {
                        setShowSearchModal(false);
                    }}
                    onMessageSent={(conversationId) => {
                        success(t('toast.messageSuccess'));
                        onRefresh();
                        if (conversationId) {
                            setTimeout(() => {
                                onSelectThread(conversationId);
                            }, 500);
                        }
                    }}
                    onError={(errorMsg: string) => {
                        error(errorMsg || t('toast.messageFailed'));
                    }}
                    darkMode={darkMode}
                />
            )}
            
            {/* Toast Notification */}
        </div>
    );
}
