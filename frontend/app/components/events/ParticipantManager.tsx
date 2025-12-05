'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { EventRegistration, RegistrationStatus } from '@/types/event';
import Toast from '../Toast';

interface ParticipantManagerProps {
    eventId: number;
}

export default function ParticipantManager({ eventId }: ParticipantManagerProps) {
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [filter, setFilter] = useState<string>('ALL');
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

    const fetchRegistrations = useCallback(async () => {
        try {
            // Fetch registrations for this specific event
            // Note: Backend endpoint might need filtering ?event=ID or we filter client side
            // Ideally: api.get(`/registrations/?event=${eventId}`)
            const res = await api.get(`/registrations/?event=${eventId}`);
            setRegistrations(Array.isArray(res.data) ? res.data : res.data.results || []);
        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to load participants", type: 'error', isVisible: true });
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchRegistrations();
    }, [fetchRegistrations]);

    const updateStatus = async (regId: number, newStatus: string) => {
        try {
            const response = await api.patch(`/registrations/${regId}/`, { status: newStatus });
            console.log('Update response:', response.data);
            setToast({ message: `Status updated to ${newStatus}`, type: 'success', isVisible: true });
            // Refresh list after a short delay to ensure backend has processed
            setTimeout(() => {
                fetchRegistrations();
            }, 500);
        } catch (error: any) {
            console.error('Update error:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || "Update failed";
            setToast({ message: errorMessage, type: 'error', isVisible: true });
        }
    };

    // Derived state for filtering
    const filteredList = registrations.filter(r => {
        if (filter === 'ALL') return true;
        if (filter === 'PENDING') return r.status === 'PENDING_GUARDIAN' || r.status === 'PENDING_ADMIN';
        return r.status === filter;
    });

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            APPROVED: 'bg-green-100 text-green-700',
            WAITLIST: 'bg-orange-100 text-orange-700',
            PENDING_GUARDIAN: 'bg-yellow-100 text-yellow-700',
            PENDING_ADMIN: 'bg-blue-100 text-blue-700',
            REJECTED: 'bg-red-100 text-red-700',
            CANCELLED: 'bg-gray-100 text-gray-500',
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[status] || 'bg-gray-100'}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    if (loading) return <div className="p-4 text-center">Loading participants...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b flex flex-wrap gap-2 items-center justify-between bg-gray-50">
                <div className="flex gap-2">
                    {['ALL', 'APPROVED', 'WAITLIST', 'PENDING'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1 text-sm rounded-lg font-medium transition ${
                                filter === f ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {f.charAt(0) + f.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
                <div className="text-sm text-gray-500">
                    Total: <span className="font-bold text-gray-900">{registrations.length}</span>
                </div>
            </div>

            {/* List */}
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                        <th className="p-4">User</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {filteredList.map((reg) => (
                        <tr key={reg.id} className="hover:bg-gray-50 transition">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    {/* Avatar placeholder */}
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                        {reg.user_detail?.first_name?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">
                                            {reg.user_detail?.first_name} {reg.user_detail?.last_name}
                                        </div>
                                        <div className="text-xs text-gray-500">{reg.user_detail?.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 text-sm text-gray-500">
                                {new Date(reg.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                                {getStatusBadge(reg.status)}
                            </td>
                            <td className="p-4 text-right space-x-2">
                                {(reg.status === 'PENDING_ADMIN' || reg.status === 'WAITLIST') && (
                                    <button 
                                        onClick={() => updateStatus(reg.id, 'APPROVED')}
                                        className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 border border-green-200"
                                    >
                                        Approve
                                    </button>
                                )}
                                {(reg.status === 'PENDING_GUARDIAN') && (
                                    <span className="text-xs text-gray-400 italic">Waiting for parent</span>
                                )}
                                {reg.status !== 'REJECTED' && reg.status !== 'CANCELLED' && (
                                    <button 
                                        onClick={() => updateStatus(reg.id, 'REJECTED')}
                                        className="text-xs text-red-600 hover:text-red-800 px-2 py-1"
                                    >
                                        Reject
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {filteredList.length === 0 && (
                        <tr>
                            <td colSpan={4} className="p-8 text-center text-gray-400">
                                No participants found in this category.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            
            <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
        </div>
    );
}

