'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import GuardianNavBar from '@/app/components/guardian/GuardianNavBar';
import GuardianSidebar from '@/app/components/guardian/GuardianSidebar';
import Footer from '@/app/components/Footer';
import api from '@/lib/api';
import { getMediaUrl } from '@/app/utils';
import { useAuth } from '@/context/AuthContext';
import { stripHtml } from '@/lib/sanitize';
import { 
    Search, 
    MapPin, 
    Navigation, 
    Heart, 
    X, 
    Building2,
    Users,
    ChevronDown
} from 'lucide-react';

// Minimum skeleton display time (in ms) for better UX
const MIN_LOADING_TIME = 400;

interface Club {
    id: number;
    name: string;
    municipality_name: string;
    avatar: string | null;
    hero_image: string | null;
    description: string;
    members_count?: number;
}

interface Municipality {
    id: number;
    name: string;
}

// Skeleton component for loading state
function ClubsPageSkeleton({ darkMode = true }: { darkMode?: boolean }) {
    return (
        <div className="animate-pulse">
            {/* Header Skeleton */}
            <div className="mb-6 px-4 sm:px-0 pt-4 sm:pt-0">
                <div className="flex items-center gap-3 mb-1">
                    <div className={`w-7 h-7 rounded ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`} />
                    <div className={`h-8 w-48 rounded ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`} />
                </div>
                <div className={`h-4 w-64 rounded mt-2 ml-10 ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`} />
            </div>
            
            {/* Filters Skeleton */}
            <div className={`rounded-none sm:rounded-2xl border-y sm:border p-4 mb-6 ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15 shadow-sm'}`}>
                <div className={`h-12 rounded-xl mb-4 ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`} />
                <div className="flex gap-2 flex-wrap">
                    <div className={`h-10 w-32 rounded-xl ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`} />
                    <div className={`h-10 w-24 rounded-xl ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`} />
                    <div className={`h-10 w-20 rounded-xl ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`} />
                </div>
            </div>
            
            {/* Cards Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15 shadow-sm'}`}>
                        <div className={`h-32 ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`} />
                        <div className="p-4 pt-8">
                            <div className={`h-5 w-3/4 rounded mb-2 ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`} />
                            <div className={`h-4 w-1/2 rounded mb-4 ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`} />
                            <div className={`h-4 w-full rounded mb-2 ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`} />
                            <div className={`h-4 w-2/3 rounded mb-4 ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`} />
                            <div className="flex gap-2 mt-4">
                                <div className={`flex-1 h-10 rounded-xl ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`} />
                                <div className={`w-10 h-10 rounded-xl ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function GuardianClubSearchPage() {
    const { user, refreshUser } = useAuth();
    const t = useTranslations('clubSearch');
    const tNav = useTranslations('nav');
    const router = useRouter();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [minLoadingComplete, setMinLoadingComplete] = useState(false);

    // Data
    const [clubs, setClubs] = useState<Club[]>([]);
    const [municipalities, setMunicipalities] = useState<Municipality[]>([]);

    // Filters
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMuni, setSelectedMuni] = useState('');
    const [useLocation, setUseLocation] = useState(false);
    const [locationError, setLocationError] = useState('');

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

    // Fetch initial data
    useEffect(() => {
        const init = async () => {
            try {
                const muniRes = await api.get('/municipalities/');
                setMunicipalities(muniRes.data.results || muniRes.data);
                await fetchClubs();
            } catch (err) {
                console.error("Failed to load initial data", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    // Fetch clubs based on filters
    const fetchClubs = async (lat?: number, lng?: number) => {
        setLocationError('');
        try {
            const params: Record<string, string | number> = {};
            if (searchQuery) params.search = searchQuery;
            if (selectedMuni) params.municipality = selectedMuni;
            if (lat && lng) {
                params.lat = lat;
                params.lng = lng;
            }

            const res = await api.get('/clubs/', { params });
            setClubs(res.data.results || res.data);
        } catch (error) {
            console.error("Failed to fetch clubs", error);
        }
    };

    // Search handler
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
        setLoading(true);
        
        if (useLocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    fetchClubs(pos.coords.latitude, pos.coords.longitude).then(() => setLoading(false));
                },
                () => {
                    setLocationError(t('locationDenied'));
                    fetchClubs().then(() => setLoading(false));
                }
            );
        } else {
            fetchClubs().then(() => setLoading(false));
        }
    };

    // Effect to refetch when filters change
    useEffect(() => {
        if (!loading) {
            setLoading(true);
            if (useLocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        fetchClubs(pos.coords.latitude, pos.coords.longitude).then(() => setLoading(false));
                    },
                    () => {
                        fetchClubs().then(() => setLoading(false));
                    }
                );
            } else {
                fetchClubs().then(() => setLoading(false));
            }
        }
    }, [selectedMuni, searchQuery]);

    // Location toggle handler
    const toggleLocation = () => {
        if (!useLocation) {
            setUseLocation(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLoading(true);
                    fetchClubs(pos.coords.latitude, pos.coords.longitude).then(() => setLoading(false));
                },
                () => {
                    setLocationError(t('locationDenied'));
                    setUseLocation(false);
                }
            );
        } else {
            setUseLocation(false);
            setLoading(true);
            fetchClubs().then(() => setLoading(false));
        }
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchInput('');
        setSearchQuery('');
        setSelectedMuni('');
        setUseLocation(false);
        setLoading(true);
        fetchClubs().then(() => setLoading(false));
    };

    // Check if already following
    const isFollowing = (clubId: number) => {
        return user?.followed_clubs_ids?.includes(clubId);
    };

    // Follow club handler
    const handleFollow = async (clubId: number) => {
        try {
            await api.post(`/clubs/${clubId}/follow/`);
            await refreshUser();
        } catch (error) {
            console.error('Failed to follow club', error);
        }
    };

    const hasActiveFilters = searchQuery !== '' || selectedMuni !== '' || useLocation;
    const showSkeleton = loading || !minLoadingComplete;

    return (
        <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
            <div className="flex-1">
                <GuardianNavBar 
                    darkMode={darkMode} 
                    onMenuToggle={() => setIsSidebarOpen(true)}
                />

                {/* Mobile Sidebar Overlay */}
                <div 
                    className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
                        isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                />

                {/* Mobile Sidebar */}
                <aside 
                    className={`fixed top-0 left-0 h-screen w-64 z-50 border-r transform transition-transform duration-300 md:hidden ${
                        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/10'}`}
                >
                    <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/10'}`}>
                        <h1 className={`text-xl font-bold font-heading ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{tNav('menu')}</h1>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg ${darkMode ? 'text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)] hover:text-[var(--brand-light)]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
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

                        {/* Content wrapper */}
                        <div className="md:ml-60">
                            <main className="p-0 sm:p-4 md:p-6 pb-24 md:pb-6">
                                {showSkeleton ? (
                                    <ClubsPageSkeleton darkMode={darkMode} />
                                ) : (
                                    <>
                                        {/* Header */}
                                        <div className="mb-6 px-4 sm:px-0 pt-4 sm:pt-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <Building2 className={`w-6 h-6 sm:w-7 sm:h-7 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`} />
                                                <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold font-heading ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                                                    {t('title')}
                                                </h1>
                                            </div>
                                            <p className={`pl-9 sm:pl-10 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                                                {t('subtitle')}
                                            </p>
                                        </div>

                                        {/* Filters Section */}
                                        <div className={`rounded-none sm:rounded-2xl border-y sm:border p-4 mb-6 ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15 shadow-sm'}`}>
                                            {/* Search Bar */}
                                            <form onSubmit={handleSearch}>
                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    {/* Search Input */}
                                                    <div className="relative flex-1">
                                                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`} />
                                                        <input
                                                            type="text"
                                                            placeholder={t('searchPlaceholder')}
                                                            value={searchInput}
                                                            onChange={(e) => setSearchInput(e.target.value)}
                                                            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 outline-none transition-all ${
                                                                darkMode 
                                                                    ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]'
                                                                    : 'bg-white border-[#4D4DA4]/15 text-gray-800 placeholder-gray-400 focus:ring-[#4D4DA4]/30 focus:border-[#4D4DA4]'
                                                            }`}
                                                        />
                                                        {searchInput && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSearchInput('');
                                                                    if (searchQuery) {
                                                                        setSearchQuery('');
                                                                    }
                                                                }}
                                                                className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]' : 'text-gray-400 hover:text-gray-600'}`}
                                                            >
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Municipality Dropdown */}
                                                    <div className="relative sm:w-56">
                                                        <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`} />
                                                        <select
                                                            value={selectedMuni}
                                                            onChange={(e) => setSelectedMuni(e.target.value)}
                                                            className={`w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-2 outline-none transition-all appearance-none cursor-pointer ${
                                                                darkMode 
                                                                    ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]'
                                                                    : 'bg-white border-[#4D4DA4]/15 text-gray-800 focus:ring-[#4D4DA4]/30 focus:border-[#4D4DA4]'
                                                            }`}
                                                        >
                                                            <option value="">{t('allMunicipalities')}</option>
                                                            {municipalities.map((muni) => (
                                                                <option key={muni.id} value={String(muni.id)}>
                                                                    {muni.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`} />
                                                    </div>

                                                    {/* Location Toggle */}
                                                    <button
                                                        type="button"
                                                        onClick={toggleLocation}
                                                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                                                            useLocation
                                                                ? 'bg-[var(--brand-primary)]/20 border-[var(--brand-primary)]/50 text-[var(--brand-primary)]'
                                                                : darkMode 
                                                                    ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)]'
                                                                    : 'bg-white border-[#4D4DA4]/15 text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <Navigation className={`w-5 h-5 ${useLocation ? 'fill-current' : ''}`} />
                                                        <span className="hidden sm:inline">{t('nearMe')}</span>
                                                    </button>

                                                    {/* Search Button */}
                                                    <button
                                                        type="submit"
                                                        className="px-6 py-3 bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all active:scale-95"
                                                    >
                                                        {t('search')}
                                                    </button>
                                                </div>
                                            </form>

                                            {locationError && (
                                                <p className="text-xs text-[var(--brand-red)] mt-3">{locationError}</p>
                                            )}

                                            {/* Active Filters Display */}
                                            {hasActiveFilters && (
                                                <div className={`mt-4 pt-4 border-t flex flex-wrap items-center gap-2 ${darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/15'}`}>
                                                    <span className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>{t('filters')}:</span>
                                                    
                                                    {searchQuery && (
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm ${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]' : 'bg-[#EBEBFE] border-[#4D4DA4]/15 text-gray-700'}`}>
                                                            <Search className="w-3.5 h-3.5" />
                                                            "{searchQuery}"
                                                            <button
                                                                onClick={() => {
                                                                    setSearchInput('');
                                                                    setSearchQuery('');
                                                                }}
                                                                className={`ml-1 ${darkMode ? 'text-[var(--brand-light)]/50 hover:text-[var(--brand-light)]' : 'text-gray-400 hover:text-gray-600'}`}
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </span>
                                                    )}
                                                    
                                                    {selectedMuni && (
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm ${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]' : 'bg-[#EBEBFE] border-[#4D4DA4]/15 text-gray-700'}`}>
                                                            <MapPin className="w-3.5 h-3.5" />
                                                            {municipalities.find(m => String(m.id) === selectedMuni)?.name}
                                                            <button
                                                                onClick={() => setSelectedMuni('')}
                                                                className={`ml-1 ${darkMode ? 'text-[var(--brand-light)]/50 hover:text-[var(--brand-light)]' : 'text-gray-400 hover:text-gray-600'}`}
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </span>
                                                    )}
                                                    
                                                    {useLocation && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/30 rounded-lg text-sm text-[var(--brand-primary)]">
                                                            <Navigation className="w-3.5 h-3.5 fill-current" />
                                                            {t('nearMe')}
                                                            <button
                                                                onClick={() => {
                                                                    setUseLocation(false);
                                                                    fetchClubs();
                                                                }}
                                                                className="ml-1 text-[var(--brand-primary)]/70 hover:text-[var(--brand-primary)]"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </span>
                                                    )}
                                                    
                                                    <button
                                                        onClick={clearFilters}
                                                        className={`text-sm font-medium ml-auto ${darkMode ? 'text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80' : 'text-[#4D4DA4] hover:text-[#3D3D8A]'}`}
                                                    >
                                                        {t('clearAllFilters')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Results Grid */}
                                        {clubs.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                                                {clubs.map((club) => {
                                                    const heroImageUrl = club.hero_image ? getMediaUrl(club.hero_image) : null;
                                                    const avatarUrl = club.avatar ? getMediaUrl(club.avatar) : null;
                                                    const following = isFollowing(club.id);

                                                    return (
                                                        <div
                                                            key={club.id}
                                                            className={`rounded-2xl border overflow-hidden group transition-all ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)] hover:border-[var(--brand-primary)]/30' : 'bg-white border-[#4D4DA4]/15 hover:border-[#4D4DA4]/30 shadow-sm'}`}
                                                        >
                                                            {/* Cover Image */}
                                                            <div className={`h-32 relative ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`}>
                                                                {heroImageUrl ? (
                                                                    <img
                                                                        src={heroImageUrl}
                                                                        className="w-full h-full object-cover"
                                                                        alt={club.name}
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)]" />
                                                                )}
                                                                {/* Avatar */}
                                                                <div className={`absolute -bottom-6 left-4 border-4 rounded-2xl overflow-hidden ${darkMode ? 'border-[var(--dark-800)] bg-[var(--dark-700)]' : 'border-white bg-[#EBEBFE]'}`}>
                                                                    {avatarUrl ? (
                                                                        <img
                                                                            src={avatarUrl}
                                                                            className="w-12 h-12 object-cover"
                                                                            alt=""
                                                                        />
                                                                    ) : (
                                                                        <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)]">
                                                                            <Building2 className="w-6 h-6 text-white" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Content */}
                                                            <div className="p-4 pt-8 flex flex-col">
                                                                <h3 className={`font-bold text-lg transition-colors mb-1 line-clamp-1 ${darkMode ? 'text-[var(--brand-light)] group-hover:text-[var(--brand-primary)]' : 'text-gray-900 group-hover:text-[#4D4DA4]'}`}>
                                                                    {club.name}
                                                                </h3>
                                                                <p className={`text-xs flex items-center gap-1 mb-3 ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                                                                    <MapPin className="w-3 h-3" />
                                                                    {club.municipality_name || 'Municipality'}
                                                                    {club.members_count !== undefined && (
                                                                        <>
                                                                            <span className="mx-1">•</span>
                                                                            <Users className="w-3 h-3" />
                                                                            {club.members_count} {t('members')}
                                                                        </>
                                                                    )}
                                                                </p>

                                                                <p className={`text-sm line-clamp-2 mb-4 flex-1 min-h-[2.5rem] ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'}`}>
                                                                    {club.description ? stripHtml(club.description) : 'No description available.'}
                                                                </p>

                                                                <div className="flex gap-2 mt-auto">
                                                                    <button
                                                                        onClick={() => router.push(`/dashboard/guardian/club/${club.id}`)}
                                                                        className={`flex-1 py-2.5 text-center text-sm font-medium border rounded-xl transition-all ${
                                                                            darkMode 
                                                                                ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] hover:bg-[var(--dark-600)] hover:border-[var(--brand-primary)]/30'
                                                                                : 'bg-[#EBEBFE] border-[#4D4DA4]/15 text-gray-700 hover:bg-[#4D4DA4]/20 hover:border-[#4D4DA4]/30'
                                                                        }`}
                                                                    >
                                                                        {t('viewProfile')}
                                                                    </button>

                                                                    {following ? (
                                                                        <div className="flex items-center justify-center w-11 bg-[var(--brand-pink)]/20 text-[var(--brand-pink)] rounded-xl border border-[var(--brand-pink)]/30">
                                                                            <Heart className="w-5 h-5 fill-current" />
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleFollow(club.id)}
                                                                            className={`flex items-center justify-center w-11 border rounded-xl hover:bg-[var(--brand-pink)]/20 hover:text-[var(--brand-pink)] hover:border-[var(--brand-pink)]/30 transition-all ${
                                                                                darkMode 
                                                                                    ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)]/50'
                                                                                    : 'bg-[#EBEBFE] border-[#4D4DA4]/15 text-gray-400'
                                                                            }`}
                                                                        >
                                                                            <Heart className="w-5 h-5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            /* Empty State */
                                            <div className={`text-center py-20 rounded-none sm:rounded-xl border-y sm:border ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15 shadow-sm'}`}>
                                                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`}>
                                                    <Building2 className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-[#4D4DA4]/40'}`} />
                                                </div>
                                                <p className={`text-lg ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{t('noResults')}</p>
                                                <p className={`text-sm mt-1 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`}>{t('noResultsDescription')}</p>
                                                {hasActiveFilters && (
                                                    <button
                                                        onClick={clearFilters}
                                                        className={`mt-4 hover:underline ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`}
                                                    >
                                                        {t('clearAllFilters')}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </main>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <Footer homeLink="/dashboard/guardian" />
        </div>
    );
}
