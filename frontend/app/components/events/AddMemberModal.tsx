'use client';

import { useState, useEffect } from 'react';
import { Event } from '@/types/event';
import api from '@/lib/api';
import { Search, X, UserPlus, CheckCircle, Users, GraduationCap, Mail } from 'lucide-react';
import { getMediaUrl, getInitials } from '@/app/utils';

interface AddMemberModalProps {
    event: Event;
    isOpen: boolean;
    onClose: () => void;
    onMemberAdded: () => void;
    darkMode?: boolean;
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
    avatar?: string;
}

export default function AddMemberModal({ event, isOpen, onClose, onMemberAdded, darkMode = false }: AddMemberModalProps) {
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

    // Dark mode styles
    const modalBg = darkMode ? 'bg-[var(--dark-800)]' : 'bg-white';
    const borderColor = darkMode ? 'border-[var(--dark-600)]' : 'border-gray-200';
    const textPrimary = darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900';
    const textSecondary = darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500';
    const inputBg = darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40' : 'border-gray-300';

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className={`${modalBg} rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`p-5 sm:p-6 border-b ${borderColor}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                darkMode 
                                    ? 'bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)]'
                                    : 'bg-blue-100'
                            }`}>
                                <UserPlus className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-blue-600'}`} />
                            </div>
                            <div>
                                <h2 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>Add Member</h2>
                                <p className={`text-xs sm:text-sm ${textSecondary} truncate max-w-[200px] sm:max-w-none`}>{event.title}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                                darkMode 
                                    ? 'hover:bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]'
                                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className={`p-4 border-b ${borderColor}`}>
                    <div className="relative">
                        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or grade..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] outline-none transition-all ${inputBg}`}
                        />
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className={`mx-4 mt-3 p-3 rounded-xl text-sm ${
                        darkMode 
                            ? 'bg-[var(--brand-red)]/20 border border-[var(--brand-red)]/30 text-[var(--brand-red)]'
                            : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                        {error}
                    </div>
                )}

                {/* Members List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className={`w-10 h-10 border-3 ${darkMode ? 'border-[var(--dark-600)] border-t-[var(--brand-primary)]' : 'border-gray-200 border-t-blue-500'} rounded-full animate-spin mx-auto mb-4`} />
                            <p className={textSecondary}>Loading eligible members...</p>
                        </div>
                    ) : filteredMembers.length === 0 ? (
                        <div className="text-center py-12">
                            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                                darkMode ? 'bg-[var(--dark-700)]' : 'bg-gray-100'
                            }`}>
                                <Users className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-light)]/30' : 'text-gray-400'}`} />
                            </div>
                            <p className={`font-medium ${textPrimary}`}>
                                {searchTerm ? 'No members found' : 'No eligible members'}
                            </p>
                            <p className={`text-sm mt-1 ${textSecondary}`}>
                                {searchTerm ? 'Try adjusting your search' : 'All eligible members are already registered'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Results count */}
                            <p className={`text-xs mb-3 ${textSecondary}`}>
                                {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'} found
                            </p>
                            
                            {filteredMembers.map((member) => (
                                <div
                                    key={member.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                        darkMode 
                                            ? 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                                            : 'bg-gray-50 border-gray-100 hover:border-blue-200 hover:bg-gray-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Avatar */}
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0 ${
                                            darkMode 
                                                ? 'bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] text-white'
                                                : 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                                        }`}>
                                            {member.avatar ? (
                                                <img src={getMediaUrl(member.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                getInitials(member.first_name, member.last_name)
                                            )}
                                        </div>
                                        
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-semibold ${textPrimary}`}>
                                                {member.first_name} {member.last_name}
                                            </div>
                                            <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs ${textSecondary}`}>
                                                <span className="flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    <span className="truncate max-w-[150px] sm:max-w-none">{member.email}</span>
                                                </span>
                                                {member.grade && (
                                                    <span className="flex items-center gap-1">
                                                        <GraduationCap className="w-3 h-3" />
                                                        Grade {member.grade}
                                                    </span>
                                                )}
                                                {member.legal_gender && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                        darkMode 
                                                            ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/60'
                                                            : 'bg-gray-200 text-gray-600'
                                                    }`}>
                                                        {member.legal_gender}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Already registered badge */}
                                            {member.is_registered && (
                                                <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-lg text-xs font-medium ${
                                                    darkMode 
                                                        ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)]'
                                                        : 'bg-green-100 text-green-700'
                                                }`}>
                                                    <CheckCircle className="w-3 h-3" />
                                                    Registered ({member.registration_status})
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Add Button */}
                                        {!member.is_registered && (
                                            <button
                                                onClick={() => handleAddMember(member.id)}
                                                disabled={addingMemberId === member.id}
                                                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0 ${
                                                    darkMode 
                                                        ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90 active:scale-95'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                                                }`}
                                            >
                                                {addingMemberId === member.id ? (
                                                    <>
                                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                        </svg>
                                                        <span className="hidden sm:inline">Adding...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserPlus className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Add</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${borderColor}`}>
                    <button
                        onClick={onClose}
                        className={`w-full px-4 py-3 rounded-xl font-semibold transition-colors ${
                            darkMode 
                                ? 'text-[var(--brand-light)]/70 bg-[var(--dark-700)] hover:bg-[var(--dark-600)] border border-[var(--dark-500)]'
                                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                        }`}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
