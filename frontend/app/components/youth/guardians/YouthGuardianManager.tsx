'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { fetchMyGuardians, removeGuardianLink } from '@/lib/api';
import { GuardianLink } from '@/types/user';
import GuardianCard from './GuardianCard';
import GuardianDetailModal from './GuardianDetailModal';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { useToast } from '../../../../hooks/useToast';
import { Users } from 'lucide-react';

export default function YouthGuardianManager({ darkMode = false }: { darkMode?: boolean } = {}) {
    const router = useRouter();
    const t = useTranslations('guardians');
    const [links, setLinks] = useState<GuardianLink[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal States
    const [selectedLink, setSelectedLink] = useState<GuardianLink | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    
    // Delete States
    const [linkToDelete, setLinkToDelete] = useState<GuardianLink | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Toast
    const { success, error, info, warning } = useToast();

    useEffect(() => {
        loadGuardians();
    }, []);

    const loadGuardians = async () => {
        try {
            setLoading(true);
            const res = await fetchMyGuardians();
            console.log('Full API response:', res);
            
            // Handle different response structures
            let rawData = res.data;
            if (res.data?.results) {
                rawData = res.data.results; // Paginated response
            } else if (Array.isArray(res.data)) {
                rawData = res.data; // Direct array
            } else {
                rawData = [];
            }
            
            console.log('Raw guardian data from API:', rawData);
            
            // Transform backend flat structure to frontend nested structure
            const transformedLinks: GuardianLink[] = Array.isArray(rawData) ? rawData.map((item: any) => {
                // Handle both flat structure (from GuardianYouthLinkSerializer) and nested structure
                const guardianId = item.guardian?.id || item.guardian || item.guardian_id;
                const guardianEmail = item.guardian?.email || item.guardian_email || '';
                const guardianFirstName = item.guardian?.first_name || item.guardian_first_name || '';
                const guardianLastName = item.guardian?.last_name || item.guardian_last_name || '';
                const guardianPhone = item.guardian?.phone_number || item.guardian_phone || null;
                const guardianAvatar = item.guardian?.avatar || item.guardian_avatar || null;
                
                const transformed = {
                    id: item.id,
                    guardian: {
                        id: guardianId,
                        email: guardianEmail,
                        first_name: guardianFirstName,
                        last_name: guardianLastName,
                        phone_number: guardianPhone,
                        avatar: guardianAvatar,
                    },
                    relationship_type: item.relationship_type || 'GUARDIAN',
                    is_primary_guardian: item.is_primary_guardian || false,
                    status: item.status || 'PENDING',
                    created_at: item.created_at || new Date().toISOString(),
                };
                
                console.log('Transformed item:', transformed);
                return transformed;
            }) : [];
            
            console.log('Final transformed links:', transformedLinks);
            setLinks(transformedLinks);
        } catch (err: any) {
            console.error('Error loading guardians:', err);
            console.error('Error response:', err.response?.data);
            error(err.response?.data?.detail || err.response?.data?.error || t('failedToLoadGuardians'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!linkToDelete) return;
        setIsDeleting(true);
        try {
            await removeGuardianLink(linkToDelete.id);
            setLinks(prev => prev.filter(l => l.id !== linkToDelete.id));
            success(t('guardianRemoved'));
            setLinkToDelete(null);
        } catch (err) {
            error(t('failedToRemoveGuardian'));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div>
            {/* Header / Add Button */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h1 className={`text-3xl font-bold flex items-center gap-3 mb-2 font-heading ${
                        darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
                    }`}>
                        <Users className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-primary)]'}`} />
                        {t('myGuardians')}
                    </h1>
                    <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{t('manageAccess')}</p>
                </div>
                <button 
                    onClick={() => router.push('/dashboard/youth/guardians/create')}
                    className={`px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        darkMode 
                            ? 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 text-[var(--dark-900)]' 
                            : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] hover:from-[#3D3D94] hover:to-[#5D5DC4] text-white shadow-lg shadow-[#4D4DA4]/30'
                    }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">{t('addGuardian')}</span>
                    <span className="sm:hidden">{t('add')}</span>
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12">
                    <div className={`inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4 ${
                        darkMode ? 'border-[var(--brand-primary)]' : 'border-[#4D4DA4]'
                    }`}></div>
                    <p className={darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}>{t('loadingGuardians')}</p>
                </div>
            ) : links.length === 0 ? (
                <div className={`text-center py-16 rounded-none sm:rounded-2xl border-2 border-dashed ${
                    darkMode 
                        ? 'bg-[var(--dark-800)] border-[var(--dark-400)]' 
                        : 'bg-gradient-to-br from-white to-[#EBEBFE]/30 border-[#4D4DA4]/30'
                }`}>
                    <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                        darkMode 
                            ? 'bg-[var(--dark-600)] border border-[var(--dark-400)]' 
                            : 'bg-gradient-to-br from-[#4D4DA4]/10 to-[var(--brand-primary)]/10'
                    }`}>
                        <Users className={`w-10 h-10 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'}`} />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 font-heading ${
                        darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
                    }`}>{t('noGuardiansYet')}</h3>
                    <p className={`mb-6 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{t('addParentOrGuardian')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {links.map(link => (
                        <GuardianCard 
                            key={link.id} 
                            link={link} 
                            onView={(l) => { setSelectedLink(l); setIsDetailOpen(true); }}
                            onRemove={(l) => setLinkToDelete(l)}
                            darkMode={darkMode}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            <GuardianDetailModal 
                link={selectedLink} 
                isOpen={isDetailOpen} 
                onClose={() => setIsDetailOpen(false)}
                darkMode={darkMode}
            />

            <ConfirmationModal
                isVisible={!!linkToDelete}
                onClose={() => {
                    if (!isDeleting) {
                        setLinkToDelete(null);
                    }
                }}
                onConfirm={handleDelete}
                title={t('removeGuardian')}
                message={linkToDelete ? `${t('removeGuardianConfirm')} ${linkToDelete.guardian.first_name} ${linkToDelete.guardian.last_name} ${t('removeGuardianConfirmSuffix')}` : t('removeGuardianConfirmGeneric')}
                confirmButtonText={t('remove')}
                cancelButtonText={t('cancel')}
                isLoading={isDeleting}
                variant="danger"
                darkMode={darkMode}
            />

            </div>
    );
}

