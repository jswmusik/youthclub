import { GuardianLink } from '@/types/user';
import { getMediaUrl } from '@/app/utils';
import { useTranslations } from 'next-intl';

import { X, Mail, Phone, Shield, AlertCircle, CheckCircle } from 'lucide-react';


interface ModalProps {
    link: GuardianLink | null;
    isOpen: boolean;
    onClose: () => void;
    darkMode?: boolean;
}

export default function GuardianDetailModal({ link, isOpen, onClose, darkMode = false }: ModalProps) {
    if (!isOpen || !link) return null;

    const t = useTranslations('guardians');
    const { guardian, status } = link;
    const isVerified = status === 'ACTIVE';
    
    const getRelationshipLabel = (type: string) => {
        const typeLower = type.toLowerCase();
        if (typeLower === 'guardian') return t('relationshipTypes.guardian');
        if (typeLower === 'parent') return t('relationshipTypes.parent');
        return t('relationshipTypes.other');
    };

    return (
        <div 
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${
                darkMode ? 'bg-black/70' : 'bg-black/50'
            }`}
            onClick={onClose}
            style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
            <div 
                className={`w-full max-w-md overflow-hidden ${
                    darkMode 
                        ? 'bg-[var(--dark-800)] rounded-xl border border-[var(--dark-500)]' 
                        : 'bg-white rounded-3xl shadow-2xl'
                }`}
                onClick={e => e.stopPropagation()}
                style={{ animation: 'slideUp 0.2s ease-out' }}
            >
                
                {/* Header */}
                <div className={`p-8 text-center relative ${
                    darkMode 
                        ? 'bg-gradient-to-br from-[var(--brand-secondary)] via-[var(--brand-purple)] to-[var(--brand-primary)]' 
                        : 'bg-gradient-to-br from-[#4D4DA4] via-[#6D6DD4] to-[#FF5485]'
                }`}>
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-2"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className={`w-28 h-28 mx-auto rounded-2xl p-1.5 mb-4 ${
                        darkMode ? 'bg-[var(--dark-800)]' : 'bg-white shadow-xl'
                    }`}>
                        {guardian.avatar ? (
                            <img 
                                src={getMediaUrl(guardian.avatar)} 
                                className="w-full h-full rounded-xl object-cover"
                                alt="Avatar" 
                            />
                        ) : (
                            <div className={`w-full h-full rounded-xl flex items-center justify-center font-bold text-3xl ${
                                darkMode 
                                    ? 'bg-[var(--dark-600)] text-[var(--brand-purple)]' 
                                    : 'bg-gradient-to-br from-[#4D4DA4]/10 to-[#FF5485]/10 text-[#4D4DA4]'
                            }`}>
                                {guardian.first_name?.[0] || ''}{guardian.last_name?.[0] || ''}
                            </div>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold mb-1 font-heading text-white">{guardian.first_name} {guardian.last_name}</h2>
                    <p className="text-white/90 text-sm font-semibold capitalize flex items-center justify-center gap-1.5">
                        <Shield className="w-4 h-4" />
                        {getRelationshipLabel(link.relationship_type)}
                    </p>
                </div>

                {/* Content */}
                <div className={`p-6 space-y-5 ${darkMode ? 'bg-[var(--dark-800)]' : ''}`}>
                    {!isVerified && (
                        <div className={`p-4 rounded-xl text-sm flex gap-3 items-start ${
                            darkMode 
                                ? 'bg-[var(--brand-peach)]/10 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30' 
                                : 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="font-medium">{t('contactDetailsHidden')}</p>
                        </div>
                    )}

                    {isVerified && (
                        <div className={`p-4 rounded-xl text-sm flex gap-3 items-center ${
                            darkMode 
                                ? 'bg-[var(--brand-third)]/10 text-[var(--brand-third)] border border-[var(--brand-third)]/30' 
                                : 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                            <CheckCircle className="w-5 h-5 shrink-0" />
                            <p className="font-bold">{t('verifiedGuardian')}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <InfoRow 
                            icon={<Mail className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'}`} />} 
                            label={t('email')} 
                            value={guardian.email} 
                            darkMode={darkMode}
                        />
                        
                        {/* Conditional Rendering based on Verification */}
                        {isVerified ? (
                            <>
                                <InfoRow 
                                    icon={<Phone className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'}`} />} 
                                    label={t('phone')} 
                                    value={guardian.phone_number || t('notProvided')} 
                                    darkMode={darkMode}
                                />
                            </>
                        ) : (
                            <div className="opacity-50 grayscale blur-[2px] select-none" aria-hidden="true">
                                <InfoRow icon={<Phone className="w-5 h-5" />} label={t('phone')} value="+46 70 123 45 67" darkMode={darkMode} />
                            </div>
                        )}
                        
                        <InfoRow 
                            icon={<Shield className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-third)]' : 'text-emerald-500'}`} />}
                            label={t('primaryGuardian')} 
                            value={link.is_primary_guardian ? t('yes') : t('no')} 
                            darkMode={darkMode}
                        />
                    </div>
                </div>

                <div className={`p-6 border-t flex justify-end gap-2 ${
                    darkMode 
                        ? 'border-[var(--dark-500)] bg-[var(--dark-700)]' 
                        : 'border-gray-100 bg-gradient-to-br from-gray-50 to-white'
                }`}>
                    <button 
                        onClick={onClose} 
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${
                            darkMode 
                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/80' 
                                : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white hover:from-[#3D3D94] hover:to-[#5D5DC4] shadow-md shadow-[#4D4DA4]/20'
                        }`}
                    >
                        {t('close')}
                    </button>
                </div>
            </div>
        </div>
    );
}

const InfoRow = ({ icon, label, value, darkMode = false }: { icon: React.ReactNode, label: string, value: string, darkMode?: boolean }) => (
    <div className={`flex items-center justify-between p-4 rounded-xl ${
        darkMode 
            ? 'bg-[var(--dark-700)] border border-[var(--dark-500)]' 
            : 'bg-gradient-to-r from-gray-50 to-white border border-gray-100'
    }`}>
        <div className="flex items-center gap-3">
            {icon}
            <span className={`text-sm font-semibold ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{label}</span>
        </div>
        <span className={`font-bold text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{value}</span>
    </div>
);

