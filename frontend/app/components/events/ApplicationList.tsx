'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Toast from '../Toast';
import { Search, CheckCircle, XCircle } from 'lucide-react';

interface ApplicationListProps {
    scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function ApplicationList({ scope }: ApplicationListProps) {
    const router = useRouter();
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('PENDING'); // Default to showing tasks
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

    const fetchRegistrations = useCallback(async () => {
        setLoading(true);
        try {
            // Build Query
            let url = `/registrations/?ordering=-created_at`;
            
            // Filter logic
            if (filterStatus !== 'ALL') {
                if (filterStatus === 'PENDING') {
                    // Custom logic often needed here, or backend support for multiple values
                    // For MVP, we fetch all and filter client side if backend doesn't support "OR" easily
                    // OR we assume 'PENDING' means strictly PENDING_ADMIN for this view
                    // Let's filter client-side for complex "Pending Guardian OR Admin" logic to save backend work
                } else {
                    url += `&status=${filterStatus}`;
                }
            }
            
            const res = await api.get(url);
            let data = Array.isArray(res.data) ? res.data : res.data.results || [];

            // Client-side search/filter refinement if needed
            if (filterStatus === 'PENDING') {
                data = data.filter((r: any) => 
                    r.status === 'PENDING_ADMIN' || r.status === 'PENDING_GUARDIAN'
                );
            }

            setRegistrations(data);
        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to load applications", type: 'error', isVisible: true });
        } finally {
            setLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => {
        fetchRegistrations();
    }, [fetchRegistrations]);

    const handleAction = async (id: number, action: 'APPROVED' | 'REJECTED') => {
        try {
            await api.patch(`/registrations/${id}/`, { status: action });
            setToast({ message: `Application ${action.toLowerCase()}`, type: 'success', isVisible: true });
            
            // Optimistic Update
            setRegistrations(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error(error);
            setToast({ message: "Action failed", type: 'error', isVisible: true });
        }
    };

    // Filter by search
    const filteredList = registrations.filter(r => 
        searchTerm === '' || 
        r.user_detail?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user_detail?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user_detail?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.event_detail?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-xl shadow border border-gray-200 h-full flex flex-col">
            {/* Toolbar */}
            <div className="p-4 border-b flex flex-wrap gap-4 justify-between items-center bg-gray-50">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm w-full md:w-auto">
                    <Search size={18} className="text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search user or event..." 
                        className="outline-none text-sm w-64"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    {['PENDING', 'WAITLIST', 'APPROVED', 'ALL'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition border ${
                                filterStatus === status 
                                ? 'bg-blue-600 text-white border-blue-600' 
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {status === 'PENDING' ? 'Needs Action' : status}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0 z-10">
                        <tr>
                            <th className="p-4 border-b">Applicant</th>
                            <th className="p-4 border-b">Event</th>
                            <th className="p-4 border-b">Applied</th>
                            <th className="p-4 border-b">Status</th>
                            <th className="p-4 border-b text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredList.map((reg) => (
                            <tr 
                                key={reg.id} 
                                className="hover:bg-gray-50 transition group cursor-pointer"
                                onClick={() => router.push(`/admin/${scope.toLowerCase()}/events/${reg.event}`)}
                            >
                                <td className="p-4">
                                    <div className="font-bold text-gray-900">
                                        {reg.user_detail?.first_name} {reg.user_detail?.last_name}
                                    </div>
                                    <div className="text-xs text-gray-500">{reg.user_detail?.email}</div>
                                </td>
                                <td className="p-4">
                                    <div className="font-medium text-blue-600">
                                        {reg.event_detail?.title || `Event #${reg.event}`}
                                    </div>
                                    {reg.event_detail?.location_name && (
                                        <div className="text-xs text-gray-500">{reg.event_detail.location_name}</div>
                                    )}
                                </td>
                                <td className="p-4 text-sm text-gray-500">
                                    {new Date(reg.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold
                                        ${reg.status.includes('PENDING') ? 'bg-yellow-100 text-yellow-700' : 
                                          reg.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                          reg.status === 'WAITLIST' ? 'bg-orange-100 text-orange-700' :
                                          'bg-gray-100 text-gray-600'}
                                    `}>
                                        {reg.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div 
                                        className="flex justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button 
                                            onClick={() => handleAction(reg.id, 'APPROVED')}
                                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                                            title="Approve"
                                        >
                                            <CheckCircle size={20} />
                                        </button>
                                        <button 
                                            onClick={() => handleAction(reg.id, 'REJECTED')}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                            title="Reject"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredList.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-10 text-center text-gray-400">
                                    {loading ? 'Loading...' : 'No applications found matching criteria.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
        </div>
    );
}

