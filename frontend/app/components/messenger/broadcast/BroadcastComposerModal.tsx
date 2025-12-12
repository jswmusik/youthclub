'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Paperclip, Send, Loader2, ArrowLeft, Users } from 'lucide-react';
import { messengerApi } from '../../../../lib/messenger-api';
import api from '../../../../lib/api';
import { BroadcastFilters } from '../../../../types/messenger';
import Toast from '../../../components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
            onClick={handleBackdropClick}
        >
            <Card 
                className="w-full max-w-2xl shadow-2xl border border-gray-100 bg-white rounded-xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <CardHeader className="pb-4 bg-white border-b border-gray-100 px-5 sm:px-6 pt-5 flex-shrink-0">
                    <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0 flex-1">
                            <CardTitle className="text-xl sm:text-2xl font-bold text-[#121213]">New Broadcast</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Step {step} of 2: {step === 1 ? 'Select Audience' : 'Compose Message'}</p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={onClose}
                            disabled={loading}
                            className="h-9 w-9 sm:h-10 sm:w-10 text-gray-400 hover:text-gray-600 hover:bg-gray-50 active:bg-gray-100 flex-shrink-0 touch-manipulation rounded-full"
                        >
                            <X className="h-5 w-5 sm:h-6 sm:w-6" />
                        </Button>
                    </div>
                </CardHeader>

                {/* Body */}
                <CardContent className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0">
                    
                    {step === 1 && (
                        <div className="space-y-5 sm:space-y-6">
                            {/* 1. Recipient Type */}
                            <div className="space-y-2">
                                <Label className="text-sm sm:text-base font-semibold text-[#121213]">Who are you messaging?</Label>
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
                                                    ? 'border-[#4D4DA4] bg-[#EBEBFE] text-[#4D4DA4] shadow-sm' 
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100'}
                                            `}
                                        >
                                            {type.charAt(0) + type.slice(1).toLowerCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2. Group Selection (Primary Filter) */}
                            {showDemographics && (
                                <div className="bg-[#EBEBFE]/30 p-4 sm:p-5 rounded-xl border-2 border-[#EBEBFE]">
                                    <h3 className="text-sm sm:text-base font-semibold text-[#121213] mb-2 flex items-center gap-2">
                                        <Users className="h-4 w-4 text-[#4D4DA4]" />
                                        Select Groups <span className="text-xs text-gray-500 font-normal">(Overrides other filters)</span>
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-600 mb-3">Sending to a group targets all approved members of that group.</p>
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
                                                        ? 'bg-[#4D4DA4] text-white border-[#4D4DA4] hover:bg-[#FF5485] hover:border-[#FF5485]'
                                                        : 'bg-white text-[#4D4DA4] border-[#EBEBFE] hover:border-[#4D4DA4] hover:bg-[#EBEBFE]/50'
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
                                <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border-2 border-gray-200 space-y-4">
                                    <h3 className="text-sm sm:text-base font-semibold text-[#121213] uppercase tracking-wide">Demographics</h3>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                        {/* Gender (Valid for Youth & Guardians) */}
                                        <div className="space-y-2">
                                            <Label className="text-xs sm:text-sm font-semibold text-[#121213]">Gender</Label>
                                            <select 
                                                value={selectedGender} 
                                                onChange={e => { setSelectedGender(e.target.value); resetEstimate(); }}
                                                className="w-full h-11 sm:h-12 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm sm:text-base focus:ring-2 focus:ring-[#4D4DA4] focus:border-[#4D4DA4] focus:bg-white transition-colors"
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
                                                <Label className="text-xs sm:text-sm font-semibold text-[#121213]">Age Range</Label>
                                                <div className="flex gap-2">
                                                    <Input 
                                                        type="number" 
                                                        placeholder="Min" 
                                                        value={ageMin}
                                                        onChange={e => { setAgeMin(e.target.value); resetEstimate(); }}
                                                        className="h-11 sm:h-12 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm sm:text-base focus:ring-2 focus:ring-[#4D4DA4] focus:border-[#4D4DA4] focus:bg-white"
                                                    />
                                                    <Input 
                                                        type="number" 
                                                        placeholder="Max" 
                                                        value={ageMax}
                                                        onChange={e => { setAgeMax(e.target.value); resetEstimate(); }}
                                                        className="h-11 sm:h-12 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm sm:text-base focus:ring-2 focus:ring-[#4D4DA4] focus:border-[#4D4DA4] focus:bg-white"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Grade (Only Youth) */}
                                        {showYouthFilters && (
                                            <div className="space-y-2">
                                                <Label className="text-xs sm:text-sm font-semibold text-[#121213]">Grade</Label>
                                                <select 
                                                    value={selectedGrade} 
                                                    onChange={e => { setSelectedGrade(e.target.value); resetEstimate(); }}
                                                    className="w-full h-11 sm:h-12 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm sm:text-base focus:ring-2 focus:ring-[#4D4DA4] focus:border-[#4D4DA4] focus:bg-white transition-colors"
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
                                            <Label className="text-xs sm:text-sm font-semibold text-[#121213]">Interests</Label>
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
                                                                ? 'bg-[#4D4DA4] text-white border-[#4D4DA4] hover:bg-[#FF5485] hover:border-[#FF5485]'
                                                                : 'bg-white text-[#4D4DA4] border-gray-200 hover:border-[#4D4DA4] hover:bg-[#EBEBFE]/50'}
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
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-[#EBEBFE]/30 p-4 sm:p-5 rounded-xl border-2 border-[#EBEBFE]">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#4D4DA4]/10 flex items-center justify-center flex-shrink-0">
                                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#4D4DA4]" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm sm:text-base font-bold text-[#121213]">
                                            {estimatedCount !== null ? `${estimatedCount} Recipients` : 'Ready to calculate'}
                                        </p>
                                        <p className="text-xs sm:text-sm text-gray-500">
                                            {hasGroups ? 'Targeting Group Members' : 'Based on filters'}
                                        </p>
                                    </div>
                                </div>
                                <Button 
                                    onClick={handleEstimate}
                                    disabled={estimating}
                                    variant="ghost"
                                    className="text-sm sm:text-base font-semibold text-[#4D4DA4] hover:text-[#FF5485] hover:bg-[#EBEBFE] disabled:opacity-50 touch-manipulation whitespace-nowrap"
                                >
                                    {estimating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Calculating...
                                        </>
                                    ) : (
                                        'Refresh Count'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 sm:space-y-5">
                            <div className="space-y-2">
                                <Label className="text-sm sm:text-base font-semibold text-[#121213]">
                                    Subject <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    placeholder="e.g. Important Update regarding Friday's Event"
                                    className="h-11 sm:h-12 text-sm sm:text-base bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm sm:text-base font-semibold text-[#121213]">
                                    Message <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="Type your broadcast message here..."
                                    rows={5}
                                    className="resize-none text-sm sm:text-base bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl min-h-[120px] p-3 sm:p-4"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm sm:text-base font-semibold text-[#121213] flex items-center gap-2">
                                    <Paperclip className="h-4 w-4 text-gray-500" />
                                    Attachment <span className="text-gray-500 font-normal text-xs">(Optional)</span>
                                </Label>
                                
                                {!attachment ? (
                                    <div className="relative">
                                        <Input
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
                                            className="flex flex-col items-center justify-center w-full h-24 sm:h-28 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:border-[#4D4DA4] hover:bg-[#EBEBFE]/20 active:bg-[#EBEBFE]/30 transition-all cursor-pointer group touch-manipulation"
                                        >
                                            <div className="flex flex-col items-center justify-center pt-3 pb-3 px-4">
                                                <div className="mb-2 p-2 rounded-full bg-[#EBEBFE]/50 group-hover:bg-[#EBEBFE] transition-colors">
                                                    <Paperclip className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 group-hover:text-[#4D4DA4] transition-colors" />
                                                </div>
                                                <p className="mb-0.5 text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-[#4D4DA4] transition-colors text-center">
                                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                                </p>
                                                <p className="text-xs text-gray-500 text-center">
                                                    PNG, JPG, GIF up to 10MB
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 text-sm sm:text-base text-[#121213] bg-[#EBEBFE]/30 p-3 sm:p-4 rounded-xl border-2 border-[#EBEBFE]">
                                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#4D4DA4]/10 flex items-center justify-center">
                                            <Paperclip className="h-5 w-5 sm:h-6 sm:w-6 text-[#4D4DA4]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm truncate">{attachment.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {(attachment.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setAttachment(null)}
                                            disabled={loading}
                                            className="h-9 w-9 sm:h-10 sm:w-10 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0 touch-manipulation rounded-full"
                                        >
                                            <X className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>

                {/* Footer */}
                <div className="p-4 sm:p-5 sm:p-6 border-t border-gray-100 bg-white flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between flex-shrink-0">
                    {step === 2 ? (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setStep(1)}
                            disabled={loading}
                            className="order-2 sm:order-1 h-11 sm:h-12 text-sm sm:text-base font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 touch-manipulation rounded-xl"
                        >
                            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                            Back
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={loading}
                            className="order-2 sm:order-1 h-11 sm:h-12 text-sm sm:text-base font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 touch-manipulation rounded-xl"
                        >
                            Cancel
                        </Button>
                    )}

                    {step === 1 ? (
                        <Button
                            type="button"
                            onClick={() => {
                                if (estimatedCount === null) handleEstimate();
                                setStep(2);
                            }}
                            className="order-1 sm:order-2 flex-1 sm:flex-none h-11 sm:h-12 text-sm sm:text-base font-semibold bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors shadow-lg hover:shadow-xl touch-manipulation"
                        >
                            Next: Compose
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={handleSend}
                            disabled={loading || !subject.trim() || !content.trim()}
                            className="order-1 sm:order-2 flex-1 sm:flex-none h-11 sm:h-12 text-sm sm:text-base font-semibold bg-[#4D4DA4] hover:bg-[#FF5485] text-white gap-2 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-[#4D4DA4] touch-manipulation shadow-lg hover:shadow-xl"
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
                        </Button>
                    )}
                </div>
            </Card>
            
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
