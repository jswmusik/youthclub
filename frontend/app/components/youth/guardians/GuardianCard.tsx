import { GuardianLink } from '@/types/user';
import { getMediaUrl } from '@/app/utils';

interface GuardianCardProps {
    link: GuardianLink;
    onView: (link: GuardianLink) => void;
    onRemove: (link: GuardianLink) => void;
}

export default function GuardianCard({ link, onView, onRemove }: GuardianCardProps) {
    const { guardian, status, relationship_type } = link;
    
    // Status Badge Colors
    const statusColors = {
        ACTIVE: 'bg-green-100 text-green-800',
        PENDING: 'bg-yellow-100 text-yellow-800',
        REJECTED: 'bg-red-100 text-red-800',
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 relative overflow-hidden transition-all hover:shadow-md">
            {/* Top Row: Avatar & Status */}
            <div className="flex justify-between items-start">
                <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden shrink-0 border-2 border-white shadow-sm">
                    {guardian.avatar ? (
                        <img 
                            src={getMediaUrl(guardian.avatar)} 
                            alt={guardian.first_name} 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl bg-gray-100">
                            {guardian.first_name?.[0] || ''}{guardian.last_name?.[0] || ''}
                        </div>
                    )}
                </div>
                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${statusColors[status] || 'bg-gray-100'}`}>
                    {status === 'ACTIVE' ? 'Verified' : status}
                </span>
            </div>

            {/* Info */}
            <div>
                <h3 className="font-bold text-gray-900 text-lg truncate">
                    {guardian.first_name} {guardian.last_name}
                </h3>
                <p className="text-sm text-blue-600 font-medium capitalize mb-1">
                    {relationship_type.toLowerCase()}
                </p>
                {/* Obfuscate email if not active/verified? Usually email is safe to show if they invited them */}
                <p className="text-xs text-gray-500 truncate">{guardian.email}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-auto pt-2">
                <button 
                    onClick={() => onView(link)}
                    className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
                >
                    View Details
                </button>
                <button 
                    onClick={() => onRemove(link)}
                    className="w-10 flex items-center justify-center bg-gray-50 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Remove Guardian"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

