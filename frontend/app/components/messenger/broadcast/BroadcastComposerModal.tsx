'use client';

import { useState, useEffect } from 'react';
import { messengerApi } from '../../../../lib/messenger-api';
import api from '../../../../lib/api'; // For fetching interests/options
import { BroadcastFilters } from '../../../../types/messenger';

interface BroadcastComposerModalProps {
    onClose: () => void;
    onSuccess: () => void;
    initialScope?: 'GLOBAL' | 'MUNICIPALITY' | 'CLUB';
    initialTargetId?: number; // ID of the muni/club context
}

export default function BroadcastComposerModal({ 
    onClose, 
    onSuccess, 
    initialScope = 'CLUB',
    initialTargetId 
}: BroadcastComposerModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [estimating, setEstimating] = useState(false);
    const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
    const [interestsOptions, setInterestsOptions] = useState<{id: number, name: string}[]>([]);

    // --- Form State ---
    const [targetLevel, setTargetLevel] = useState(initialScope);
    const [recipientType, setRecipientType] = useState<'YOUTH'|'GUARDIAN'|'BOTH'|'ADMINS'>('YOUTH');
    
    // Filters
    const [selectedGender, setSelectedGender] = useState<string>('');
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [selectedInterests, setSelectedInterests] = useState<number[]>([]);

    // Content
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);

    // Fetch Interests on mount
    useEffect(() => {
        api.get('/interests/').then(res => {
            const data = Array.isArray(res.data) ? res.data : res.data.results;
            setInterestsOptions(data || []);
        });
    }, []);

    // Helper to build the filter object
    const getFilterPayload = (): BroadcastFilters => {
        return {
            target_level: targetLevel,
            target_id: initialTargetId, // In a real app, Super Admins might select this via dropdown
            recipient_type: recipientType,
            specific_filters: {
                gender: selectedGender || undefined,
                grade: selectedGrade ? parseInt(selectedGrade) : undefined,
                interests: selectedInterests.length > 0 ? selectedInterests : undefined
            }
        };
    };

    const handleEstimate = async () => {
        setEstimating(true);
        try {
            const res = await messengerApi.estimateBroadcast(getFilterPayload());
            setEstimatedCount(res.data.count);
        } catch (err) {
            console.error(err);
            alert("Failed to calculate recipients.");
        } finally {
            setEstimating(false);
        }
    };

    const handleSend = async () => {
        if (!subject.trim() || !content.trim()) {
            alert("Please fill in subject and content.");
            return;
        }
        
        if (estimatedCount === 0) {
            if (!confirm("Warning: This message will be sent to 0 recipients. Continue?")) return;
        }

        setLoading(true);
        try {
            await messengerApi.sendBroadcast(
                getFilterPayload(),
                subject,
                content,
                attachment || undefined
            );
            alert("Broadcast sent successfully!");
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to send broadcast.");
        } finally {
            setLoading(false);
        }
    };

    const toggleInterest = (id: number) => {
        if (selectedInterests.includes(id)) {
            setSelectedInterests(prev => prev.filter(i => i !== id));
        } else {
            setSelectedInterests(prev => [...prev, id]);
        }
    };

    // --- RENDER ---

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">New Broadcast</h2>
                        <p className="text-sm text-gray-500">Step {step} of 2: {step === 1 ? 'Select Audience' : 'Compose Message'}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    
                    {/* STEP 1: AUDIENCE */}
                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Recipient Type */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Who are you messaging?</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {['YOUTH', 'GUARDIAN', 'BOTH', 'ADMINS'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setRecipientType(type as any);
                                                setEstimatedCount(null); // Reset count on change
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

                            {/* Filters (Only for Youth/Guardians) */}
                            {recipientType !== 'ADMINS' && (
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Filters (Optional)</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Gender */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Gender</label>
                                            <select 
                                                value={selectedGender} 
                                                onChange={e => { setSelectedGender(e.target.value); setEstimatedCount(null); }}
                                                className="w-full rounded-lg border-gray-300 text-sm py-2"
                                            >
                                                <option value="">All Genders</option>
                                                <option value="MALE">Male</option>
                                                <option value="FEMALE">Female</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>

                                        {/* Grade */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Grade</label>
                                            <select 
                                                value={selectedGrade} 
                                                onChange={e => { setSelectedGrade(e.target.value); setEstimatedCount(null); }}
                                                className="w-full rounded-lg border-gray-300 text-sm py-2"
                                            >
                                                <option value="">All Grades</option>
                                                {[...Array(10)].map((_, i) => (
                                                    <option key={i} value={i + 1}>Grade {i + 1}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Interests */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-2">Interests</label>
                                        <div className="flex flex-wrap gap-2">
                                            {interestsOptions.map(interest => (
                                                <button
                                                    key={interest.id}
                                                    onClick={() => { toggleInterest(interest.id); setEstimatedCount(null); }}
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
                                </div>
                            )}

                            {/* Estimation Result */}
                            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">
                                            {estimatedCount !== null ? `${estimatedCount} Recipients` : 'Ready to calculate'}
                                        </p>
                                        <p className="text-xs text-gray-500">Based on your filters</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleEstimate}
                                    disabled={estimating}
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
                                >
                                    {estimating ? 'Calculating...' : 'Refresh Count'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CONTENT */}
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
                                    className="block w-full text-sm text-gray-500
                                      file:mr-4 file:py-2 file:px-4
                                      file:rounded-full file:border-0
                                      file:text-sm file:font-semibold
                                      file:bg-blue-50 file:text-blue-700
                                      hover:file:bg-blue-100"
                                    onChange={e => setAttachment(e.target.files?.[0] || null)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-between">
                    {step === 2 ? (
                        <button 
                            onClick={() => setStep(1)}
                            className="px-6 py-2 text-gray-600 font-bold hover:text-gray-900"
                        >
                            Back
                        </button>
                    ) : (
                        <button 
                            onClick={onClose}
                            className="px-6 py-2 text-gray-600 font-bold hover:text-gray-900"
                        >
                            Cancel
                        </button>
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
        </div>
    );
}
