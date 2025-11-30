'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMyGuardians, removeGuardianLink } from '@/lib/api';
import { GuardianLink } from '@/types/user';
import GuardianCard from './GuardianCard';
import GuardianDetailModal from './GuardianDetailModal';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import Toast from '@/app/components/Toast';

export default function YouthGuardianManager() {
    const router = useRouter();
    const [links, setLinks] = useState<GuardianLink[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal States
    const [selectedLink, setSelectedLink] = useState<GuardianLink | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    
    // Delete States
    const [linkToDelete, setLinkToDelete] = useState<GuardianLink | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({ 
        message: '', 
        type: 'success', 
        isVisible: false 
    });

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
            setToast({ 
                message: err.response?.data?.detail || err.response?.data?.error || 'Failed to load guardians', 
                type: 'error', 
                isVisible: true 
            });
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
            setToast({ message: 'Guardian removed', type: 'success', isVisible: true });
            setLinkToDelete(null);
        } catch (err) {
            setToast({ message: 'Failed to remove guardian', type: 'error', isVisible: true });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div>
            {/* Header / Add Button */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Guardians</h1>
                    <p className="text-gray-500 text-sm">Manage who has access to your account</p>
                </div>
                <button 
                    onClick={() => router.push('/dashboard/youth/guardians/create')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">Add Guardian</span>
                    <span className="sm:hidden">Add</span>
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12 text-gray-400">Loading guardians...</div>
            ) : links.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No guardians yet</h3>
                    <p className="text-gray-500 mb-6">Add a parent or guardian to stay connected.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {links.map(link => (
                        <GuardianCard 
                            key={link.id} 
                            link={link} 
                            onView={(l) => { setSelectedLink(l); setIsDetailOpen(true); }}
                            onRemove={(l) => setLinkToDelete(l)}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            <GuardianDetailModal 
                link={selectedLink} 
                isOpen={isDetailOpen} 
                onClose={() => setIsDetailOpen(false)} 
            />

            <ConfirmationModal
                isVisible={!!linkToDelete}
                onClose={() => {
                    if (!isDeleting) {
                        setLinkToDelete(null);
                    }
                }}
                onConfirm={handleDelete}
                title="Remove Guardian"
                message={linkToDelete ? `Are you sure you want to remove ${linkToDelete.guardian.first_name} ${linkToDelete.guardian.last_name} as your guardian?` : 'Are you sure you want to remove this guardian?'}
                confirmButtonText="Remove"
                cancelButtonText="Cancel"
                isLoading={isDeleting}
                variant="danger"
            />

            <Toast 
                message={toast.message} 
                type={toast.type} 
                isVisible={toast.isVisible} 
                onClose={() => setToast({ ...toast, isVisible: false })} 
            />
        </div>
    );
}

