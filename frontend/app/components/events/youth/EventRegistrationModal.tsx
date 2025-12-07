'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Event } from '@/types/event';
import { CheckCircle, AlertTriangle, Clock, X, Calendar, ExternalLink } from 'lucide-react';
import { getMediaUrl } from '@/app/utils';

interface ModalProps {
    event: Event;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EventRegistrationModal({ event, isOpen, onClose, onSuccess }: ModalProps) {
    const router = useRouter();
    const [step, setStep] = useState<'CONFIRM' | 'PROCESSING' | 'RESULT' | 'CANCELLING'>('CONFIRM');
    const [result, setResult] = useState<{ status: string; message?: string } | null>(null);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    // Check user registration status
    const userStatus = (event as any).user_registration_status;
    const isApproved = userStatus === 'APPROVED' || userStatus === 'ATTENDED';
    const isPending = userStatus === 'PENDING_ADMIN' || userStatus === 'PENDING_GUARDIAN' || userStatus === 'WAITLIST';
    const isRegistered = isApproved || isPending;
    
    // Check if registration is closed
    const isRegistrationClosed = event.allow_registration && event.registration_close_date 
        ? new Date(event.registration_close_date) < new Date()
        : false;

    const handleRegister = async () => {
        setStep('PROCESSING');
        setError('');
        
        try {
            const res = await api.post(`/events/${event.id}/register/`);
            const reg = res.data;
            
            // Determine user feedback based on status
            if (reg.status === 'APPROVED') {
                setResult({ status: 'APPROVED', message: "You have secured a seat! 🎉" });
            } else if (reg.status === 'WAITLIST') {
                setResult({ status: 'WAITLIST', message: "The event is full. You've been added to the waitlist." });
            } else if (reg.status === 'PENDING_GUARDIAN') {
                setResult({ status: 'PENDING', message: "Registration received! We've sent a request to your guardian for approval." });
            } else if (reg.status === 'PENDING_ADMIN') {
                setResult({ status: 'PENDING', message: "Application received. An admin will review it shortly." });
            }
            
            setStep('RESULT');
            onSuccess(); // Refresh parent data in background
        } catch (err: any) {
            console.error('Registration error:', err);
            const errorMessage = err.response?.data?.error || err.response?.data?.detail || err.message || "Registration failed. Please try again.";
            setError(errorMessage);
            setStep('CONFIRM');
        }
    };

    const handleCancelRegistration = async () => {
        setStep('CANCELLING');
        setError('');
        
        try {
            await api.post(`/events/${event.id}/cancel/`);
            setResult({ status: 'CANCELLED', message: "You have successfully cancelled your registration." });
            setStep('RESULT');
            onSuccess(); // Refresh parent data in background
        } catch (err: any) {
            console.error('Cancellation error:', err);
            const errorMessage = err.response?.data?.error || err.response?.data?.detail || err.message || "Failed to cancel registration. Please try again.";
            setError(errorMessage);
            setStep('CONFIRM');
        }
    };

    // --- Render Result View ---
    if (step === 'RESULT' && result) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-center mb-4">
                        {result.status === 'APPROVED' && <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"><CheckCircle className="w-8 h-8 text-green-600" /></div>}
                        {result.status === 'WAITLIST' && <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center"><Clock className="w-8 h-8 text-orange-600" /></div>}
                        {result.status === 'PENDING' && <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center"><AlertTriangle className="w-8 h-8 text-yellow-600" /></div>}
                        {result.status === 'CANCELLED' && <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center"><X className="w-8 h-8 text-gray-600" /></div>}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {result.status === 'APPROVED' ? 'You are going!' : 
                         result.status === 'WAITLIST' ? 'Waitlist Joined' : 
                         result.status === 'CANCELLED' ? 'Registration Cancelled' :
                         'Request Sent'}
                    </h3>
                    
                    {/* Event Cover Image */}
                    {event.cover_image && (
                        <div className="mb-4 rounded-lg overflow-hidden">
                            <img 
                                src={getMediaUrl(event.cover_image)} 
                                alt={event.title}
                                className="w-full h-48 object-cover"
                            />
                        </div>
                    )}
                    
                    {/* Event Title */}
                    <div className="mb-4">
                        <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
                        {event.description && (
                            <p className="text-sm text-gray-600 line-clamp-3">{event.description.replace(/<[^>]*>/g, '')}</p>
                        )}
                        <Link 
                            href={`/dashboard/youth/events/${event.id}`}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
                        >
                            View full details
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                    
                    <p className="text-gray-600 mb-6">{result.message}</p>
                    
                    <button 
                        onClick={() => { 
                            onClose(); 
                            router.push('/dashboard/youth/events');
                        }}
                        className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800"
                    >
                        View My Events
                    </button>
                </div>
            </div>
        );
    }

    // --- Render Already Approved View ---
    if (isApproved) {
        return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
                <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900">You're Confirmed!</h3>
                        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-4 mb-8">
                        {/* Event Cover Image */}
                        {event.cover_image && (
                            <div className="rounded-lg overflow-hidden">
                                <img 
                                    src={getMediaUrl(event.cover_image)} 
                                    alt={event.title}
                                    className="w-full h-48 object-cover"
                                />
                            </div>
                        )}

                        {/* Event Title & Description */}
                        <div className="border-b border-gray-200 pb-4">
                            <h4 className="text-lg font-bold text-gray-900 mb-2">{event.title}</h4>
                            {event.description && (
                                <div className="text-sm text-gray-600 line-clamp-4" dangerouslySetInnerHTML={{ __html: event.description }} />
                            )}
                            <Link 
                                href={`/dashboard/youth/events/${event.id}`}
                                onClick={onClose}
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
                            >
                                View full details
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>

                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-start gap-3">
                            <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-green-900 mb-1">You are confirmed for this event</p>
                                <p className="text-sm text-green-700">
                                    You have a confirmed seat. We look forward to seeing you there!
                                </p>
                            </div>
                        </div>

                        {/* Event Details */}
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>{new Date(event.start_date).toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{event.location_name}</span>
                            </div>
                        </div>

                        {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={onClose} 
                            className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
                        >
                            Close
                        </button>
                        <button 
                            onClick={handleCancelRegistration} 
                            disabled={step === 'CANCELLING'}
                            className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {step === 'CANCELLING' ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Cancelling...
                                </>
                            ) : (
                                <>
                                    <X className="w-4 h-4" />
                                    Cancel Registration
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Render Pending View ---
    if (isPending) {
        const getPendingMessage = () => {
            if (userStatus === 'PENDING_GUARDIAN') {
                return {
                    title: 'Waiting for Guardian Approval',
                    message: 'Your registration has been submitted and is waiting for your guardian\'s approval. Once approved, you\'ll be confirmed for this event.',
                    icon: AlertTriangle,
                    bgClass: 'bg-yellow-50',
                    borderClass: 'border-yellow-200',
                    iconClass: 'text-yellow-600',
                    titleClass: 'text-yellow-900',
                    textClass: 'text-yellow-700'
                };
            } else if (userStatus === 'PENDING_ADMIN') {
                return {
                    title: 'Waiting for Admin Approval',
                    message: 'Your registration has been submitted and is waiting for admin review. You\'ll be notified once a decision is made.',
                    icon: Clock,
                    bgClass: 'bg-orange-50',
                    borderClass: 'border-orange-200',
                    iconClass: 'text-orange-600',
                    titleClass: 'text-orange-900',
                    textClass: 'text-orange-700'
                };
            } else if (userStatus === 'WAITLIST') {
                return {
                    title: 'You\'re on the Waitlist',
                    message: 'The event is currently full, but you\'ve been added to the waitlist. If a spot becomes available, you\'ll be automatically confirmed.',
                    icon: Clock,
                    bgClass: 'bg-orange-50',
                    borderClass: 'border-orange-200',
                    iconClass: 'text-orange-600',
                    titleClass: 'text-orange-900',
                    textClass: 'text-orange-700'
                };
            }
            return {
                title: 'Registration Pending',
                message: 'Your registration is being processed.',
                icon: Clock,
                bgClass: 'bg-orange-50',
                borderClass: 'border-orange-200',
                iconClass: 'text-orange-600',
                titleClass: 'text-orange-900',
                textClass: 'text-orange-700'
            };
        };

        const pendingInfo = getPendingMessage();
        const IconComponent = pendingInfo.icon;

        return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
                <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Registration Status</h3>
                        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-4 mb-8">
                        {/* Event Cover Image */}
                        {event.cover_image && (
                            <div className="rounded-lg overflow-hidden">
                                <img 
                                    src={getMediaUrl(event.cover_image)} 
                                    alt={event.title}
                                    className="w-full h-48 object-cover"
                                />
                            </div>
                        )}

                        {/* Event Title & Description */}
                        <div className="border-b border-gray-200 pb-4">
                            <h4 className="text-lg font-bold text-gray-900 mb-2">{event.title}</h4>
                            {event.description && (
                                <div className="text-sm text-gray-600 line-clamp-4" dangerouslySetInnerHTML={{ __html: event.description }} />
                            )}
                            <Link 
                                href={`/dashboard/youth/events/${event.id}`}
                                onClick={onClose}
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
                            >
                                View full details
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>

                        <div className={`${pendingInfo.bgClass} border ${pendingInfo.borderClass} p-4 rounded-lg flex items-start gap-3`}>
                            <IconComponent className={`w-6 h-6 ${pendingInfo.iconClass} shrink-0 mt-0.5`} />
                            <div>
                                <p className={`font-bold ${pendingInfo.titleClass} mb-1`}>{pendingInfo.title}</p>
                                <p className={`text-sm ${pendingInfo.textClass}`}>
                                    {pendingInfo.message}
                                </p>
                            </div>
                        </div>

                        {/* Event Details */}
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>{new Date(event.start_date).toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{event.location_name}</span>
                            </div>
                        </div>

                        {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={onClose} 
                            className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
                        >
                            Close
                        </button>
                        <button 
                            onClick={handleCancelRegistration} 
                            disabled={step === 'CANCELLING'}
                            className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {step === 'CANCELLING' ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Cancelling...
                                </>
                            ) : (
                                <>
                                    <X className="w-4 h-4" />
                                    Cancel Registration
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Render Confirmation View ---
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Confirm Registration</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-4 h-4" /></button>
                </div>

                <div className="space-y-4 mb-8">
                    {/* Event Cover Image */}
                    {event.cover_image && (
                        <div className="rounded-lg overflow-hidden">
                            <img 
                                src={getMediaUrl(event.cover_image)} 
                                alt={event.title}
                                className="w-full h-48 object-cover"
                            />
                        </div>
                    )}

                    {/* Event Title & Description */}
                    <div className="border-b border-gray-200 pb-4">
                        <h4 className="text-lg font-bold text-gray-900 mb-2">{event.title}</h4>
                        {event.description && (
                            <div className="text-sm text-gray-600 line-clamp-4" dangerouslySetInnerHTML={{ __html: event.description }} />
                        )}
                        <Link 
                            href={`/dashboard/youth/events/${event.id}`}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
                        >
                            View full details
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>

                    <p className="text-gray-600 text-sm">
                        You are about to register for this event.
                    </p>

                    {/* Registration Closed Warning */}
                    {isRegistrationClosed && (
                        <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex gap-3 text-sm text-red-800">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <div>
                                <span className="font-bold block">Registration is closed.</span>
                                The registration deadline has passed.
                            </div>
                        </div>
                    )}

                    {/* Warnings / Info */}
                    {event.requires_guardian_approval && (
                        <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-lg flex gap-3 text-sm text-yellow-800">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <div>
                                <span className="font-bold block">Guardian Approval Required</span>
                                Your registration will be paused until your guardian approves it.
                            </div>
                        </div>
                    )}
                    
                    {event.cost && parseFloat(event.cost) > 0 && (
                        <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex justify-between items-center text-blue-900">
                            <span className="font-bold">Cost</span>
                            <span className="font-bold text-lg">{event.cost} SEK</span>
                        </div>
                    )}

                    {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">
                        Cancel
                    </button>
                    <button 
                        onClick={handleRegister} 
                        disabled={step === 'PROCESSING' || isRegistrationClosed}
                        className="flex-1 py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
                    >
                        {step === 'PROCESSING' ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}

