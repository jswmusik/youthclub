'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import api from '@/lib/api';
import { getMediaUrl } from '@/app/utils';
import { sanitizeAndStripColors } from '@/lib/sanitize';
import { Event } from '@/types/event';
import { 
    MapPin, Calendar, Clock, FileText, ChevronLeft, ChevronRight, 
    CheckCircle, ArrowLeft, XCircle, AlertCircle, UserPlus, Gift,
    Users, Share2, Heart, Sparkles, Timer, Ticket, X
} from 'lucide-react';
import GuardianNavBar from '@/app/components/guardian/GuardianNavBar';
import GuardianSidebar from '@/app/components/guardian/GuardianSidebar';
import { GoogleMap, Marker, LoadScript } from '@react-google-maps/api';
import { useToast } from '../../../../../hooks/useToast';
import { useAuth } from '@/context/AuthContext';

// Countdown Timer Component
function CountdownTimer({ targetDate, darkMode = false }: { targetDate: string; darkMode?: boolean }) {
    const t = useTranslations('events');
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = new Date(targetDate).getTime() - new Date().getTime();
            
            if (difference <= 0) {
                setIsExpired(true);
                return;
            }

            setTimeLeft({
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / (1000 * 60)) % 60),
                seconds: Math.floor((difference / 1000) % 60)
            });
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    if (isExpired) return null;

    return (
        <div className="flex items-center gap-3">
            {[
                { value: timeLeft.days, label: t('days') },
                { value: timeLeft.hours, label: t('hours') },
                { value: timeLeft.minutes, label: t('min') },
                { value: timeLeft.seconds, label: t('sec') }
            ].map((item, idx) => (
                <div key={idx} className="text-center">
                    <div className={`backdrop-blur-sm rounded-lg px-3 py-2 min-w-[50px] ${
                        darkMode ? 'bg-[var(--dark-600)]' : 'bg-white/20'
                    }`}>
                        <span className={`text-xl font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-white'}`}>
                            {String(item.value).padStart(2, '0')}
                        </span>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider mt-1 block ${
                        darkMode ? 'text-[var(--brand-light)]/70' : 'text-white/70'
                    }`}>{item.label}</span>
                </div>
            ))}
        </div>
    );
}

// Child type
interface Child {
    id: number;
    first_name: string;
    last_name: string;
    avatar?: string;
}

export default function GuardianEventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const t = useTranslations('events');
    const tSidebar = useTranslations('sidebar');
    const { theme } = useTheme();
    const locale = useLocale();
    const [mounted, setMounted] = useState(false);
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [children, setChildren] = useState<Child[]>([]);
    const [childRegistrations, setChildRegistrations] = useState<Record<number, string>>({});
    const [isRegModalOpen, setRegModalOpen] = useState(false);
    const [selectedChild, setSelectedChild] = useState<Child | null>(null);
    const [isCancelModalOpen, setCancelModalOpen] = useState(false);
    const [childToCancel, setChildToCancel] = useState<Child | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { success, error, info, warning } = useToast();
    
    // Gallery State
    const [activeSlide, setActiveSlide] = useState(0);
    
    useEffect(() => {
        setMounted(true);
    }, []);
    
    const darkMode = !mounted || theme === 'dark';

    const fetchEvent = async () => {
        try {
            const res = await api.get(`/events/${params.id}/`);
            setEvent(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchChildren = async () => {
        try {
            // Fetch guardian's linked children
            const res = await api.get('/guardian/children/');
            // The endpoint returns GuardianYouthLink objects with flattened youth data
            // Fields: youth (id), youth_id, youth_first_name, youth_last_name, youth_avatar, etc.
            const links = res.data.results || res.data || [];
            const childrenData = links.map((link: any) => ({
                id: link.youth_id || link.youth,
                first_name: link.youth_first_name || '',
                last_name: link.youth_last_name || '',
                avatar: link.youth_avatar || null,
                email: link.youth_email || '',
                grade: link.youth_grade || null,
            })).filter((child: any) => child.id);
            setChildren(childrenData);
        } catch (err) {
            console.error('Error fetching children:', err);
        }
    };

    const fetchChildRegistrations = async () => {
        if (!params.id) return;
        try {
            // Fetch registrations for this event using query parameter
            const res = await api.get(`/registrations/?event=${params.id}`);
            const registrations = res.data.results || res.data || [];
            
            // Map child IDs to their registration status
            const regMap: Record<number, string> = {};
            registrations.forEach((reg: any) => {
                if (reg.user && reg.status !== 'CANCELLED') {
                    regMap[reg.user.id || reg.user] = reg.status;
                }
            });
            setChildRegistrations(regMap);
        } catch (err) {
            console.error('Error fetching registrations:', err);
        }
    };

    useEffect(() => { 
        if (params.id) {
            fetchEvent(); 
            fetchChildren();
            fetchChildRegistrations();
        }
    }, [params.id]);

    const handleRegisterChild = async (child: Child) => {
        if (!event) return;
        
        setIsRegistering(true);
        try {
            await api.post(`/events/${event.id}/register/`, { child_id: child.id });
            await fetchEvent();
            await fetchChildRegistrations();
            setRegModalOpen(false);
            setSelectedChild(null);
            success(t('childRegistered') || `${child.first_name} has been registered!`);
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.error || t('failedToRegister'));
        } finally {
            setIsRegistering(false);
        }
    };

    const handleCancelRegistration = async () => {
        if (!event || !childToCancel) return;
        
        setIsCancelling(true);
        try {
            await api.post(`/events/${event.id}/cancel/`, { child_id: childToCancel.id });
            await fetchEvent();
            await fetchChildRegistrations();
            setCancelModalOpen(false);
            setChildToCancel(null);
            success(t('registrationCancelled'));
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.error || t('failedToCancelRegistration'));
        } finally {
            setIsCancelling(false);
        }
    };

    if (loading || !event) {
        return (
            <div className={`min-h-screen ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
                <GuardianNavBar darkMode={darkMode} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
                <div className="pt-24 sm:pt-28 md:pt-32 flex items-center justify-center min-h-[60vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
                        <p className={`font-medium ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('loadingEvent')}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Combine cover + gallery for slideshow
    const slides: Array<{ type: string; url: string | null }> = [];
    if (event.cover_image) {
        slides.push({ type: 'image', url: getMediaUrl(event.cover_image) });
    }
    if ((event as any).images && (event as any).images.length > 0) {
        (event as any).images.forEach((img: any) => {
            slides.push({ type: 'image', url: getMediaUrl(img.image) });
        });
    }

    // Status logic
    const isFull = (event as any).is_full || (event.max_seats > 0 && event.confirmed_participants_count >= event.max_seats);
    const seatsLeft = event.max_seats > 0 ? Math.max(0, event.max_seats - event.confirmed_participants_count) : null;
    
    const isRegistrationClosed = event?.allow_registration && event?.registration_close_date 
        ? new Date(event.registration_close_date) < new Date()
        : false;

    const eventDate = new Date(event.start_date);
    const isUpcoming = eventDate > new Date();

    // Google Maps API key check
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

    // Check which children are registered
    const registeredChildren = children.filter(child => childRegistrations[child.id]);
    const unregisteredChildren = children.filter(child => !childRegistrations[child.id]);

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
            <GuardianNavBar darkMode={darkMode} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
            
            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300 ${
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
                    <h1 className={`text-xl font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{tSidebar('menu')}</h1>
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
            
            {/* Hero Section */}
            <div className="relative">
                <div className="relative h-[320px] md:h-[420px] overflow-hidden">
                    {slides.length > 0 ? (
                        <>
                            <img 
                                src={slides[activeSlide].url || ''} 
                                className="w-full h-full object-cover" 
                                alt={event.title} 
                            />
                            {/* Gradient Overlay */}
                            <div className={`absolute inset-0 bg-gradient-to-t ${darkMode ? 'from-[var(--dark-900)] via-[var(--dark-900)]/60' : 'from-[#F8F7FE] via-[#F8F7FE]/60'} to-transparent`} />
                            
                            {/* Navigation arrows for gallery */}
                            {slides.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setActiveSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                                        className={`absolute left-4 top-1/2 -translate-y-1/2 backdrop-blur-md p-3 rounded-full transition-all z-10 ${darkMode ? 'bg-[var(--dark-700)]/80 text-[var(--brand-light)] hover:bg-[var(--dark-600)]' : 'bg-white/80 text-gray-800 hover:bg-white'}`}
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setActiveSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
                                        className={`absolute right-4 top-1/2 -translate-y-1/2 backdrop-blur-md p-3 rounded-full transition-all z-10 ${darkMode ? 'bg-[var(--dark-700)]/80 text-[var(--brand-light)] hover:bg-[var(--dark-600)]' : 'bg-white/80 text-gray-800 hover:bg-white'}`}
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`}>
                            <Calendar className={`w-24 h-24 ${darkMode ? 'text-[var(--brand-light)]/20' : 'text-[#4D4DA4]/20'}`} />
                        </div>
                    )}
                    
                    {/* Slide indicators */}
                    {slides.length > 1 && (
                        <div className="absolute bottom-28 md:bottom-32 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                            {slides.map((_, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={() => setActiveSlide(idx)}
                                    className={`h-2 rounded-full transition-all ${
                                        idx === activeSlide ? 'bg-[var(--brand-primary)] w-8' : 'bg-[var(--brand-light)]/30 w-2 hover:bg-[var(--brand-light)]/50'
                                    }`} 
                                />
                            ))}
                        </div>
                    )}
                    
                    {/* Hero Content Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                        <div className="max-w-7xl mx-auto">
                            {/* Back button */}
                            <Link 
                                href="/dashboard/guardian/events"
                                className={`inline-flex items-center gap-2 font-medium text-sm transition-colors mb-3 ${darkMode ? 'text-[var(--brand-light)]/80 hover:text-[var(--brand-light)]' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {t('allEvents')}
                            </Link>
                            
                            {/* Event badges */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                <span className="bg-[var(--brand-green)] text-[var(--dark-900)] text-xs px-3 py-1.5 rounded-full uppercase tracking-wider font-bold flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {t('eventBadge')}
                                </span>
                                {event.cost ? (
                                    <span className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 ${
                                        darkMode 
                                            ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30' 
                                            : 'bg-green-100 text-green-700 border border-green-300'
                                    }`}>
                                        <Ticket className="w-3.5 h-3.5" />
                                        {event.cost} SEK
                                    </span>
                                ) : (
                                    <span className="bg-[var(--brand-green)] text-[var(--dark-900)] text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5">
                                        <Gift className="w-3.5 h-3.5" />
                                        {t('free')}
                                    </span>
                                )}
                                {registeredChildren.length > 0 && (
                                    <span className={`bg-[var(--brand-primary)] text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 ${
                                        darkMode ? 'text-[var(--dark-900)]' : 'text-gray-900'
                                    }`}>
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        {registeredChildren.length} {registeredChildren.length === 1 ? (t('childRegistered') || 'child registered') : (t('childrenRegistered') || 'children registered')}
                                    </span>
                                )}
                            </div>
                            
                            {/* Title */}
                            <h1 className={`text-2xl md:text-3xl lg:text-4xl font-bold mb-3 max-w-3xl leading-tight font-heading ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                                {event.title}
                            </h1>
                            
                            {/* Countdown Timer for upcoming events */}
                            {isUpcoming && (
                                <div>
                                    <p className={`text-sm mb-2 flex items-center gap-2 ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'}`}>
                                        <Timer className="w-4 h-4" />
                                        {t('eventStartsIn')}
                                    </p>
                                    <CountdownTimer targetDate={event.start_date} darkMode={darkMode} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-0 sm:px-4 py-6 sm:py-10 mt-0 sm:mt-4">
                <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
                    {/* Left Column - Main Content */}
                    <div className="flex-1 space-y-4 sm:space-y-6">
                        {/* Quick Info Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-4">
                            <div className={`rounded-none sm:rounded-2xl p-5 border-b sm:border transition-all ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)] hover:border-[var(--brand-primary)]/30' : 'bg-white border-[#4D4DA4]/15 hover:border-[#4D4DA4]/30 shadow-sm'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="bg-[var(--brand-purple)] p-3 rounded-xl">
                                        <Calendar className="w-5 h-5 text-[var(--brand-light)]" />
                                    </div>
                                    <div>
                                        <p className={`text-xs uppercase tracking-wider font-medium ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>{t('dateLabel')}</p>
                                        <p className={`font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                                            {eventDate.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className={`rounded-none sm:rounded-2xl p-5 border-b sm:border transition-all ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)] hover:border-[var(--brand-primary)]/30' : 'bg-white border-[#4D4DA4]/15 hover:border-[#4D4DA4]/30 shadow-sm'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="bg-[var(--brand-primary)] p-3 rounded-xl">
                                        <Clock className="w-5 h-5 text-[var(--dark-900)]" />
                                    </div>
                                    <div>
                                        <p className={`text-xs uppercase tracking-wider font-medium ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>{t('timeLabel')}</p>
                                        <p className={`font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                                            {new Date(event.start_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(event.end_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className={`rounded-none sm:rounded-2xl p-5 border-b sm:border transition-all ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)] hover:border-[var(--brand-primary)]/30' : 'bg-white border-[#4D4DA4]/15 hover:border-[#4D4DA4]/30 shadow-sm'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="bg-[var(--brand-green)] p-3 rounded-xl">
                                        <MapPin className="w-5 h-5 text-[var(--dark-900)]" />
                                    </div>
                                    <div>
                                        <p className={`text-xs uppercase tracking-wider font-medium ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>{t('locationLabel')}</p>
                                        <p className={`font-bold truncate max-w-[150px] ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{event.location_name}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* About Section */}
                        <div className={`rounded-none sm:rounded-2xl p-6 md:p-8 border-y sm:border ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15 shadow-sm'}`}>
                            <h2 className={`text-xl font-bold mb-4 flex items-center gap-3 font-heading ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                                <span className="w-1 h-6 bg-[var(--brand-primary)] rounded-full"></span>
                                {t('aboutThisEvent')}
                            </h2>
                            <div 
                                className={`prose max-w-none leading-relaxed event-description-content ${
                                    darkMode 
                                        ? 'prose-invert' 
                                        : 'prose-slate prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900 prose-a:text-[var(--brand-primary)]'
                                }`} 
                                dangerouslySetInnerHTML={{ __html: sanitizeAndStripColors(event.description) }} 
                            />
                        </div>
                        
                        {/* Location & Map Section */}
                        {(event.location_name || event.address || ((event as any).is_map_visible && event.latitude && event.longitude)) && (
                            <div className={`rounded-none sm:rounded-2xl p-6 md:p-8 border-y sm:border ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15 shadow-sm'}`}>
                                <h2 className={`text-xl font-bold mb-4 flex items-center gap-3 font-heading ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                                    <span className="w-1 h-6 bg-[var(--brand-green)] rounded-full"></span>
                                    {t('locationLabel')}
                                </h2>
                                
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1">
                                        {event.location_name && (
                                            <h3 className={`font-semibold text-lg mb-1 ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{event.location_name}</h3>
                                        )}
                                        {event.address && (
                                            <p className={`mb-4 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{event.address}</p>
                                        )}
                                        
                                        {event.latitude && event.longitude && (
                                            <a 
                                                href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`} 
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`inline-flex items-center gap-2 font-medium transition-colors ${darkMode ? 'text-[var(--brand-primary)] hover:text-[var(--brand-purple)]' : 'text-[#4D4DA4] hover:text-[#3D3D8A]'}`}
                                            >
                                                <MapPin className="w-4 h-4" />
                                                {t('getDirections')} →
                                            </a>
                                        )}
                                    </div>
                                    
                                    {(event as any).is_map_visible && event.latitude && event.longitude && (
                                        <div className={`w-full md:w-80 h-48 md:h-56 rounded-xl overflow-hidden border flex-shrink-0 ${darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/15'}`}>
                                            {googleMapsApiKey ? (
                                                <LoadScript googleMapsApiKey={googleMapsApiKey}>
                                                    <GoogleMap
                                                        mapContainerStyle={{ width: '100%', height: '100%' }}
                                                        center={{ lat: event.latitude, lng: event.longitude }}
                                                        zoom={15}
                                                        options={{ disableDefaultUI: true }}
                                                    >
                                                        <Marker position={{ lat: event.latitude, lng: event.longitude }} />
                                                    </GoogleMap>
                                                </LoadScript>
                                            ) : (
                                                <div className={`w-full h-full flex flex-col items-center justify-center p-4 text-center ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`}>
                                                    <div className="bg-[var(--brand-primary)]/20 p-4 rounded-full mb-3">
                                                        <MapPin className="w-8 h-8 text-[var(--brand-primary)]" />
                                                    </div>
                                                    <a 
                                                        href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`} 
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`font-medium text-sm ${darkMode ? 'text-[var(--brand-primary)] hover:text-[var(--brand-purple)]' : 'text-[#4D4DA4] hover:text-[#3D3D8A]'}`}
                                                    >
                                                        {t('openInGoogleMaps')} →
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Documents Section */}
                        {(event as any).documents?.length > 0 && (
                            <div className={`rounded-none sm:rounded-2xl p-6 md:p-8 border-y sm:border ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15 shadow-sm'}`}>
                                <h2 className={`text-xl font-bold mb-4 flex items-center gap-3 font-heading ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                                    <span className="w-1 h-6 bg-[var(--brand-peach)] rounded-full"></span>
                                    {t('documentsAndResources')}
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(event as any).documents.map((doc: any) => (
                                        <a 
                                            key={doc.id} 
                                            href={getMediaUrl(doc.file) || '#'} 
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex items-center gap-4 p-4 rounded-xl border transition-all group ${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-600)] hover:border-[var(--brand-primary)]/30' : 'bg-[#EBEBFE] border-[#4D4DA4]/15 hover:border-[#4D4DA4]/30'}`}
                                        >
                                            <div className={`p-3 rounded-xl ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-white'}`}>
                                                <FileText className="w-5 h-5 text-[var(--brand-primary)]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-semibold truncate ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{doc.title}</div>
                                                {doc.description && <div className={`text-sm truncate ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{doc.description}</div>}
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Right Column - Sticky Registration Card */}
                    <div className="lg:w-[380px] hidden lg:block">
                        <div className="sticky top-24 space-y-4">
                            {/* Registration Card */}
                            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15 shadow-sm'}`}>
                                {/* Card Header */}
                                <div className={`p-6 ${
                                    darkMode 
                                        ? 'bg-[var(--brand-purple)] text-[var(--brand-light)]' 
                                        : 'bg-green-100 text-gray-900'
                                }`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className={`text-sm font-medium ${
                                            darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-700'
                                        }`}>{t('eventPrice')}</span>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setIsLiked(!isLiked)}
                                                className={`p-2 rounded-full transition-all ${
                                                    darkMode 
                                                        ? isLiked ? 'bg-[var(--brand-light)]/20 text-[var(--brand-primary)]' : 'bg-[var(--brand-light)]/10 hover:bg-[var(--brand-light)]/20'
                                                        : isLiked ? 'bg-gray-200 text-[var(--brand-primary)]' : 'bg-white/80 hover:bg-gray-200 text-gray-700'
                                                }`}
                                            >
                                                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                            </button>
                                            <button className={`p-2 rounded-full transition-all ${
                                                darkMode 
                                                    ? 'bg-[var(--brand-light)]/10 hover:bg-[var(--brand-light)]/20' 
                                                    : 'bg-white/80 hover:bg-gray-200 text-gray-700'
                                            }`}>
                                                <Share2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className={`text-4xl font-bold tracking-tight ${
                                        darkMode ? '' : 'text-gray-900'
                                    }`}>
                                        {event.cost ? `${event.cost} SEK` : 'Free'}
                                    </div>
                                    {!event.cost && (
                                        <p className={`text-sm mt-1 ${
                                            darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'
                                        }`}>{t('noRegistrationFee')}</p>
                                    )}
                                </div>
                                
                                <div className="p-6 space-y-4">
                                    {/* Availability */}
                                    {event.allow_registration && event.max_seats > 0 && (
                                        <div className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' : 'bg-[#EBEBFE] border-[#4D4DA4]/15'}`}>
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-[var(--brand-green)]" />
                                                <span className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('availability')}</span>
                                            </div>
                                            <span className={`font-bold text-sm ${isFull ? 'text-[var(--brand-red)]' : 'text-[var(--brand-green)]'}`}>
                                                {isFull ? t('full') : `${seatsLeft} ${t('spotsLeft')}`}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {/* Registration deadline */}
                                    {event.allow_registration && event.registration_close_date && (
                                        <div className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' : 'bg-[#EBEBFE] border-[#4D4DA4]/15'}`}>
                                            <div className="flex items-center gap-2">
                                                <UserPlus className="w-4 h-4 text-[var(--brand-green)]" />
                                                <span className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('registerBy')}</span>
                                            </div>
                                            <span className={`font-bold text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                                                {new Date(event.registration_close_date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {/* Registered Children */}
                                    {registeredChildren.length > 0 && (
                                        <div className="space-y-2">
                                            <p className={`text-xs uppercase tracking-wider font-medium ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>{t('registeredChildren') || 'Registered Children'}</p>
                                            {registeredChildren.map(child => (
                                                <div key={child.id} className="flex items-center justify-between p-3 bg-[var(--brand-green)]/10 rounded-xl border border-[var(--brand-green)]/20">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="w-4 h-4 text-[var(--brand-green)]" />
                                                        <span className={`text-sm font-medium ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{child.first_name}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => { setChildToCancel(child); setCancelModalOpen(true); }}
                                                        className={`text-xs hover:text-[var(--brand-red)] transition-colors ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-400'}`}
                                                    >
                                                        {t('cancel')}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {/* Register Button */}
                                    {event.allow_registration && unregisteredChildren.length > 0 && !isRegistrationClosed && (
                                        <button 
                                            onClick={() => setRegModalOpen(true)}
                                            disabled={isFull && event.max_waitlist === 0}
                                            className={`w-full bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold py-4 rounded-xl hover:bg-[var(--brand-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${darkMode ? 'disabled:bg-[var(--dark-600)] disabled:text-[var(--brand-light)]/50' : 'disabled:bg-gray-200 disabled:text-gray-400'}`}
                                        >
                                            {(isFull && event.max_waitlist > 0) ? t('joinWaitlist') : (t('registerChild') || 'Register a Child')}
                                        </button>
                                    )}
                                    
                                    {!event.allow_registration && (
                                        <div className={`text-center py-3 text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                                            {t('noRegistrationRequired')}
                                        </div>
                                    )}
                                    
                                    {isRegistrationClosed && (
                                        <div className="text-center py-3 text-[var(--brand-red)] text-sm font-medium">
                                            {t('registrationClosed')}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Social Proof */}
                            {event.confirmed_participants_count > 0 && (
                                <div className={`rounded-2xl p-4 border ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15 shadow-sm'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="flex -space-x-2">
                                            {[...Array(Math.min(3, event.confirmed_participants_count))].map((_, i) => (
                                                <div key={i} className={`w-8 h-8 rounded-full bg-[var(--brand-green)] border-2 flex items-center justify-center text-[var(--dark-900)] text-xs font-bold ${darkMode ? 'border-[var(--dark-800)]' : 'border-white'}`}>
                                                    {String.fromCharCode(65 + i)}
                                                </div>
                                            ))}
                                        </div>
                                        <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                                            <span className="font-bold text-[var(--brand-green)]">{event.confirmed_participants_count}</span> {event.confirmed_participants_count === 1 ? t('person') : t('people')} {t('going')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Mobile Sticky Bottom Bar */}
            <div className={`fixed bottom-0 left-0 right-0 border-t p-4 lg:hidden z-40 safe-area-bottom ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15'}`}>
                <div className="flex items-center gap-3 max-w-lg mx-auto">
                    <div className="flex-shrink-0">
                        <p className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>{t('price')}</p>
                        <p className={`font-bold text-lg ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{event.cost ? `${event.cost} SEK` : t('free')}</p>
                    </div>
                    <div className="flex-1">
                        {event.allow_registration && unregisteredChildren.length > 0 && !isRegistrationClosed ? (
                            <button 
                                onClick={() => setRegModalOpen(true)}
                                disabled={isFull && event.max_waitlist === 0}
                                className={`w-full bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all ${darkMode ? 'disabled:bg-[var(--dark-600)] disabled:text-[var(--brand-light)]/50' : 'disabled:bg-gray-200 disabled:text-gray-400'}`}
                            >
                                {(isFull && event.max_waitlist > 0) ? t('joinWaitlist') : (t('registerChild') || 'Register Child')}
                            </button>
                        ) : registeredChildren.length > 0 ? (
                            <div className={`bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/30 font-bold py-3 rounded-xl text-center text-sm flex items-center justify-center gap-1 ${
                                darkMode ? 'text-[var(--dark-900)]' : 'text-gray-900'
                            }`}>
                                <CheckCircle className="w-4 h-4" />
                                {registeredChildren.length} {registeredChildren.length === 1 ? 'child' : 'children'} registered
                            </div>
                        ) : (
                            <div className={`text-center py-3 text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                                {isRegistrationClosed ? t('registrationClosed') : t('noRegistrationRequired')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Bottom padding for mobile sticky bar */}
            <div className="h-24 lg:hidden" />

            {/* Child Selection Modal */}
            {isRegModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`rounded-none sm:rounded-2xl border p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15 shadow-xl'}`}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className={`text-xl font-bold font-heading ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                                {t('selectChild') || 'Select a Child'}
                            </h3>
                            <button 
                                onClick={() => { setRegModalOpen(false); setSelectedChild(null); }}
                                className={`p-2 rounded-lg ${darkMode ? 'text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)]' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <p className={`mb-4 text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                            {t('selectChildToRegister') || 'Choose which child to register for this event:'}
                        </p>
                        
                        <div className="space-y-2 mb-6">
                            {unregisteredChildren.map(child => (
                                <button
                                    key={child.id}
                                    onClick={() => setSelectedChild(child)}
                                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                                        selectedChild?.id === child.id
                                            ? 'bg-[var(--brand-primary)]/20 border-[var(--brand-primary)]'
                                            : darkMode 
                                                ? 'bg-[var(--dark-700)] border-[var(--dark-600)] hover:border-[var(--brand-primary)]/30'
                                                : 'bg-[#EBEBFE] border-[#4D4DA4]/15 hover:border-[#4D4DA4]/30'
                                    }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-[var(--brand-purple)] flex items-center justify-center text-[var(--brand-light)] font-bold">
                                        {child.first_name.charAt(0)}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{child.first_name} {child.last_name}</p>
                                    </div>
                                    {selectedChild?.id === child.id && (
                                        <CheckCircle className="w-5 h-5 text-[var(--brand-primary)]" />
                                    )}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={() => { setRegModalOpen(false); setSelectedChild(null); }}
                                className={`flex-1 py-3 px-4 font-semibold rounded-xl transition-all ${darkMode ? 'text-[var(--brand-light)]/70 bg-[var(--dark-700)] hover:bg-[var(--dark-600)]' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}
                            >
                                {t('cancel')}
                            </button>
                            <button 
                                onClick={() => selectedChild && handleRegisterChild(selectedChild)}
                                disabled={!selectedChild || isRegistering}
                                className="flex-1 py-3 px-4 font-semibold text-[var(--dark-900)] bg-[var(--brand-primary)] rounded-xl hover:bg-[var(--brand-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {isRegistering ? (
                                    <span className="w-5 h-5 border-2 border-[var(--dark-900)]/30 border-t-[var(--dark-900)] rounded-full animate-spin" />
                                ) : (
                                    t('register')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Registration Modal */}
            {isCancelModalOpen && childToCancel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`rounded-none sm:rounded-2xl border p-8 max-w-md w-full animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15 shadow-xl'}`}>
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-[var(--brand-red)]/20 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-10 h-10 text-[var(--brand-red)]" />
                            </div>
                        </div>
                        
                        <h3 className={`text-2xl font-bold mb-3 text-center font-heading ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                            {t('cancelRegistrationTitle')}
                        </h3>
                        
                        <p className={`mb-8 text-center leading-relaxed ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'}`}>
                            {t('cancelChildRegistration') || `Are you sure you want to cancel ${childToCancel.first_name}'s registration for`} <span className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{event?.title}</span>?
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button 
                                onClick={() => { setCancelModalOpen(false); setChildToCancel(null); }}
                                disabled={isCancelling}
                                className={`flex-1 py-4 px-6 font-semibold rounded-xl disabled:opacity-50 transition-all ${darkMode ? 'text-[var(--brand-light)]/70 bg-[var(--dark-700)] hover:bg-[var(--dark-600)]' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}
                            >
                                {t('keepRegistration')}
                            </button>
                            <button 
                                onClick={handleCancelRegistration}
                                disabled={isCancelling}
                                className="flex-1 py-4 px-6 font-semibold text-white bg-[var(--brand-red)] rounded-xl hover:bg-[var(--brand-red)]/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {isCancelling ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <XCircle className="w-4 h-4" />
                                        {t('cancelRegistration')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

