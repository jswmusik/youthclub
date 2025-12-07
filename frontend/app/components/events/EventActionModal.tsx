'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import AddMemberModal from './AddMemberModal';
import { Event } from '@/types/event';
import api from '@/lib/api';
import { Trash2, Eye, UserPlus, FileEdit, Send } from 'lucide-react';

interface EventActionModalProps {
    event: Event | null;
    isOpen: boolean;
    onClose: () => void;
    onEventUpdated: () => void;
    scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function EventActionModal({ 
    event, 
    isOpen, 
    onClose, 
    onEventUpdated,
    scope 
}: EventActionModalProps) {
    const router = useRouter();
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
            alert(error.response?.data?.error || 'Failed to set event to draft');
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
            alert(error.response?.data?.error || 'Failed to publish event');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = () => {
        // For past events, only allow single instance deletion
        if (eventIsPast && event.parent_event) {
            // Past instance - delete only this instance
            setDeleteFuture(false);
            setShowDeleteModal(true);
        } else if (eventIsPast && event.is_recurring && !event.parent_event) {
            // Past parent recurring event - no action allowed from calendar
            return;
        } else if (event.parent_event) {
            // It's an instance - ask if they want to delete future instances
            setShowDeleteFutureModal(true);
        } else if (event.is_recurring) {
            // It's a parent event - confirm deletion of all instances
            setShowDeleteModal(true);
        } else {
            // Regular event - just delete
            setShowDeleteModal(true);
        }
    };

    const handleDeleteConfirm = async () => {
        setLoading(true);
        try {
            let url = `/events/${event.id}/`;
            // If it's an instance and deleteFuture is true, add query parameter
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
            alert(error.response?.data?.error || 'Failed to delete event');
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

    return (
        <>
            {/* Main Modal */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h2 className={`text-xl font-bold mb-2 ${eventIsPast ? 'text-gray-500' : 'text-gray-900'}`}>
                        {event.title}
                    </h2>
                    <p className={`text-sm mb-6 ${eventIsPast ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(event.start_date).toLocaleDateString()} at {new Date(event.start_date).toLocaleTimeString()}
                        {eventIsPast && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Past Event</span>}
                    </p>

                    {/* For past parent recurring events, show no actions */}
                    {eventIsPast && event.is_recurring && !event.parent_event ? (
                        <div className="space-y-2">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-600 text-center">
                                    This is a past recurring event. Actions are not available from the calendar. 
                                    Please use the event detail page to manage this event.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {!eventIsPast && (
                                <>
                                    <button
                                        onClick={handleViewDetails}
                                        className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
                                    >
                                        <Eye className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <div className="font-semibold text-gray-900">View Event Details</div>
                                            <div className="text-xs text-gray-500">Go to event detail page</div>
                                        </div>
                                    </button>

                                    {event.status === 'DRAFT' ? (
                                        <button
                                            onClick={handlePublishClick}
                                            className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
                                        >
                                            <Send className="w-5 h-5 text-green-600" />
                                            <div>
                                                <div className="font-semibold text-gray-900">Publish Event</div>
                                                <div className="text-xs text-gray-500">Make event visible to public</div>
                                            </div>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSetDraftClick}
                                            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                                        >
                                            <FileEdit className="w-5 h-5 text-gray-600" />
                                            <div>
                                                <div className="font-semibold text-gray-900">Set to Draft</div>
                                                <div className="text-xs text-gray-500">Hide event from public view</div>
                                            </div>
                                        </button>
                                    )}

                                    <button
                                        onClick={handleAddMemberClick}
                                        className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
                                    >
                                        <UserPlus className="w-5 h-5 text-green-600" />
                                        <div>
                                            <div className="font-semibold text-gray-900">Add Member</div>
                                            <div className="text-xs text-gray-500">Add eligible member to event</div>
                                        </div>
                                    </button>
                                </>
                            )}

                            {/* Only show delete button if not a past parent recurring event */}
                            {!(eventIsPast && event.is_recurring && !event.parent_event) && (
                                <button
                                    onClick={handleDeleteClick}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                                        eventIsPast 
                                            ? 'bg-gray-50 hover:bg-gray-100' 
                                            : 'bg-red-50 hover:bg-red-100'
                                    }`}
                                >
                                    <Trash2 className={`w-5 h-5 ${eventIsPast ? 'text-gray-600' : 'text-red-600'}`} />
                                    <div>
                                        <div className={`font-semibold ${eventIsPast ? 'text-gray-700' : 'text-gray-900'}`}>
                                            Delete Event
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {eventIsPast && event.parent_event
                                                ? 'Delete only this past instance'
                                                : event.is_recurring && !event.parent_event 
                                                ? 'Delete this event and all instances'
                                                : event.parent_event 
                                                ? 'Delete this instance or future instances'
                                                : 'Permanently delete this event'}
                                        </div>
                                    </div>
                                </button>
                            )}
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full mt-4 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>

            {/* Set to Draft Confirmation Modal */}
            <ConfirmationModal
                isVisible={showDraftModal}
                onClose={() => setShowDraftModal(false)}
                onConfirm={handleSetDraftConfirm}
                title="Set Event to Draft?"
                message={`Are you sure you want to set "${event.title}" to draft? This will hide it from public view.`}
                confirmButtonText="Set to Draft"
                cancelButtonText="Cancel"
                isLoading={loading}
                variant="warning"
            />

            {/* Publish Event Confirmation Modal */}
            <ConfirmationModal
                isVisible={showPublishModal}
                onClose={() => setShowPublishModal(false)}
                onConfirm={handlePublishConfirm}
                title="Publish Event?"
                message={`Are you sure you want to publish "${event.title}"? This will make it visible to the public.`}
                confirmButtonText="Publish"
                cancelButtonText="Cancel"
                isLoading={loading}
                variant="success"
            />

            {/* Delete Confirmation Modal - For parent recurring events and regular events */}
            {!event.parent_event && (
                <ConfirmationModal
                    isVisible={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleDeleteConfirm}
                    title={event.is_recurring ? "Delete Recurring Event?" : "Delete Event?"}
                    message={
                        event.is_recurring
                            ? `Are you sure you want to delete "${event.title}"? This will permanently delete this event and ALL its recurring instances. This action cannot be undone.`
                            : `Are you sure you want to delete "${event.title}"? This action cannot be undone.`
                    }
                    confirmButtonText="Delete"
                    cancelButtonText="Cancel"
                    isLoading={loading}
                    variant="danger"
                />
            )}

            {/* Delete Future Instances Modal - For recurring event instances (only if not past) */}
            {event.parent_event && !eventIsPast && (
                <div
                    className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${showDeleteFutureModal ? '' : 'hidden'}`}
                    onClick={() => {
                        setShowDeleteFutureModal(false);
                        setDeleteFuture(false);
                    }}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full bg-red-100">
                            <Trash2 className="w-6 h-6 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 text-center mb-3">
                            Delete Recurring Event Instance?
                        </h2>
                        <p className="text-gray-600 text-center mb-6 leading-relaxed">
                            This is an instance of a recurring event. How would you like to proceed?
                        </p>

                        <div className="space-y-3 mb-6">
                            <button
                                onClick={() => {
                                    setDeleteFuture(false);
                                    setShowDeleteFutureModal(false);
                                    setShowDeleteModal(true);
                                }}
                                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors border-2 border-transparent hover:border-gray-300"
                            >
                                <div className="font-semibold text-gray-900">Delete Only This Instance</div>
                                <div className="text-xs text-gray-500">Remove just this occurrence</div>
                            </button>

                            <button
                                onClick={() => {
                                    setDeleteFuture(true);
                                    setShowDeleteFutureModal(false);
                                    setShowDeleteModal(true);
                                }}
                                className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg text-left transition-colors border-2 border-transparent hover:border-red-300"
                            >
                                <div className="font-semibold text-gray-900">Delete This and All Future Instances</div>
                                <div className="text-xs text-gray-500">Remove this instance and all occurrences after it</div>
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                setShowDeleteFutureModal(false);
                                setDeleteFuture(false);
                            }}
                            className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Cancel
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
                    title={eventIsPast ? "Delete Past Instance?" : (deleteFuture ? "Delete Future Instances?" : "Delete This Instance?")}
                    message={
                        eventIsPast
                            ? `Are you sure you want to delete this past instance of "${event.title}"? This action cannot be undone.`
                            : deleteFuture
                            ? `Are you sure you want to delete this instance and ALL future instances of "${event.title}"? This action cannot be undone.`
                            : `Are you sure you want to delete this instance of "${event.title}"? This action cannot be undone.`
                    }
                    confirmButtonText="Delete"
                    cancelButtonText="Cancel"
                    isLoading={loading}
                    variant="danger"
                />
            )}

            {/* Add Member Modal */}
            {showAddMemberModal && (
                <AddMemberModal
                    event={event}
                    isOpen={showAddMemberModal}
                    onClose={() => setShowAddMemberModal(false)}
                    onMemberAdded={handleMemberAdded}
                />
            )}
        </>
    );
}

