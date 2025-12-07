'use client';

import { useState, useEffect } from 'react';
import { Event } from '@/types/event';
import api from '@/lib/api';
import { Search, X, UserPlus, CheckCircle } from 'lucide-react';
import { getMediaUrl, getInitials } from '@/app/utils';

interface AddMemberModalProps {
    event: Event;
    isOpen: boolean;
    onClose: () => void;
    onMemberAdded: () => void;
}

interface EligibleMember {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    grade?: number;
    legal_gender?: string;
    date_of_birth?: string;
    is_registered: boolean;
    registration_status?: string;
}

export default function AddMemberModal({ event, isOpen, onClose, onMemberAdded }: AddMemberModalProps) {
    const [members, setMembers] = useState<EligibleMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [addingMemberId, setAddingMemberId] = useState<number | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchEligibleMembers();
        }
    }, [isOpen, event.id]);

    const fetchEligibleMembers = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/events/${event.id}/eligible_members/`);
            setMembers(res.data || []);
        } catch (err: any) {
            console.error('Error fetching eligible members:', err);
            setError(err.response?.data?.error || 'Failed to load eligible members');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async (memberId: number) => {
        setAddingMemberId(memberId);
        setError('');
        try {
            await api.post(`/events/${event.id}/add_member/`, { user_id: memberId });
            onMemberAdded();
            // Refresh the list
            await fetchEligibleMembers();
        } catch (err: any) {
            console.error('Error adding member:', err);
            setError(err.response?.data?.error || 'Failed to add member');
        } finally {
            setAddingMemberId(null);
        }
    };

    const filteredMembers = members.filter(member => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            member.first_name.toLowerCase().includes(searchLower) ||
            member.last_name.toLowerCase().includes(searchLower) ||
            member.email.toLowerCase().includes(searchLower) ||
            (member.grade && member.grade.toString().includes(searchLower))
        );
    });

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Add Member to Event</h2>
                            <p className="text-sm text-gray-500 mt-1">{event.title}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or grade..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Members List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading eligible members...</div>
                    ) : filteredMembers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {searchTerm ? 'No members found matching your search' : 'No eligible members found'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredMembers.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                                            {getInitials(member.first_name, member.last_name)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900">
                                                {member.first_name} {member.last_name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {member.email}
                                                {member.grade && ` • Grade ${member.grade}`}
                                                {member.legal_gender && ` • ${member.legal_gender}`}
                                            </div>
                                            {member.is_registered && (
                                                <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Already registered ({member.registration_status})
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {!member.is_registered && (
                                        <button
                                            onClick={() => handleAddMember(member.id)}
                                            disabled={addingMemberId === member.id}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {addingMemberId === member.id ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Adding...
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="w-4 h-4" />
                                                    Add
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

