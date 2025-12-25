'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import api from '@/lib/api';
import { Event } from '@/types/event';
import { CheckCircle, AlertTriangle, Clock, X, Calendar, ExternalLink, MapPin, Send } from 'lucide-react';
import { getMediaUrl } from '@/app/utils';


interface ModalProps {
    event: Event;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    darkMode?: boolean;
}

// Helper function to strip inline color styles from HTML (for pasted Word content)
function stripInlineColors(html: string): string {
    if (!html) return '';
    return html
        .replace(/color\s*:\s*[^;"}]+;?/gi, '')
        .replace(/background-color\s*:\s*[^;"}]+;?/gi, '')
        .replace(/background\s*:\s*[^;"}]+;?/gi, '')
        .replace(/style\s*=\s*""/gi, '');
}

export default function EventRegistrationModal({ event, isOpen, onClose, onSuccess, darkMode = false }: ModalProps) {
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
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
                <div className={`${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/20'} rounded-t-3xl sm:rounded-2xl shadow-2xl border p-5 w-full max-w-md text-center animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200`}>
                    <div className="flex justify-center mb-3">
                        {result.status === 'APPROVED' && <div className="w-16 h-16 bg-[var(--brand-green)] rounded-xl flex items-center justify-center"><CheckCircle className="w-8 h-8 text-[var(--dark-900)]" /></div>}
                        {result.status === 'WAITLIST' && <div className="w-16 h-16 bg-[var(--brand-primary)] rounded-xl flex items-center justify-center"><Clock className="w-8 h-8 text-[var(--dark-900)]" /></div>}
                        {result.status === 'PENDING' && (
                            <div className="w-16 h-16 bg-[var(--brand-green)] rounded-xl flex items-center justify-center overflow-hidden">
                                <Send className="w-8 h-8 text-[var(--dark-900)] animate-[sendSlide_1.2s_ease-in-out_infinite]" />
                            </div>
                        )}
                        {result.status === 'CANCELLED' && <div className="w-16 h-16 bg-[var(--dark-600)] rounded-xl flex items-center justify-center"><X className="w-8 h-8 text-[var(--brand-light)]" /></div>}
                    </div>
                    
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} mb-2 font-heading`}>
                        {result.status === 'APPROVED' ? 'You are going!' : 
                         result.status === 'WAITLIST' ? 'Waitlist Joined' : 
                         result.status === 'CANCELLED' ? 'Cancelled' :
                         'Request Sent'}
                    </h3>
                    
                    <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'} mb-4`}>{result.message}</p>
                    
                    {/* Event Title - Compact */}
                    <div className={`${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' : 'bg-gray-50 border-gray-100'} border rounded-xl p-3 mb-4 text-left`}>
                        <h4 className={`text-sm font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} font-heading line-clamp-1`}>{event.title}</h4>
                        <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'} flex items-center gap-2 mt-1`}>
                            <Calendar className="w-3 h-3" />
                            {new Date(event.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <Link 
                            href={`/dashboard/youth/events/${event.id}`}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:text-[var(--brand-purple)] font-bold mt-2 transition-colors"
                        >
                            View details
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                    
                    <button 
                        onClick={onClose}
                        className="w-full bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold py-2.5 text-sm rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    // --- Render Already Approved View ---
    if (isApproved) {
        return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
                <div className={`${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/20'} rounded-t-3xl sm:rounded-2xl shadow-2xl border p-5 w-full max-w-md animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-xl font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} font-heading`}>You're Confirmed!</h3>
                        <button onClick={onClose} className={`p-1.5 ${darkMode ? 'bg-[var(--dark-700)] hover:bg-[var(--dark-600)] text-[var(--brand-light)]' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors`}><X className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-3 mb-5">
                        {/* Event Title & Date - Compact */}
                        <div className={`${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' : 'bg-gray-50 border-gray-100'} border rounded-xl p-3`}>
                            <h4 className={`text-base font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} mb-1 font-heading line-clamp-2`}>{event.title}</h4>
                            <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'} flex items-center gap-2`}>
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(event.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {event.location_name && (
                                <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'} flex items-center gap-2 mt-1`}>
                                    <MapPin className="w-3.5 h-3.5" />
                                    {event.location_name}
                                </div>
                            )}
                            <Link 
                                href={`/dashboard/youth/events/${event.id}`}
                                onClick={onClose}
                                className="inline-flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:text-[var(--brand-purple)] font-bold mt-2 transition-colors"
                            >
                                View full details
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>

                        <div className={`${darkMode ? 'bg-[var(--brand-third)]/10 border-[var(--brand-third)]/30' : 'bg-emerald-50 border-emerald-200'} border p-3 rounded-xl flex items-center gap-3`}>
                            <CheckCircle className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-third)]' : 'text-emerald-600'} shrink-0`} />
                            <p className={`text-sm font-bold ${darkMode ? 'text-[var(--brand-third)]' : 'text-emerald-700'}`}>You have a confirmed seat!</p>
                        </div>

                        {error && <div className={`text-xs p-2 rounded ${darkMode ? 'text-[var(--brand-red)] bg-[var(--brand-red)]/10' : 'text-red-600 bg-red-50'}`}>{error}</div>}
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={onClose} 
                            className={`flex-1 py-2.5 text-sm font-bold ${darkMode ? 'text-[var(--brand-light)]/70 bg-[var(--dark-700)] hover:bg-[var(--dark-600)]' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-xl transition-colors`}
                        >
                            Close
                        </button>
                        <button 
                            onClick={handleCancelRegistration} 
                            disabled={step === 'CANCELLING'}
                            className="flex-1 py-2.5 text-sm font-bold text-white bg-[var(--brand-red)] rounded-xl hover:bg-[var(--brand-red)]/90 disabled:opacity-50 flex justify-center items-center gap-2 transition-all"
                        >
                            {step === 'CANCELLING' ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                'Cancel'
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
            const baseColors = darkMode ? {
                bgClass: 'bg-[var(--brand-third)]/10',
                borderClass: 'border-[var(--brand-third)]/30',
                iconClass: 'text-[var(--brand-third)]',
                titleClass: 'text-[var(--brand-third)]',
                textClass: 'text-[var(--brand-light)]/70'
            } : {
                bgClass: 'bg-[#FF5485]/10',
                borderClass: 'border-[#FF5485]/30',
                iconClass: 'text-[#FF5485]',
                titleClass: 'text-[#FF5485]',
                textClass: 'text-gray-700'
            };

            if (userStatus === 'PENDING_GUARDIAN') {
                return { ...baseColors, title: 'Waiting for Guardian Approval', message: 'Your registration has been submitted and is waiting for your guardian\'s approval. Once approved, you\'ll be confirmed for this event.', icon: AlertTriangle };
            } else if (userStatus === 'PENDING_ADMIN') {
                return { ...baseColors, title: 'Waiting for Admin Approval', message: 'Your registration has been submitted and is waiting for admin review. You\'ll be notified once a decision is made.', icon: Clock };
            } else if (userStatus === 'WAITLIST') {
                return { ...baseColors, title: 'You\'re on the Waitlist', message: 'The event is currently full, but you\'ve been added to the waitlist. If a spot becomes available, you\'ll be automatically confirmed.', icon: Clock };
            }
            return { ...baseColors, title: 'Registration Pending', message: 'Your registration is being processed.', icon: Clock };
        };

        const pendingInfo = getPendingMessage();
        const IconComponent = pendingInfo.icon;

        return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
                <div className={`${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/20'} rounded-t-3xl sm:rounded-2xl shadow-2xl border p-5 w-full max-w-md animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-xl font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} font-heading`}>Registration Status</h3>
                        <button onClick={onClose} className={`p-1.5 ${darkMode ? 'bg-[var(--dark-700)] hover:bg-[var(--dark-600)] text-[var(--brand-light)]' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors`}><X className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-3 mb-5">
                        {/* Event Title & Date - Compact */}
                        <div className={`${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' : 'bg-gray-50 border-gray-100'} border rounded-xl p-3`}>
                            <h4 className={`text-base font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} mb-1 font-heading line-clamp-2`}>{event.title}</h4>
                            <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'} flex items-center gap-2`}>
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(event.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {event.location_name && (
                                <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'} flex items-center gap-2 mt-1`}>
                                    <MapPin className="w-3.5 h-3.5" />
                                    {event.location_name}
                                </div>
                            )}
                            <Link 
                                href={`/dashboard/youth/events/${event.id}`}
                                onClick={onClose}
                                className="inline-flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:text-[var(--brand-purple)] font-bold mt-2 transition-colors"
                            >
                                View full details
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>

                        <div className={`${pendingInfo.bgClass} border ${pendingInfo.borderClass} p-3 rounded-xl flex items-start gap-3`}>
                            <IconComponent className={`w-5 h-5 ${pendingInfo.iconClass} shrink-0 mt-0.5`} />
                            <div>
                                <p className={`text-sm font-bold ${pendingInfo.titleClass}`}>{pendingInfo.title}</p>
                                <p className={`text-xs ${pendingInfo.textClass} mt-0.5`}>{pendingInfo.message}</p>
                            </div>
                        </div>

                        {error && <div className={`text-xs p-2 rounded ${darkMode ? 'text-[var(--brand-red)] bg-[var(--brand-red)]/10' : 'text-red-600 bg-red-50'}`}>{error}</div>}
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={onClose} 
                            className={`flex-1 py-2.5 text-sm font-bold ${darkMode ? 'text-[var(--brand-light)]/70 bg-[var(--dark-700)] hover:bg-[var(--dark-600)]' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-xl transition-colors`}
                        >
                            Close
                        </button>
                        <button 
                            onClick={handleCancelRegistration} 
                            disabled={step === 'CANCELLING'}
                            className="flex-1 py-2.5 text-sm font-bold text-white bg-[var(--brand-red)] rounded-xl hover:bg-[var(--brand-red)]/90 disabled:opacity-50 flex justify-center items-center gap-2 transition-all"
                        >
                            {step === 'CANCELLING' ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                'Cancel'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Render Confirmation View ---
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
            <div className={`${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/20'} rounded-t-3xl sm:rounded-2xl shadow-2xl border p-5 w-full max-w-md animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} font-heading`}>Confirm Registration</h3>
                    <button onClick={onClose} className={`p-1.5 ${darkMode ? 'bg-[var(--dark-700)] hover:bg-[var(--dark-600)] text-[var(--brand-light)]' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors`}><X className="w-4 h-4" /></button>
                </div>

                <div className="space-y-3 mb-5">
                    {/* Event Title & Date - Compact */}
                    <div className={`${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' : 'bg-gray-50 border-gray-100'} border rounded-xl p-3`}>
                        <h4 className={`text-base font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} mb-1 font-heading line-clamp-2`}>{event.title}</h4>
                        <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'} flex items-center gap-2`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(event.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {event.location_name && (
                            <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'} flex items-center gap-2 mt-1`}>
                                <MapPin className="w-3.5 h-3.5" />
                                {event.location_name}
                            </div>
                        )}
                        <Link 
                            href={`/dashboard/youth/events/${event.id}`}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:text-[var(--brand-purple)] font-bold mt-2 transition-colors"
                        >
                            View full details
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>

                    {/* Registration Closed Warning */}
                    {isRegistrationClosed && (
                        <div className="bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 p-2.5 rounded-lg flex gap-2 text-xs text-[var(--brand-red)]">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span className="font-bold">Registration is closed.</span>
                        </div>
                    )}

                    {/* Warnings / Info */}
                    {event.requires_guardian_approval && (
                        <div className="bg-[var(--brand-third)]/10 border border-[var(--brand-third)]/30 p-2.5 rounded-lg flex gap-2 text-xs text-[var(--brand-third)]">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span className="font-bold">Guardian approval required</span>
                        </div>
                    )}
                    
                    {event.cost && parseFloat(event.cost) > 0 && (
                        <div className="bg-[var(--brand-sky)]/10 border border-[var(--brand-sky)]/30 p-2.5 rounded-lg flex justify-between items-center text-[var(--brand-sky)]">
                            <span className="font-bold text-xs">Cost</span>
                            <span className="font-bold">{event.cost} SEK</span>
                        </div>
                    )}

                    {error && <div className="text-[var(--brand-red)] text-xs bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 p-2.5 rounded-lg">{error}</div>}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className={`flex-1 py-2.5 px-4 font-bold text-sm ${darkMode ? 'text-[var(--brand-light)]/70 bg-[var(--dark-700)] hover:bg-[var(--dark-600)]' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-xl transition-colors`}>
                        Cancel
                    </button>
                    <button 
                        onClick={handleRegister} 
                        disabled={step === 'PROCESSING' || isRegistrationClosed}
                        className="flex-1 py-2.5 px-4 font-bold text-sm text-[var(--dark-900)] bg-[var(--brand-primary)] rounded-xl hover:bg-[var(--brand-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
                    >
                        {step === 'PROCESSING' ? (
                            <span className="w-4 h-4 border-2 border-[var(--dark-900)]/30 border-t-[var(--dark-900)] rounded-full animate-spin" />
                        ) : (
                            <span>Register</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

