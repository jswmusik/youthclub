'use client';

import { useState, useEffect } from 'react';
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
}

export default function BroadcastComposerModal({ 
    onClose, 
    onSuccess, 
    onError,
    initialScope = 'CLUB',
    initialTargetId 
}: BroadcastComposerModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [estimating, setEstimating] = useState(false);
    const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
    
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

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">New Broadcast</h2>
                        <p className="text-sm text-gray-500">Step {step} of 2: {step === 1 ? 'Select Audience' : 'Compose Message'}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">?</button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    
                    {step === 1 && (
                        <div className="space-y-8">
                            {/* 1. Recipient Type */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Who are you messaging?</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                                            className={`py-3 px-2 rounded-lg text-sm font-bold border-2 transition-all
                                                ${recipientType === type 
                                                    ? 'border-blue-600 bg-blue-50 text-blue-700' 
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'}
                                            `}
                                        >
                                            {type.charAt(0) + type.slice(1).toLowerCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2. Group Selection (Primary Filter) */}
                            {showDemographics && (
                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <h3 className="text-sm font-bold text-indigo-900 mb-2">?? Select Groups (Overrides other filters)</h3>
                                    <p className="text-xs text-indigo-700 mb-3">Sending to a group targets all approved members of that group.</p>
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
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                                    selectedGroups.includes(g.id)
                                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                                        : 'bg-white text-indigo-600 border-indigo-200 hover:border-indigo-400'
                                                }`}
                                            >
                                                {g.name}
                                            </button>
                                        ))}
                                        {groupOptions.length === 0 && <span className="text-xs text-gray-500">No groups available.</span>}
                                    </div>
                                </div>
                            )}

                            {/* 3. Demographic Filters */}
                            {showDemographics && !hasGroups && (
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Demographics</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* Gender (Valid for Youth & Guardians) */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Gender</label>
                                            <select 
                                                value={selectedGender} 
                                                onChange={e => { setSelectedGender(e.target.value); resetEstimate(); }}
                                                className="w-full rounded-lg border-gray-300 text-sm"
                                            >
                                                <option value="">All Genders</option>
                                                <option value="MALE">Male</option>
                                                <option value="FEMALE">Female</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>

                                        {/* Age Range (Mostly Youth) */}
                                        {showYouthFilters && (
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Age Range</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="number" 
                                                        placeholder="Min" 
                                                        value={ageMin}
                                                        onChange={e => { setAgeMin(e.target.value); resetEstimate(); }}
                                                        className="w-1/2 rounded-lg border-gray-300 text-sm"
                                                    />
                                                    <input 
                                                        type="number" 
                                                        placeholder="Max" 
                                                        value={ageMax}
                                                        onChange={e => { setAgeMax(e.target.value); resetEstimate(); }}
                                                        className="w-1/2 rounded-lg border-gray-300 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Grade (Only Youth) */}
                                        {showYouthFilters && (
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Grade</label>
                                                <select 
                                                    value={selectedGrade} 
                                                    onChange={e => { setSelectedGrade(e.target.value); resetEstimate(); }}
                                                    className="w-full rounded-lg border-gray-300 text-sm"
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
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-2">Interests</label>
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
                                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                                                            ${selectedInterests.includes(interest.id)
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}
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
                            <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">
                                            {estimatedCount !== null ? `${estimatedCount} Recipients` : 'Ready to calculate'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {hasGroups ? 'Targeting Group Members' : 'Based on filters'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleEstimate}
                                    disabled={estimating}
                                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 underline disabled:opacity-50"
                                >
                                    {estimating ? 'Calculating...' : 'Refresh Count'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                                <input 
                                    type="text" 
                                    className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g. Important Update regarding Friday's Event"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Message</label>
                                <textarea 
                                    rows={8}
                                    className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Type your broadcast message here..."
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Attachment (Optional)</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={e => setAttachment(e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-between">
                    {step === 2 ? (
                        <button onClick={() => setStep(1)} className="px-6 py-2 text-gray-600 font-bold hover:text-gray-900">Back</button>
                    ) : (
                        <button onClick={onClose} className="px-6 py-2 text-gray-600 font-bold hover:text-gray-900">Cancel</button>
                    )}

                    {step === 1 ? (
                        <button 
                            onClick={() => {
                                if (estimatedCount === null) handleEstimate();
                                setStep(2);
                            }}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md transition-colors"
                        >
                            Next: Compose
                        </button>
                    ) : (
                        <button 
                            onClick={handleSend}
                            disabled={loading}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            Send Broadcast
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
            />
        </div>
    );
}
