import { GuardianLink } from '@/types/user';
import { getMediaUrl } from '@/app/utils';

import { Shield, Trash2 } from 'lucide-react';


interface GuardianCardProps {
    link: GuardianLink;
    onView: (link: GuardianLink) => void;
    onRemove: (link: GuardianLink) => void;
    darkMode?: boolean;
}

export default function GuardianCard({ link, onView, onRemove, darkMode = false }: GuardianCardProps) {
    const { guardian, status, relationship_type } = link;
    
    // Status Badge Colors
    const statusStyles = darkMode ? {
        ACTIVE: 'bg-[var(--brand-third)]/20 text-[var(--brand-third)] border border-[var(--brand-third)]/30',
        PENDING: 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30',
        REJECTED: 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30',
    } : {
        ACTIVE: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
        PENDING: 'bg-gradient-to-r from-amber-400 to-amber-500 text-white',
        REJECTED: 'bg-gradient-to-r from-red-500 to-red-600 text-white',
    };

    return (
        <div className={`p-6 flex flex-col gap-4 relative overflow-hidden transition-all ${
            darkMode 
                ? 'bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/40' 
                : 'bg-white rounded-2xl shadow-md border-2 border-[#4D4DA4]/10 hover:shadow-lg hover:border-[#4D4DA4]/30'
        }`}>
            {/* Top Row: Avatar & Status */}
            <div className="flex justify-between items-start">
                <div className={`w-20 h-20 rounded-2xl overflow-hidden shrink-0 ${
                    darkMode 
                        ? 'bg-[var(--dark-600)] border-2 border-[var(--dark-400)]' 
                        : 'bg-gradient-to-br from-[#4D4DA4]/10 to-[#FF5485]/10 border-2 border-[#4D4DA4]/20 shadow-sm'
                }`}>
                    {guardian.avatar ? (
                        <img 
                            src={getMediaUrl(guardian.avatar)} 
                            alt={guardian.first_name} 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center font-bold text-2xl ${
                            darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'
                        }`}>
                            {guardian.first_name?.[0] || ''}{guardian.last_name?.[0] || ''}
                        </div>
                    )}
                </div>
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${statusStyles[status] || (darkMode ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/60' : 'bg-gray-100')}`}>
                    {status === 'ACTIVE' ? 'Verified' : status}
                </span>
            </div>

            {/* Info */}
            <div>
                <h3 className={`font-bold text-xl mb-1 truncate font-heading ${
                    darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
                }`}>
                    {guardian.first_name} {guardian.last_name}
                </h3>
                <p className={`text-sm font-bold capitalize mb-2 flex items-center gap-1 ${
                    darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'
                }`}>
                    <Shield className="w-4 h-4" />
                    {relationship_type.toLowerCase()}
                </p>
                <p className={`text-xs truncate px-2 py-1 rounded-lg ${
                    darkMode 
                        ? 'text-[var(--brand-light)]/60 bg-[var(--dark-600)]' 
                        : 'text-gray-600 bg-gray-50'
                }`}>{guardian.email}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-auto pt-2">
                <button 
                    onClick={() => onView(link)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        darkMode 
                            ? 'bg-[var(--brand-secondary)] hover:bg-[var(--brand-secondary)]/80 text-[var(--brand-light)]' 
                            : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white hover:from-[#3D3D94] hover:to-[#5D5DC4] shadow-md shadow-[#4D4DA4]/20'
                    }`}
                >
                    View Details
                </button>
                <button 
                    onClick={() => onRemove(link)}
                    className={`w-11 flex items-center justify-center rounded-xl transition-colors ${
                        darkMode 
                            ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:bg-[var(--brand-red)]/20 hover:text-[var(--brand-red)]' 
                            : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
                    }`}
                    title="Remove Guardian"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

