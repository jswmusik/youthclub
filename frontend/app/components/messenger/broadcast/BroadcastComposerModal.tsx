'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Paperclip, Send, Loader2, ArrowLeft, Users } from 'lucide-react';
import { messengerApi } from '../../../../lib/messenger-api';
import api from '../../../../lib/api';
import { BroadcastFilters } from '../../../../types/messenger';
import Toast from '../../../components/Toast';

interface BroadcastComposerModalProps {
    onClose: () => void;
    onSuccess: () => void;
    onError?: (errorMsg: string) => void;
    initialScope?: 'GLOBAL' | 'MUNICIPALITY' | 'CLUB';
    initialTargetId?: number;
    darkMode?: boolean;
}

export default function BroadcastComposerModal({ 
    onClose, 
    onSuccess, 
    onError,
    initialScope = 'CLUB',
    initialTargetId,
    darkMode = false
}: BroadcastComposerModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [estimating, setEstimating] = useState(false);
    const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    
    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });
    
    // Data Options
    const [interestsOptions, setInterestsOptions] = useState<{id: number, name: string}[]>([]);
    const [groupOptions, setGroupOptions] = useState<{id: number, name: string}[]>([]);

    // --- Form State ---
    const [targetLevel, setTargetLevel] = useState(initialScope);
    const [recipientType, setRecipientType] = useState<'YOUTH'|'GUARDIAN'|'BOTH'|'ADMINS'>('YOUTH');
    
    // Filters
    const [selectedGender, setSelectedGender] = useState<string>('');
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [selectedInterests, setSelectedInterests] = useState<number[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
    const [ageMin, setAgeMin] = useState<string>('');
    const [ageMax, setAgeMax] = useState<string>('');

    // Content
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch Options on mount
    useEffect(() => {
        // Fetch Interests
        api.get('/interests/').then(res => {
            const data = Array.isArray(res.data) ? res.data : res.data.results;
            setInterestsOptions(data || []);
        });
        
        // Fetch Groups (Scoped to Club/Muni usually - assuming global endpoint returns visible groups)
        api.get('/groups/').then(res => {
            const data = Array.isArray(res.data) ? res.data : res.data.results;
            setGroupOptions(data || []);
        });
    }, []);

    // Helper: Reset estimated count when any filter changes
    const resetEstimate = () => setEstimatedCount(null);

    // Helper to build the filter object
    const getFilterPayload = (): BroadcastFilters => {
        const payload: BroadcastFilters = {
            target_level: targetLevel,
            recipient_type: recipientType,
            specific_filters: {
                // If groups selected, backend logic overrides, but we still send others just in case logic changes
                groups: selectedGroups.length > 0 ? selectedGroups : undefined,
                
                // Demographic filters (only send if no groups, or if we want combined logic later)
                gender: selectedGender || undefined,
                grade: selectedGrade ? parseInt(selectedGrade) : undefined,
                interests: selectedInterests.length > 0 ? selectedInterests : undefined,
                age_min: ageMin ? parseInt(ageMin) : undefined,
                age_max: ageMax ? parseInt(ageMax) : undefined,
            }
        };
        
        // Only include target_id if it's actually provided (backend will infer from sender if not provided)
        if (initialTargetId !== undefined && initialTargetId !== null) {
            payload.target_id = initialTargetId;
        }
        
        return payload;
    };

    const handleEstimate = async () => {
        setEstimating(true);
        try {
            const payload = getFilterPayload();
            console.log('Estimate payload:', payload); // Debug log
            const res = await messengerApi.estimateBroadcast(payload);
            setEstimatedCount(res.data.count);
            if (res.data.count === 0) {
                setToast({ 
                    message: "No recipients found matching these filters.", 
                    type: 'warning', 
                    isVisible: true 
                });
            }
        } catch (err: any) {
            console.error('Estimate error:', err);
            const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || "Failed to calculate recipients.";
            setToast({ 
                message: errorMsg, 
                type: 'error', 
                isVisible: true 
            });
            // Also notify parent if callback provided
            if (onError) {
                onError(errorMsg);
            }
        } finally {
            setEstimating(false);
        }
    };

    const handleSend = async () => {
        if (!subject.trim() || !content.trim()) {
            setToast({ 
                message: "Please fill in subject and content.", 
                type: 'warning', 
                isVisible: true 
            });
            return;
        }
        
        // Warn if no recipients estimated
        if (estimatedCount === 0) {
            setToast({ 
                message: "No recipients found. Please adjust your filters.", 
                type: 'warning', 
                isVisible: true 
            });
            return;
        }
        
        setLoading(true);
        try {
            const payload = getFilterPayload();
            console.log('Send payload:', payload); // Debug log
            await messengerApi.sendBroadcast(
                payload,
                subject,
                content,
                attachment || undefined
            );
            // Close modal immediately, parent will show success toast
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Send error:', err);
            const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || "Failed to send.";
            setToast({ 
                message: errorMsg, 
                type: 'error', 
                isVisible: true 
            });
            // Also notify parent if callback provided
            if (onError) {
                onError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    // --- UI HELPERS ---
    // Rules:
    // 1. If Groups selected -> Disable other demographic filters (visual cue)
    // 2. If Role is ADMINS -> Hide all filters
    // 3. If Role is GUARDIAN -> Hide Grade, Interests (Keep Age? Maybe not relevant for parents, hide it)
    
    const hasGroups = selectedGroups.length > 0;
    const showDemographics = recipientType !== 'ADMINS';
    const showYouthFilters = recipientType === 'YOUTH' || recipientType === 'BOTH';

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && !loading) {
            onClose();
        }
    };

    const inputClasses = (field: string) => `
        w-full h-11 sm:h-12 px-4 rounded-xl
        bg-[var(--dark-700)] border-2 
        ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
        text-[var(--brand-light)] placeholder-[var(--brand-light)]/30
        outline-none transition-all duration-200
        hover:border-[var(--brand-primary)]/50
        focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
    `;

    const selectArrowStyle = {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.75rem center',
        backgroundSize: '1rem'
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4"
            onClick={handleBackdropClick}
        >
            <div 
                className="w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] bg-[var(--dark-800)] border-y sm:border sm:rounded-2xl border-[var(--dark-600)] shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 flex-shrink-0">
                    <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                    <Users className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)]">New Broadcast</h2>
                            </div>
                            <p className="text-sm text-[var(--brand-light)]/50 ml-[52px]">Step {step} of 2: {step === 1 ? 'Select Audience' : 'Compose Message'}</p>
                        </div>
                        <button 
                            onClick={onClose}
                            disabled={loading}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--dark-600)] hover:bg-[var(--dark-500)] flex items-center justify-center transition-colors text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] flex-shrink-0"
                        >
                            <X className="h-5 w-5 sm:h-6 sm:w-6" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
                    
                    {step === 1 && (
                        <div className="space-y-5 sm:space-y-6">
                            {/* 1. Recipient Type */}
                            <div className="space-y-2">
                                <label className="block text-sm sm:text-base font-semibold text-[var(--brand-light)]">Who are you messaging?</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                    {['YOUTH', 'GUARDIAN', 'BOTH', 'ADMINS'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setRecipientType(type as any);
                                                resetEstimate();
                                                // Reset invalid filters when switching roles
                                                if (type === 'ADMINS' || type === 'GUARDIAN') {
                                                    setSelectedGrade('');
                                                    setSelectedInterests([]);
                                                }
                                            }}
                                            className={`py-2.5 sm:py-3 px-2 rounded-xl text-xs sm:text-sm font-semibold border-2 transition-all touch-manipulation
                                                ${recipientType === type 
                                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]' 
                                                    : 'border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:border-[var(--brand-primary)]/50 hover:bg-[var(--dark-700)]'}
                                            `}
                                        >
                                            {type.charAt(0) + type.slice(1).toLowerCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2. Group Selection (Primary Filter) */}
                            {showDemographics && (
                                <div className="bg-[var(--dark-700)] p-4 sm:p-5 rounded-xl border-2 border-[var(--dark-500)]">
                                    <h3 className="text-sm sm:text-base font-semibold text-[var(--brand-light)] mb-2 flex items-center gap-2">
                                        <Users className="h-4 w-4 text-[var(--brand-primary)]" />
                                        Select Groups <span className="text-xs text-[var(--brand-light)]/50 font-normal">(Overrides other filters)</span>
                                    </h3>
                                    <p className="text-xs sm:text-sm text-[var(--brand-light)]/50 mb-3">Sending to a group targets all approved members of that group.</p>
                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                        {groupOptions.map(g => (
                                            <button
                                                key={g.id}
                                                onClick={() => {
                                                    if (selectedGroups.includes(g.id)) {
                                                        setSelectedGroups(prev => prev.filter(id => id !== g.id));
                                                    } else {
                                                        setSelectedGroups(prev => [...prev, g.id]);
                                                    }
                                                    resetEstimate();
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all touch-manipulation ${
                                                    selectedGroups.includes(g.id)
                                                        ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90'
                                                        : 'bg-[var(--dark-600)] text-[var(--brand-light)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50'
                                                }`}
                                            >
                                                {g.name}
                                            </button>
                                        ))}
                                        {groupOptions.length === 0 && <span className="text-xs text-[var(--brand-light)]/50">No groups available.</span>}
                                    </div>
                                </div>
                            )}

                            {/* 3. Demographic Filters */}
                            {showDemographics && !hasGroups && (
                                <div className="bg-[var(--dark-700)] p-4 sm:p-5 rounded-xl border-2 border-[var(--dark-500)] space-y-4">
                                    <h3 className="text-sm sm:text-base font-semibold text-[var(--brand-light)] uppercase tracking-wide">Demographics</h3>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                        {/* Gender (Valid for Youth & Guardians) */}
                                        <div className="space-y-2">
                                            <label className="block text-xs sm:text-sm font-semibold text-[var(--brand-light)]/70">Gender</label>
                                            <select 
                                                value={selectedGender} 
                                                onChange={e => { setSelectedGender(e.target.value); resetEstimate(); }}
                                                className={`${inputClasses('gender')} appearance-none cursor-pointer`}
                                                style={selectArrowStyle}
                                                onFocus={() => setFocusedField('gender')}
                                                onBlur={() => setFocusedField(null)}
                                            >
                                                <option value="">All Genders</option>
                                                <option value="MALE">Male</option>
                                                <option value="FEMALE">Female</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>

                                        {/* Age Range (Mostly Youth) */}
                                        {showYouthFilters && (
                                            <div className="space-y-2">
                                                <label className="block text-xs sm:text-sm font-semibold text-[var(--brand-light)]/70">Age Range</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="number" 
                                                        placeholder="Min" 
                                                        value={ageMin}
                                                        onChange={e => { setAgeMin(e.target.value); resetEstimate(); }}
                                                        className={`${inputClasses('ageMin')} flex-1`}
                                                        onFocus={() => setFocusedField('ageMin')}
                                                        onBlur={() => setFocusedField(null)}
                                                    />
                                                    <input 
                                                        type="number" 
                                                        placeholder="Max" 
                                                        value={ageMax}
                                                        onChange={e => { setAgeMax(e.target.value); resetEstimate(); }}
                                                        className={`${inputClasses('ageMax')} flex-1`}
                                                        onFocus={() => setFocusedField('ageMax')}
                                                        onBlur={() => setFocusedField(null)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Grade (Only Youth) */}
                                        {showYouthFilters && (
                                            <div className="space-y-2">
                                                <label className="block text-xs sm:text-sm font-semibold text-[var(--brand-light)]/70">Grade</label>
                                                <select 
                                                    value={selectedGrade} 
                                                    onChange={e => { setSelectedGrade(e.target.value); resetEstimate(); }}
                                                    className={`${inputClasses('grade')} appearance-none cursor-pointer`}
                                                    style={selectArrowStyle}
                                                    onFocus={() => setFocusedField('grade')}
                                                    onBlur={() => setFocusedField(null)}
                                                >
                                                    <option value="">All Grades</option>
                                                    {[...Array(10)].map((_, i) => (
                                                        <option key={i} value={i + 1}>Grade {i + 1}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Interests (Only Youth) */}
                                    {showYouthFilters && (
                                        <div className="space-y-2">
                                            <label className="block text-xs sm:text-sm font-semibold text-[var(--brand-light)]/70">Interests</label>
                                            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                                {interestsOptions.map(interest => (
                                                    <button
                                                        key={interest.id}
                                                        onClick={() => { 
                                                            if (selectedInterests.includes(interest.id)) {
                                                                setSelectedInterests(prev => prev.filter(i => i !== interest.id));
                                                            } else {
                                                                setSelectedInterests(prev => [...prev, interest.id]);
                                                            }
                                                            resetEstimate();
                                                        }}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all touch-manipulation
                                                            ${selectedInterests.includes(interest.id)
                                                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90'
                                                                : 'bg-[var(--dark-600)] text-[var(--brand-light)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50'}
                                                        `}
                                                    >
                                                        {interest.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Estimation Result */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-[var(--dark-700)] p-4 sm:p-5 rounded-xl border-2 border-[var(--dark-500)]">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--brand-primary)]/20 flex items-center justify-center flex-shrink-0">
                                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--brand-primary)]" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm sm:text-base font-bold text-[var(--brand-light)]">
                                            {estimatedCount !== null ? `${estimatedCount} Recipients` : 'Ready to calculate'}
                                        </p>
                                        <p className="text-xs sm:text-sm text-[var(--brand-light)]/50">
                                            {hasGroups ? 'Targeting Group Members' : 'Based on filters'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleEstimate}
                                    disabled={estimating}
                                    className="px-4 py-2 rounded-xl text-sm sm:text-base font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30 transition-all disabled:opacity-50 touch-manipulation whitespace-nowrap"
                                >
                                    {estimating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                                            Calculating...
                                        </>
                                    ) : (
                                        'Refresh Count'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 sm:space-y-5">
                            <div className="space-y-2">
                                <label className="block text-sm sm:text-base font-semibold text-[var(--brand-light)]">
                                    Subject <span className="text-[var(--brand-primary)]">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    placeholder="e.g. Important Update regarding Friday's Event"
                                    className={inputClasses('subject')}
                                    onFocus={() => setFocusedField('subject')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm sm:text-base font-semibold text-[var(--brand-light)]">
                                    Message <span className="text-[var(--brand-primary)]">*</span>
                                </label>
                                <textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="Type your broadcast message here..."
                                    rows={5}
                                    className={`${inputClasses('content')} resize-none min-h-[120px]`}
                                    onFocus={() => setFocusedField('content')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm sm:text-base font-semibold text-[var(--brand-light)] flex items-center gap-2">
                                    <Paperclip className="h-4 w-4 text-[var(--brand-light)]/60" />
                                    Attachment <span className="font-normal text-xs text-[var(--brand-light)]/50">(Optional)</span>
                                </label>
                                
                                {!attachment ? (
                                    <div className="relative">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                                            className="hidden"
                                            disabled={loading}
                                            id="broadcast-file-upload"
                                        />
                                        <label
                                            htmlFor="broadcast-file-upload"
                                            className="flex flex-col items-center justify-center w-full h-24 sm:h-28 border-2 border-dashed border-[var(--dark-500)] bg-[var(--dark-700)] rounded-xl hover:border-[var(--brand-primary)] hover:bg-[var(--dark-600)] transition-all cursor-pointer group touch-manipulation"
                                        >
                                            <div className="flex flex-col items-center justify-center py-3 px-4">
                                                <div className="mb-2 p-2 rounded-full bg-[var(--dark-600)] group-hover:bg-[var(--brand-primary)]/20 transition-colors">
                                                    <Paperclip className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--brand-light)]/60 group-hover:text-[var(--brand-primary)] transition-colors" />
                                                </div>
                                                <p className="mb-0.5 text-xs sm:text-sm font-semibold text-[var(--brand-light)]/80 group-hover:text-[var(--brand-primary)] transition-colors text-center">
                                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                                </p>
                                                <p className="text-xs text-[var(--brand-light)]/50 text-center">
                                                    PNG, JPG, GIF up to 10MB
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-[var(--brand-primary)]/10 border-2 border-[var(--brand-primary)]/30">
                                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center">
                                            <Paperclip className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--brand-primary)]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-[var(--brand-light)] truncate">{attachment.name}</p>
                                            <p className="text-xs mt-0.5 text-[var(--brand-light)]/60">
                                                {(attachment.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAttachment(null)}
                                            disabled={loading}
                                            className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-colors flex-shrink-0"
                                        >
                                            <X className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 sm:p-6 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/30 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between flex-shrink-0">
                    {step === 2 ? (
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            disabled={loading}
                            className="order-2 sm:order-1 h-11 sm:h-12 px-4 sm:px-6 rounded-xl text-sm sm:text-base font-semibold text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] border border-[var(--dark-500)] transition-all touch-manipulation"
                        >
                            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2 inline" />
                            Back
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="order-2 sm:order-1 h-11 sm:h-12 px-4 sm:px-6 rounded-xl text-sm sm:text-base font-semibold text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] border border-[var(--dark-500)] transition-all touch-manipulation"
                        >
                            Cancel
                        </button>
                    )}

                    {step === 1 ? (
                        <button
                            type="button"
                            onClick={() => {
                                if (estimatedCount === null) handleEstimate();
                                setStep(2);
                            }}
                            className="order-1 sm:order-2 flex-1 sm:flex-none h-11 sm:h-12 px-4 sm:px-6 rounded-xl text-sm sm:text-base font-bold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] transition-all shadow-lg hover:shadow-xl touch-manipulation"
                        >
                            Next: Compose
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={loading || !subject.trim() || !content.trim()}
                            className="order-1 sm:order-2 flex-1 sm:flex-none h-11 sm:h-12 px-4 sm:px-6 rounded-xl text-sm sm:text-base font-bold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] gap-2 transition-all disabled:opacity-50 disabled:hover:bg-[var(--brand-primary)] touch-manipulation shadow-lg hover:shadow-xl flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                                    <span>Send Broadcast</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
            
            {/* Toast Notification */}
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
                darkMode
                duration={1250}
            />
        </div>
    );
}
