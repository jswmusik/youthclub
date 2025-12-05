'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Event } from '@/types/event';
import { CheckCircle, AlertTriangle, Clock, X } from 'lucide-react';

interface ModalProps {
    event: Event;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EventRegistrationModal({ event, isOpen, onClose, onSuccess }: ModalProps) {
    const router = useRouter();
    const [step, setStep] = useState<'CONFIRM' | 'PROCESSING' | 'RESULT'>('CONFIRM');
    const [result, setResult] = useState<{ status: string; message?: string } | null>(null);
    const [error, setError] = useState('');

    if (!isOpen) return null;

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

    // --- Render Result View ---
    if (step === 'RESULT' && result) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-center mb-4">
                        {result.status === 'APPROVED' && <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"><CheckCircle className="w-8 h-8 text-green-600" /></div>}
                        {result.status === 'WAITLIST' && <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center"><Clock className="w-8 h-8 text-orange-600" /></div>}
                        {result.status === 'PENDING' && <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center"><AlertTriangle className="w-8 h-8 text-yellow-600" /></div>}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {result.status === 'APPROVED' ? 'You are going!' : 
                         result.status === 'WAITLIST' ? 'Waitlist Joined' : 'Request Sent'}
                    </h3>
                    
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

    // --- Render Confirmation View ---
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Confirm Registration</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-4 h-4" /></button>
                </div>

                <div className="space-y-4 mb-8">
                    <p className="text-gray-600 text-sm">
                        You are about to register for <span className="font-bold text-gray-900">{event.title}</span>.
                    </p>

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
                        disabled={step === 'PROCESSING'}
                        className="flex-1 py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex justify-center"
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

