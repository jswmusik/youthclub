import { GuardianLink } from '@/types/user';
import { getMediaUrl } from '@/app/utils';

interface ModalProps {
    link: GuardianLink | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function GuardianDetailModal({ link, isOpen, onClose }: ModalProps) {
    if (!isOpen || !link) return null;

    const { guardian, status } = link;
    const isVerified = status === 'ACTIVE';

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" 
            onClick={onClose}
            style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
            <div 
                className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl" 
                onClick={e => e.stopPropagation()}
                style={{ animation: 'slideUp 0.2s ease-out' }}
            >
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="w-24 h-24 mx-auto bg-white rounded-full p-1 shadow-lg mb-3">
                        {guardian.avatar ? (
                            <img 
                                src={getMediaUrl(guardian.avatar)} 
                                className="w-full h-full rounded-full object-cover"
                                alt="Avatar" 
                            />
                        ) : (
                            <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-2xl">
                                {guardian.first_name?.[0] || ''}{guardian.last_name?.[0] || ''}
                            </div>
                        )}
                    </div>
                    <h2 className="text-xl font-bold">{guardian.first_name} {guardian.last_name}</h2>
                    <p className="text-blue-100 text-sm capitalize">{link.relationship_type.toLowerCase()}</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {!isVerified && (
                        <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm flex gap-2 items-start">
                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>Contact details are hidden until the guardian accepts your request and verifies their account.</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <InfoRow label="Email" value={guardian.email} />
                        
                        {/* Conditional Rendering based on Verification */}
                        {isVerified ? (
                            <>
                                <InfoRow label="Phone" value={guardian.phone_number || 'Not provided'} />
                                {/* Add Address here if it exists in your model */}
                            </>
                        ) : (
                            <div className="opacity-50 grayscale blur-[2px] select-none" aria-hidden="true">
                                <InfoRow label="Phone" value="+46 70 123 45 67" />
                            </div>
                        )}
                        
                        <InfoRow 
                            label="Primary Guardian" 
                            value={link.is_primary_guardian ? 'Yes' : 'No'} 
                        />
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

const InfoRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between border-b border-gray-100 pb-2 last:border-0">
        <span className="text-gray-500 text-sm">{label}</span>
        <span className="text-gray-900 font-medium text-sm">{value}</span>
    </div>
);

