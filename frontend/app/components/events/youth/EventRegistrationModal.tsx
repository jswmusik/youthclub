'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { format, type Locale } from 'date-fns';
import { enUS, sv, da, nb, fi } from 'date-fns/locale';

import api from '@/lib/api';
import { sanitizeAndStripColors } from '@/lib/sanitize';
import { Event, EventCustomField } from '@/types/event';
import { CheckCircle, AlertTriangle, Clock, X, Calendar, ExternalLink, MapPin, Send, FileText } from 'lucide-react';
import { getMediaUrl } from '@/app/utils';
import { useToast } from '../../../../hooks/useToast';

interface ModalProps {
    event: Event;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    darkMode?: boolean;
}

export default function EventRegistrationModal({ event, isOpen, onClose, onSuccess, darkMode = false }: ModalProps) {
    const router = useRouter();
    const t = useTranslations('events');
    const locale = useLocale();
    const localeMap: Record<string, Locale> = {
        en: enUS,
        sv: sv,
        da: da,
        nb: nb,
        fi: fi,
    };
    const dateLocale = localeMap[locale] || enUS;
    const [step, setStep] = useState<'CONFIRM' | 'CUSTOM_FIELDS' | 'PROCESSING' | 'RESULT' | 'CANCELLING'>('CONFIRM');
    const [result, setResult] = useState<{ status: string; message?: string } | null>(null);
    const [error, setError] = useState('');
    const { success, error: showError, info, warning } = useToast();
    
    // Custom fields state
    const [customFields, setCustomFields] = useState<EventCustomField[]>([]);
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
    const [loadingFields, setLoadingFields] = useState(false);
    
    // Fetch custom fields when modal opens
    useEffect(() => {
        if (isOpen && event.id) {
            setLoadingFields(true);
            api.get(`/events/${event.id}/custom_fields/`)
                .then(res => {
                    const fields = Array.isArray(res.data) ? res.data : [];
                    setCustomFields(fields);
                    // Initialize values
                    const initialValues: Record<string, any> = {};
                    fields.forEach((ecf: EventCustomField) => {
                        const fieldType = ecf.field_detail?.field_type;
                        if (fieldType === 'BOOLEAN') {
                            initialValues[ecf.field_detail.id] = false;
                        } else if (fieldType === 'MULTI_SELECT') {
                            initialValues[ecf.field_detail.id] = [];
                        } else {
                            initialValues[ecf.field_detail.id] = '';
                        }
                    });
                    setCustomFieldValues(initialValues);
                })
                .catch(err => {
                    console.error('Failed to fetch custom fields:', err);
                    setCustomFields([]);
                })
                .finally(() => {
                    setLoadingFields(false);
                });
        }
    }, [isOpen, event.id]);

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

    const handleProceedToRegister = () => {
        // If there are custom fields, show them first
        if (customFields.length > 0) {
            setStep('CUSTOM_FIELDS');
        } else {
            handleRegister();
        }
    };
    
    const validateCustomFields = (): boolean => {
        for (const ecf of customFields) {
            if (ecf.is_required) {
                const value = customFieldValues[ecf.field_detail.id];
                const fieldType = ecf.field_detail.field_type;
                
                if (fieldType === 'MULTI_SELECT') {
                    if (!value || !Array.isArray(value) || value.length === 0) {
                        setError(t('fillRequiredField', { fieldName: ecf.field_detail.name }));
                        return false;
                    }
                } else if (fieldType === 'BOOLEAN') {
                    // Boolean fields are always valid (false is a valid value)
                } else {
                    if (!value || (typeof value === 'string' && value.trim() === '')) {
                        setError(t('fillRequiredField', { fieldName: ecf.field_detail.name }));
                        return false;
                    }
                }
            }
        }
        return true;
    };

    const handleRegister = async () => {
        // Validate custom fields if any
        if (customFields.length > 0 && !validateCustomFields()) {
            return;
        }
        
        setStep('PROCESSING');
        setError('');
        
        try {
            const payload: any = {};
            
            // Include custom field values if any
            if (customFields.length > 0) {
                payload.custom_field_values = customFieldValues;
            }
            
            const res = await api.post(`/events/${event.id}/register/`, payload);
            const reg = res.data;
            
            // Determine user feedback based on status
            if (reg.status === 'APPROVED') {
                setResult({ status: 'APPROVED', message: t('youHaveSecuredSeat') });
                success(t('youHaveSecuredSeat'));
            } else if (reg.status === 'WAITLIST') {
                setResult({ status: 'WAITLIST', message: t('eventFullAddedToWaitlist') });
                info(t('eventFullAddedToWaitlist'));
            } else if (reg.status === 'PENDING_GUARDIAN') {
                setResult({ status: 'PENDING', message: t('registrationReceivedGuardian') });
                success(t('registrationReceivedGuardian'));
            } else if (reg.status === 'PENDING_ADMIN') {
                setResult({ status: 'PENDING', message: t('applicationReceivedAdmin') });
                success(t('applicationReceivedAdmin'));
            }
            
            setStep('RESULT');
            onSuccess(); // Refresh parent data in background
        } catch (err: any) {
            console.error('Registration error:', err);
            const errorMessage = err.response?.data?.error || err.response?.data?.detail || err.message || t('registrationFailed');
            setError(errorMessage);
            showError(errorMessage);
            setStep(customFields.length > 0 ? 'CUSTOM_FIELDS' : 'CONFIRM');
        }
    };
    
    const renderCustomFieldInput = (ecf: EventCustomField) => {
        const field = ecf.field_detail;
        const value = customFieldValues[field.id];
        const inputClasses = `w-full px-3 py-2 rounded-lg ${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]' : 'bg-white border-gray-300 text-gray-900'} border focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent text-sm`;
        
        switch (field.field_type) {
            case 'TEXT':
                return (
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        placeholder={field.help_text || ''}
                        className={inputClasses}
                    />
                );
            
            case 'SINGLE_SELECT':
                return (
                    <select
                        value={value || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className={inputClasses}
                    >
                        <option value="">{field.help_text || t('selectOption')}</option>
                        {field.options?.map((opt: string, idx: number) => (
                            <option key={idx} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            
            case 'MULTI_SELECT':
                return (
                    <div className="space-y-2">
                        {field.options?.map((opt: string, idx: number) => (
                            <label key={idx} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={Array.isArray(value) && value.includes(opt)}
                                    onChange={(e) => {
                                        setCustomFieldValues(prev => {
                                            const currentValues = Array.isArray(prev[field.id]) ? prev[field.id] : [];
                                            if (e.target.checked) {
                                                return { ...prev, [field.id]: [...currentValues, opt] };
                                            } else {
                                                return { ...prev, [field.id]: currentValues.filter((v: string) => v !== opt) };
                                            }
                                        });
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                                />
                                <span className={`text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-700'}`}>{opt}</span>
                            </label>
                        ))}
                    </div>
                );
            
            case 'BOOLEAN':
                return (
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={value || false}
                            onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.checked }))}
                            className="w-4 h-4 rounded border-gray-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                        />
                        <span className={`text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-700'}`}>
                            {field.help_text || 'Yes'}
                        </span>
                    </label>
                );
            
            default:
                return null;
        }
    };

    const handleCancelRegistration = async () => {
        setStep('CANCELLING');
        setError('');
        
        try {
            await api.post(`/events/${event.id}/cancel/`);
            setResult({ status: 'CANCELLED', message: t('successfullyCancelled') });
            success(t('successfullyCancelled'));
            setStep('RESULT');
            onSuccess(); // Refresh parent data in background
        } catch (err: any) {
            console.error('Cancellation error:', err);
            const errorMessage = err.response?.data?.error || err.response?.data?.detail || err.message || t('failedToCancel');
            setError(errorMessage);
            showError(errorMessage);
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
                        {result.status === 'APPROVED' ? t('youAreGoing') : 
                         result.status === 'WAITLIST' ? t('waitlistJoined') : 
                         result.status === 'CANCELLED' ? t('cancelled') :
                         t('requestSent')}
                    </h3>
                    
                    <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'} mb-4`}>{result.message}</p>
                    
                    {/* Event Title - Compact */}
                    <div className={`${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' : 'bg-gray-50 border-gray-100'} border rounded-xl p-3 mb-4 text-left`}>
                        <h4 className={`text-sm font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} font-heading line-clamp-1`}>{event.title}</h4>
                        <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'} flex items-center gap-2 mt-1`}>
                            <Calendar className="w-3 h-3" />
                            {format(new Date(event.start_date), 'EEE, MMM d', { locale: dateLocale })}
                        </div>
                        <Link 
                            href={`/dashboard/youth/events/${event.id}`}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:text-[var(--brand-purple)] font-bold mt-2 transition-colors"
                        >
                            {t('viewDetails')}
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                    
                    <button 
                        onClick={onClose}
                        className="w-full bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold py-2.5 text-sm rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all"
                    >
                        {t('close')}
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
                        <h3 className={`text-xl font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} font-heading`}>{t('youreConfirmed')}</h3>
                        <button onClick={onClose} className={`p-1.5 ${darkMode ? 'bg-[var(--dark-700)] hover:bg-[var(--dark-600)] text-[var(--brand-light)]' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors`}><X className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-3 mb-5">
                        {/* Event Title & Date - Compact */}
                        <div className={`${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' : 'bg-gray-50 border-gray-100'} border rounded-xl p-3`}>
                            <h4 className={`text-base font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} mb-1 font-heading line-clamp-2`}>{event.title}</h4>
                            <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'} flex items-center gap-2`}>
                                <Calendar className="w-3.5 h-3.5" />
                                {format(new Date(event.start_date), 'EEE, MMM d, HH:mm', { locale: dateLocale })}
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
                                {t('viewFullDetails')}
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>

                        <div className={`${darkMode ? 'bg-[var(--brand-third)]/10 border-[var(--brand-third)]/30' : 'bg-emerald-50 border-emerald-200'} border p-3 rounded-xl flex items-center gap-3`}>
                            <CheckCircle className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-third)]' : 'text-emerald-600'} shrink-0`} />
                            <p className={`text-sm font-bold ${darkMode ? 'text-[var(--brand-third)]' : 'text-emerald-700'}`}>{t('youHaveConfirmedSeat')}</p>
                        </div>

                        {error && <div className={`text-xs p-2 rounded ${darkMode ? 'text-[var(--brand-red)] bg-[var(--brand-red)]/10' : 'text-red-600 bg-red-50'}`}>{error}</div>}
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={onClose} 
                            className={`flex-1 py-2.5 text-sm font-bold ${darkMode ? 'text-[var(--brand-light)]/70 bg-[var(--dark-700)] hover:bg-[var(--dark-600)]' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-xl transition-colors`}
                        >
                            {t('close')}
                        </button>
                        <button 
                            onClick={handleCancelRegistration} 
                            disabled={step === 'CANCELLING'}
                            className="flex-1 py-2.5 text-sm font-bold text-white bg-[var(--brand-red)] rounded-xl hover:bg-[var(--brand-red)]/90 disabled:opacity-50 flex justify-center items-center gap-2 transition-all"
                        >
                            {step === 'CANCELLING' ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                t('cancel')
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
                return { ...baseColors, title: t('waitingForGuardianApproval'), message: t('waitingForGuardianMessage'), icon: AlertTriangle };
            } else if (userStatus === 'PENDING_ADMIN') {
                return { ...baseColors, title: t('waitingForAdminApproval'), message: t('waitingForAdminMessage'), icon: Clock };
            } else if (userStatus === 'WAITLIST') {
                return { ...baseColors, title: t('youreOnWaitlist'), message: t('waitlistMessage'), icon: Clock };
            }
            return { ...baseColors, title: t('registrationPending'), message: t('registrationBeingProcessed'), icon: Clock };
        };

        const pendingInfo = getPendingMessage();
        const IconComponent = pendingInfo.icon;

        return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
                <div className={`${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/20'} rounded-t-3xl sm:rounded-2xl shadow-2xl border p-5 w-full max-w-md animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-xl font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} font-heading`}>{t('registrationStatus')}</h3>
                        <button onClick={onClose} className={`p-1.5 ${darkMode ? 'bg-[var(--dark-700)] hover:bg-[var(--dark-600)] text-[var(--brand-light)]' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors`}><X className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-3 mb-5">
                        {/* Event Title & Date - Compact */}
                        <div className={`${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' : 'bg-gray-50 border-gray-100'} border rounded-xl p-3`}>
                            <h4 className={`text-base font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} mb-1 font-heading line-clamp-2`}>{event.title}</h4>
                            <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'} flex items-center gap-2`}>
                                <Calendar className="w-3.5 h-3.5" />
                                {format(new Date(event.start_date), 'EEE, MMM d, HH:mm', { locale: dateLocale })}
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
                                {t('viewFullDetails')}
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
                            {t('close')}
                        </button>
                        <button 
                            onClick={handleCancelRegistration} 
                            disabled={step === 'CANCELLING'}
                            className="flex-1 py-2.5 text-sm font-bold text-white bg-[var(--brand-red)] rounded-xl hover:bg-[var(--brand-red)]/90 disabled:opacity-50 flex justify-center items-center gap-2 transition-all"
                        >
                            {step === 'CANCELLING' ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                t('cancel')
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Render Custom Fields Step ---
    if (step === 'CUSTOM_FIELDS') {
        return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
                <div className={`${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/20'} rounded-t-3xl sm:rounded-2xl shadow-2xl border p-5 w-full max-w-md max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <FileText className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`} />
                            <h3 className={`text-xl font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} font-heading`}>
                                {t('registrationDetails')}
                            </h3>
                        </div>
                        <button onClick={onClose} className={`p-1.5 ${darkMode ? 'bg-[var(--dark-700)] hover:bg-[var(--dark-600)] text-[var(--brand-light)]' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors`}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-4 mb-5">
                        {/* Event Info - Compact */}
                        <div className={`${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' : 'bg-gray-50 border-gray-100'} border rounded-xl p-3`}>
                            <h4 className={`text-sm font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} font-heading line-clamp-1`}>{event.title}</h4>
                            <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'} flex items-center gap-2 mt-1`}>
                                <Calendar className="w-3 h-3" />
                                {format(new Date(event.start_date), 'EEE, MMM d, HH:mm', { locale: dateLocale })}
                            </div>
                        </div>

                        {/* Custom Fields Form */}
                        <div className="space-y-4">
                            {customFields.map((ecf) => (
                                <div key={ecf.id} className="space-y-1.5">
                                    <label className={`block text-sm font-medium ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-700'}`}>
                                        {ecf.field_detail.name}
                                        {ecf.is_required && <span className="text-[var(--brand-red)] ml-1">*</span>}
                                    </label>
                                    {ecf.field_detail.help_text && ecf.field_detail.field_type !== 'BOOLEAN' && (
                                        <p className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                                            {ecf.field_detail.help_text}
                                        </p>
                                    )}
                                    {renderCustomFieldInput(ecf)}
                                </div>
                            ))}
                        </div>

                        {error && (
                            <div className="text-[var(--brand-red)] text-xs bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 p-2.5 rounded-lg">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => { setStep('CONFIRM'); setError(''); }} 
                            className={`flex-1 py-2.5 px-4 font-bold text-sm ${darkMode ? 'text-[var(--brand-light)]/70 bg-[var(--dark-700)] hover:bg-[var(--dark-600)]' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-xl transition-colors`}
                        >
                            {t('back')}
                        </button>
                        <button 
                            onClick={handleRegister} 
                            disabled={step === 'PROCESSING'}
                            className="flex-1 py-2.5 px-4 font-bold text-sm text-[var(--dark-900)] bg-[var(--brand-primary)] rounded-xl hover:bg-[var(--brand-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
                        >
                            {step === 'PROCESSING' ? (
                                <span className="w-4 h-4 border-2 border-[var(--dark-900)]/30 border-t-[var(--dark-900)] rounded-full animate-spin" />
                            ) : (
                                <span>{t('confirmAndRegister')}</span>
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
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} font-heading`}>{t('confirmRegistration')}</h3>
                    <button onClick={onClose} className={`p-1.5 ${darkMode ? 'bg-[var(--dark-700)] hover:bg-[var(--dark-600)] text-[var(--brand-light)]' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors`}><X className="w-4 h-4" /></button>
                </div>

                <div className="space-y-3 mb-5">
                    {/* Event Title & Date - Compact */}
                    <div className={`${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' : 'bg-gray-50 border-gray-100'} border rounded-xl p-3`}>
                        <h4 className={`text-base font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'} mb-1 font-heading line-clamp-2`}>{event.title}</h4>
                        <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'} flex items-center gap-2`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(event.start_date), 'EEE, MMM d, HH:mm', { locale: dateLocale })}
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
                            {t('viewFullDetails')}
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>

                    {/* Custom Fields Indicator */}
                    {customFields.length > 0 && !loadingFields && (
                        <div className={`${darkMode ? 'bg-[var(--brand-purple)]/10 border-[var(--brand-purple)]/30' : 'bg-purple-50 border-purple-200'} border p-2.5 rounded-lg flex gap-2 text-xs`}>
                            <FileText className={`w-4 h-4 shrink-0 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-purple-600'}`} />
                            <span className={`${darkMode ? 'text-[var(--brand-purple)]' : 'text-purple-700'} font-medium`}>
                                {customFields.length} {customFields.length > 1 ? t('additionalQuestions') : t('additionalQuestion')}
                            </span>
                        </div>
                    )}

                    {/* Registration Closed Warning */}
                    {isRegistrationClosed && (
                        <div className="bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 p-2.5 rounded-lg flex gap-2 text-xs text-[var(--brand-red)]">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span className="font-bold">{t('registrationClosed')}</span>
                        </div>
                    )}

                    {/* Warnings / Info */}
                    {event.requires_guardian_approval && (
                        <div className="bg-[var(--brand-third)]/10 border border-[var(--brand-third)]/30 p-2.5 rounded-lg flex gap-2 text-xs text-[var(--brand-third)]">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span className="font-bold">{t('guardianApprovalRequired')}</span>
                        </div>
                    )}
                    
                    {event.cost && parseFloat(event.cost) > 0 && (
                        <div className="bg-[var(--brand-sky)]/10 border border-[var(--brand-sky)]/30 p-2.5 rounded-lg flex justify-between items-center text-[var(--brand-sky)]">
                            <span className="font-bold text-xs">{t('cost')}</span>
                            <span className="font-bold">{event.cost} SEK</span>
                        </div>
                    )}

                    {error && <div className="text-[var(--brand-red)] text-xs bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 p-2.5 rounded-lg">{error}</div>}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className={`flex-1 py-2.5 px-4 font-bold text-sm ${darkMode ? 'text-[var(--brand-light)]/70 bg-[var(--dark-700)] hover:bg-[var(--dark-600)]' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-xl transition-colors`}>
                        {t('cancel')}
                    </button>
                    <button 
                        onClick={handleProceedToRegister} 
                        disabled={step === 'PROCESSING' || isRegistrationClosed || loadingFields}
                        className="flex-1 py-2.5 px-4 font-bold text-sm text-[var(--dark-900)] bg-[var(--brand-primary)] rounded-xl hover:bg-[var(--brand-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
                    >
                        {step === 'PROCESSING' || loadingFields ? (
                            <span className="w-4 h-4 border-2 border-[var(--dark-900)]/30 border-t-[var(--dark-900)] rounded-full animate-spin" />
                        ) : customFields.length > 0 ? (
                            <span>{t('continue')}</span>
                        ) : (
                            <span>{t('register')}</span>
                        )}
                    </button>
                </div>
            </div>
            
            {/* Toast notification */}
        </div>
    );
}

