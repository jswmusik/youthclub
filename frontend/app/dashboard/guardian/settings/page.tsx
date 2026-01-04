'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import GuardianNavBar from '@/app/components/guardian/GuardianNavBar';
import GuardianSidebar from '@/app/components/guardian/GuardianSidebar';
import ProfileEditForm from '@/app/components/profile/ProfileEditForm';
import TwoFactorSettings from '@/app/components/TwoFactorSettings';
import { X, Settings, ShieldCheck } from 'lucide-react';
import Footer from '@/app/components/Footer';

// Minimum skeleton display time (in ms) for better UX
const MIN_LOADING_TIME = 400;

export default function GuardianSettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const t = useTranslations('profile');
    const tSidebar = useTranslations('sidebar');
    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [minLoadingComplete, setMinLoadingComplete] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    
    const darkMode = !mounted || theme === 'dark';

    // Minimum loading time for skeleton display
    useEffect(() => {
        const timer = setTimeout(() => {
            setMinLoadingComplete(true);
        }, MIN_LOADING_TIME);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        
        if (user && user.role !== 'GUARDIAN') {
            router.push('/dashboard/youth');
            return;
        }

        const fetchProfile = async () => {
            try {
                const res = await api.get('/auth/users/me/');
                setProfileData(res.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchProfile();
    }, [user, authLoading, router]);

    // Show skeleton while loading (with minimum display time)
    const showSkeleton = authLoading || loading || !minLoadingComplete;

    if (!showSkeleton && !profileData) return null;

    return (
        <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
            <div className="flex-1">
                <GuardianNavBar 
                    onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                    darkMode={darkMode}
                />
                
                {/* Mobile Sidebar Overlay */}
                <div 
                    className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
                        isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                />
                
                {/* Mobile Sidebar */}
                <aside 
                    className={`fixed top-0 left-0 h-screen w-64 z-50 transform transition-transform duration-300 md:hidden ${
                        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } ${darkMode ? 'bg-[var(--dark-800)]' : 'bg-white'}`}
                >
                    <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/10'}`}>
                        <h1 className="text-xl font-bold text-[var(--brand-primary)]">{tSidebar('menu')}</h1>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg ${darkMode ? 'text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)]' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
                        <GuardianSidebar />
                    </div>
                </aside>
                
                {/* Main Layout */}
                <div className="pt-14 sm:pt-16">
                    <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 relative">
                        {/* Desktop Sidebar */}
                        <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
                            <GuardianSidebar />
                        </aside>
                        
                        {/* Content wrapper with left margin for sidebar */}
                        <div className="md:ml-60">
                            <main className="flex-1 min-w-0 px-0 py-2 sm:p-4 md:p-6 pb-24 md:pb-6">
                                {showSkeleton ? (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--brand-primary)]"></div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Header Section */}
                                        <div className="mb-4 sm:mb-6 px-4 sm:px-0">
                                            <div className="flex items-center gap-2 sm:gap-3 mb-1">
                                                <Settings className={`w-6 h-6 sm:w-7 sm:h-7 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`} />
                                                <h1 className={`text-2xl sm:text-3xl md:text-4xl font-heading font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                                                    {tSidebar('settings')}
                                                </h1>
                                            </div>
                                            <p className={`text-sm pl-9 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                                                {t('updateContactInfo') || 'Update your contact information and profile details.'}
                                            </p>
                                        </div>

                                        {/* Settings Form Card */}
                                        <div className={`rounded-none sm:rounded-2xl border-y sm:border p-4 sm:p-6 ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15 shadow-sm'}`}>
                                            <ProfileEditForm 
                                                user={profileData} 
                                                darkMode={darkMode}
                                            />
                                        </div>

                                        {/* 2FA Settings Section */}
                                        <div className="mt-6 px-4 sm:px-0">
                                            <div className="flex items-center gap-2 sm:gap-3 mb-1">
                                                <ShieldCheck className={`w-6 h-6 sm:w-7 sm:h-7 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`} />
                                                <h2 className={`text-xl sm:text-2xl font-heading font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                                                    {t('security') || 'Security'}
                                                </h2>
                                            </div>
                                            <p className={`text-sm pl-9 mb-4 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                                                {t('securityDesc') || 'Manage your account security settings.'}
                                            </p>
                                        </div>
                                        <div className={`rounded-none sm:rounded-2xl border-y sm:border p-4 sm:p-6 ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15 shadow-sm'}`}>
                                            <TwoFactorSettings darkMode={darkMode} />
                                        </div>
                                    </>
                                )}
                            </main>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <Footer />
        </div>
    );
}
