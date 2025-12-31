'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import AddMemberModal from './AddMemberModal';
import { Event } from '@/types/event';
import api from '@/lib/api';
import { Trash2, Eye, UserPlus, FileEdit, Send, X, Calendar, MapPin, Clock, Repeat } from 'lucide-react';
import { format } from 'date-fns';

interface EventActionModalProps {
    event: Event | null;
    isOpen: boolean;
    onClose: () => void;
    onEventUpdated: () => void;
    scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
    darkMode?: boolean;
}

export default function EventActionModal({ 
    event, 
    isOpen, 
    onClose, 
    onEventUpdated,
    scope,
    darkMode = false
}: EventActionModalProps) {
    const router = useRouter();
    const t = useTranslations('eventsAdmin.calendar.modal');
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeleteFutureModal, setShowDeleteFutureModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteFuture, setDeleteFuture] = useState(false);

    if (!isOpen || !event) return null;

    // Check if event is past
    const isPast = () => {
        const eventEndDate = new Date(event.end_date);
        const now = new Date();
        return eventEndDate < now;
    };

    const eventIsPast = isPast();

    const handleViewDetails = () => {
        router.push(`/admin/${scope.toLowerCase()}/events/${event.id}`);
    };

    const handleSetDraftClick = () => {
        setShowDraftModal(true);
    };

    const handleSetDraftConfirm = async () => {
        setLoading(true);
        try {
            await api.patch(`/events/${event.id}/`, { status: 'DRAFT' });
            setShowDraftModal(false);
            onEventUpdated();
            onClose();
        } catch (error: any) {
            console.error('Error setting event to draft:', error);
            alert(error.response?.data?.error || t('errors.setDraftFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handlePublishClick = () => {
        setShowPublishModal(true);
    };

    const handlePublishConfirm = async () => {
        setLoading(true);
        try {
            await api.patch(`/events/${event.id}/`, { status: 'PUBLISHED' });
            setShowPublishModal(false);
            onEventUpdated();
            onClose();
        } catch (error: any) {
            console.error('Error publishing event:', error);
            alert(error.response?.data?.error || t('errors.publishFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = () => {
        if (eventIsPast && event.parent_event) {
            setDeleteFuture(false);
            setShowDeleteModal(true);
        } else if (eventIsPast && event.is_recurring && !event.parent_event) {
            return;
        } else if (event.parent_event) {
            setShowDeleteFutureModal(true);
        } else if (event.is_recurring) {
            setShowDeleteModal(true);
        } else {
            setShowDeleteModal(true);
        }
    };

    const handleDeleteConfirm = async () => {
        setLoading(true);
        try {
            let url = `/events/${event.id}/`;
            if (event.parent_event && deleteFuture) {
                url += '?delete_future=true';
            }
            await api.delete(url);
            setShowDeleteModal(false);
            setShowDeleteFutureModal(false);
            setDeleteFuture(false);
            onEventUpdated();
            onClose();
        } catch (error: any) {
            console.error('Error deleting event:', error);
            alert(error.response?.data?.error || t('errors.deleteFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleAddMemberClick = () => {
        setShowAddMemberModal(true);
    };

    const handleMemberAdded = () => {
        setShowAddMemberModal(false);
        onEventUpdated();
    };

    // Dark mode styles
    const modalBg = darkMode ? 'bg-[var(--dark-800)]' : 'bg-white';
    const titleColor = darkMode 
        ? (eventIsPast ? 'text-[var(--brand-light)]/50' : 'text-[var(--brand-light)]')
        : (eventIsPast ? 'text-gray-500' : 'text-gray-900');
    const subtitleColor = darkMode
        ? (eventIsPast ? 'text-[var(--brand-light)]/30' : 'text-[var(--brand-light)]/60')
        : (eventIsPast ? 'text-gray-400' : 'text-gray-500');

    return (
        <>
            {/* Main Modal - Centered on all screens */}
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <div
                    className={`${modalBg} rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 transform transition-all duration-200 relative`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            darkMode 
                                ? 'text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)]'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Event Info */}
                    <div className="mb-5">
                        <h2 className={`text-lg sm:text-xl font-bold mb-2 pr-8 ${titleColor}`}>
                            {event.title}
                            {event.is_recurring && (
                                <Repeat className={`w-4 h-4 inline-block ml-2 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'}`} />
                            )}
                        </h2>
                        <div className={`flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm ${subtitleColor}`}>
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {format(new Date(event.start_date), 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {format(new Date(event.start_date), 'HH:mm')}
                            </span>
                            {event.location_name && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span className="truncate max-w-[120px]">{event.location_name}</span>
                                </span>
                            )}
                        </div>
                        {eventIsPast && (
                            <span className={`inline-flex mt-2 text-xs px-2 py-0.5 rounded ${
                                darkMode 
                                    ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/50'
                                    : 'bg-gray-200 text-gray-600'
                            }`}>
                                {t('pastEvent')}
                            </span>
                        )}
                    </div>

                    {/* For past parent recurring events, show no actions */}
                    {eventIsPast && event.is_recurring && !event.parent_event ? (
                        <div className="space-y-2">
                            <div className={`p-4 rounded-xl border ${
                                darkMode 
                                    ? 'bg-[var(--dark-700)] border-[var(--dark-500)]'
                                    : 'bg-gray-50 border-gray-200'
                            }`}>
                                <p className={`text-sm text-center ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                                    {t('pastRecurringMessage')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {!eventIsPast && (
                                <>
                                    <button
                                        onClick={handleViewDetails}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                                            darkMode 
                                                ? 'bg-[var(--brand-blue)]/20 hover:bg-[var(--brand-blue)]/30 border border-[var(--brand-blue)]/30'
                                                : 'bg-blue-50 hover:bg-blue-100'
                                        }`}
                                    >
                                        <Eye className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-blue)]' : 'text-blue-600'}`} />
                                        <div>
                                            <div className={`font-semibold text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{t('actions.viewDetails.title')}</div>
                                            <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>{t('actions.viewDetails.subtitle')}</div>
                                        </div>
                                    </button>

                                    {event.status === 'DRAFT' ? (
                                        <button
                                            onClick={handlePublishClick}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                                                darkMode 
                                                    ? 'bg-[var(--brand-green)]/20 hover:bg-[var(--brand-green)]/30 border border-[var(--brand-green)]/30'
                                                    : 'bg-green-50 hover:bg-green-100'
                                            }`}
                                        >
                                            <Send className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-green)]' : 'text-green-600'}`} />
                                            <div>
                                                <div className={`font-semibold text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{t('actions.publish.title')}</div>
                                                <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>{t('actions.publish.subtitle')}</div>
                                            </div>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSetDraftClick}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                                                darkMode 
                                                    ? 'bg-[var(--dark-700)] hover:bg-[var(--dark-600)] border border-[var(--dark-500)]'
                                                    : 'bg-gray-50 hover:bg-gray-100'
                                            }`}
                                        >
                                            <FileEdit className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'}`} />
                                            <div>
                                                <div className={`font-semibold text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{t('actions.setDraft.title')}</div>
                                                <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>{t('actions.setDraft.subtitle')}</div>
                                            </div>
                                        </button>
                                    )}

                                    <button
                                        onClick={handleAddMemberClick}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                                            darkMode 
                                                ? 'bg-[var(--brand-purple)]/20 hover:bg-[var(--brand-purple)]/30 border border-[var(--brand-purple)]/30'
                                                : 'bg-green-50 hover:bg-green-100'
                                        }`}
                                    >
                                        <UserPlus className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-green-600'}`} />
                                        <div>
                                            <div className={`font-semibold text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{t('actions.addMember.title')}</div>
                                            <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>{t('actions.addMember.subtitle')}</div>
                                        </div>
                                    </button>
                                </>
                            )}

                            {/* Only show delete button if not a past parent recurring event */}
                            {!(eventIsPast && event.is_recurring && !event.parent_event) && (
                                <button
                                    onClick={handleDeleteClick}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                                        darkMode 
                                            ? 'bg-[var(--brand-red)]/20 hover:bg-[var(--brand-red)]/30 border border-[var(--brand-red)]/30'
                                            : eventIsPast 
                                            ? 'bg-gray-50 hover:bg-gray-100' 
                                            : 'bg-red-50 hover:bg-red-100'
                                    }`}
                                >
                                    <Trash2 className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-red)]' : eventIsPast ? 'text-gray-600' : 'text-red-600'}`} />
                                    <div>
                                        <div className={`font-semibold text-sm ${darkMode ? 'text-[var(--brand-light)]' : eventIsPast ? 'text-gray-700' : 'text-gray-900'}`}>
                                            {t('actions.delete.title')}
                                        </div>
                                        <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                                            {eventIsPast && event.parent_event
                                                ? t('actions.delete.subtitle.pastInstance')
                                                : event.is_recurring && !event.parent_event 
                                                ? t('actions.delete.subtitle.recurringParent')
                                                : event.parent_event 
                                                ? t('actions.delete.subtitle.recurringInstance')
                                                : t('actions.delete.subtitle.regular')}
                                        </div>
                                    </div>
                                </button>
                            )}
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className={`w-full mt-4 px-4 py-3 rounded-xl font-semibold transition-colors ${
                            darkMode 
                                ? 'text-[var(--brand-light)]/70 bg-[var(--dark-700)] hover:bg-[var(--dark-600)] border border-[var(--dark-500)]'
                                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                        }`}
                    >
                        {t('actions.cancel')}
                    </button>
                </div>
            </div>

            {/* Set to Draft Confirmation Modal */}
            <ConfirmationModal
                isVisible={showDraftModal}
                onClose={() => setShowDraftModal(false)}
                onConfirm={handleSetDraftConfirm}
                title={t('confirmations.setDraft.title')}
                message={t('confirmations.setDraft.message', { title: event.title })}
                confirmButtonText={t('confirmations.setDraft.confirm')}
                cancelButtonText={t('confirmations.setDraft.cancel')}
                isLoading={loading}
                variant="warning"
                darkMode={darkMode}
            />

            {/* Publish Event Confirmation Modal */}
            <ConfirmationModal
                isVisible={showPublishModal}
                onClose={() => setShowPublishModal(false)}
                onConfirm={handlePublishConfirm}
                title={t('confirmations.publish.title')}
                message={t('confirmations.publish.message', { title: event.title })}
                confirmButtonText={t('confirmations.publish.confirm')}
                cancelButtonText={t('confirmations.publish.cancel')}
                isLoading={loading}
                variant="success"
                darkMode={darkMode}
            />

            {/* Delete Confirmation Modal - For parent recurring events and regular events */}
            {!event.parent_event && (
                <ConfirmationModal
                    isVisible={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleDeleteConfirm}
                    title={event.is_recurring ? t('confirmations.deleteRecurring.title') : t('confirmations.deleteRegular.title')}
                    message={
                        event.is_recurring
                            ? t('confirmations.deleteRecurring.message', { title: event.title })
                            : t('confirmations.deleteRegular.message', { title: event.title })
                    }
                    confirmButtonText={t('confirmations.deleteRecurring.confirm')}
                    cancelButtonText={t('confirmations.deleteRecurring.cancel')}
                    isLoading={loading}
                    variant="danger"
                    darkMode={darkMode}
                />
            )}

            {/* Delete Future Instances Modal - For recurring event instances (only if not past) */}
            {event.parent_event && !eventIsPast && (
                <div
                    className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${showDeleteFutureModal ? '' : 'hidden'}`}
                    onClick={() => {
                        setShowDeleteFutureModal(false);
                        setDeleteFuture(false);
                    }}
                >
                    <div
                        className={`${modalBg} rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-200`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full ${
                            darkMode ? 'bg-[var(--brand-red)]/20' : 'bg-red-100'
                        }`}>
                            <Trash2 className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-red)]' : 'text-red-600'}`} />
                        </div>
                        <h2 className={`text-xl font-bold text-center mb-3 ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                            {t('confirmations.deleteInstance.title')}
                        </h2>
                        <p className={`text-center mb-6 leading-relaxed text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                            {t('confirmations.deleteInstance.message')}
                        </p>

                        <div className="space-y-3 mb-6">
                            <button
                                onClick={() => {
                                    setDeleteFuture(false);
                                    setShowDeleteFutureModal(false);
                                    setShowDeleteModal(true);
                                }}
                                className={`w-full px-4 py-3 rounded-xl text-left transition-colors border-2 ${
                                    darkMode 
                                        ? 'bg-[var(--dark-700)] hover:bg-[var(--dark-600)] border-transparent hover:border-[var(--brand-light)]/20'
                                        : 'bg-gray-50 hover:bg-gray-100 border-transparent hover:border-gray-300'
                                }`}
                            >
                                <div className={`font-semibold text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{t('confirmations.deleteInstance.deleteOnlyThis.title')}</div>
                                <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>{t('confirmations.deleteInstance.deleteOnlyThis.subtitle')}</div>
                            </button>

                            <button
                                onClick={() => {
                                    setDeleteFuture(true);
                                    setShowDeleteFutureModal(false);
                                    setShowDeleteModal(true);
                                }}
                                className={`w-full px-4 py-3 rounded-xl text-left transition-colors border-2 ${
                                    darkMode 
                                        ? 'bg-[var(--brand-red)]/20 hover:bg-[var(--brand-red)]/30 border-transparent hover:border-[var(--brand-red)]/30'
                                        : 'bg-red-50 hover:bg-red-100 border-transparent hover:border-red-300'
                                }`}
                            >
                                <div className={`font-semibold text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{t('confirmations.deleteInstance.deleteFuture.title')}</div>
                                <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>{t('confirmations.deleteInstance.deleteFuture.subtitle')}</div>
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                setShowDeleteFutureModal(false);
                                setDeleteFuture(false);
                            }}
                            className={`w-full px-4 py-3 rounded-xl font-semibold transition-colors ${
                                darkMode 
                                    ? 'text-[var(--brand-light)]/70 bg-[var(--dark-700)] hover:bg-[var(--dark-600)] border border-[var(--dark-500)]'
                                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                            }`}
                        >
                            {t('confirmations.deleteInstance.cancel')}
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal - For instances (past or future) */}
            {event.parent_event && (
                <ConfirmationModal
                    isVisible={showDeleteModal && (!showDeleteFutureModal || eventIsPast)}
                    onClose={() => {
                        setShowDeleteModal(false);
                        setDeleteFuture(false);
                    }}
                    onConfirm={handleDeleteConfirm}
                    title={eventIsPast ? t('confirmations.deletePastInstance.title') : (deleteFuture ? t('confirmations.deleteFutureInstances.title') : t('confirmations.deleteThisInstance.title'))}
                    message={
                        eventIsPast
                            ? t('confirmations.deletePastInstance.message', { title: event.title })
                            : deleteFuture
                            ? t('confirmations.deleteFutureInstances.message', { title: event.title })
                            : t('confirmations.deleteThisInstance.message', { title: event.title })
                    }
                    confirmButtonText={t('confirmations.deletePastInstance.confirm')}
                    cancelButtonText={t('confirmations.deletePastInstance.cancel')}
                    isLoading={loading}
                    variant="danger"
                    darkMode={darkMode}
                />
            )}

            {/* Add Member Modal */}
            {showAddMemberModal && (
                <AddMemberModal
                    event={event}
                    isOpen={showAddMemberModal}
                    onClose={() => setShowAddMemberModal(false)}
                    onMemberAdded={handleMemberAdded}
                    darkMode={darkMode}
                />
            )}
        </>
    );
}
