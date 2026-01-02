'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { format } from 'date-fns';
import { enUS, sv, da, nb, fi, type Locale } from 'date-fns/locale';
import { MapPin, Calendar, Users, ChevronLeft, ChevronRight, X, CheckCircle, Clock, AlertCircle, Repeat, ArrowRight } from 'lucide-react';
import { getMediaUrl } from '@/app/utils';
import { Event } from '@/types/event';

// Map locale codes to date-fns locales
const localeMap: Record<string, Locale> = {
  en: enUS,
  sv: sv,
  da: da,
  nb: nb,
  fi: fi,
  ar: enUS, // Arabic not available in date-fns, fallback to English
  so: enUS, // Somali not available in date-fns, fallback to English
  prs: enUS, // Dari not available in date-fns, fallback to English
};

interface EventCardProps {
    event: Event;
    darkMode?: boolean;
}

export default function EventCard({ event, darkMode = false }: EventCardProps) {
    const t = useTranslations('eventCard');
    const locale = useLocale();
    const dateLocale = localeMap[locale] || enUS;
    const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
    
    const isFull = event.max_seats > 0 && event.confirmed_participants_count >= event.max_seats;
    const seatsLeft = event.max_seats > 0 ? event.max_seats - event.confirmed_participants_count : 999;
    
    const userStatus = (event as any).user_registration_status;
    const isRegistered = !!userStatus && userStatus !== 'CANCELLED';
    
    const allImages: Array<{ type: string; url: string | null }> = [];
    if (event.cover_image) {
        allImages.push({ type: 'cover', url: getMediaUrl(event.cover_image) });
    }
    if ((event as any).images && (event as any).images.length > 0) {
        (event as any).images.forEach((img: any) => {
            allImages.push({ type: 'gallery', url: getMediaUrl(img.image) });
        });
    }
    
    const handleImageClick = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentImageIndex(index);
    };

    // Format date nicely with locale support
    const eventDate = new Date(event.start_date);
    const dayName = format(eventDate, 'EEE', { locale: dateLocale });
    const dayNum = format(eventDate, 'd');
    const month = format(eventDate, 'MMM', { locale: dateLocale });
    const time = format(eventDate, 'HH:mm');
    
    return (
        <>
            <Link href={`/dashboard/youth/events/${event.id}`} className="group block">
                <div className={`overflow-hidden transition-all duration-200 ${
                    darkMode 
                        ? 'bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] hover:border-[var(--brand-primary)]/30' 
                        : 'bg-white rounded-2xl border border-[#4D4DA4]/15 hover:border-[#4D4DA4]/30 hover:shadow-lg'
                }`}>
                    <div className="flex">
                        {/* Date Column */}
                        <div className={`w-20 sm:w-24 flex-shrink-0 p-3 sm:p-4 flex flex-col items-center justify-center ${
                            darkMode 
                                ? 'bg-[var(--brand-secondary)] text-white' 
                                : 'bg-[#4D4DA4] text-white'
                        }`}>
                            <span className="text-[10px] uppercase tracking-wider opacity-80">{dayName}</span>
                            <span className="text-2xl sm:text-3xl font-bold leading-none my-1">{dayNum}</span>
                            <span className="text-xs uppercase tracking-wide opacity-90">{month}</span>
                            <div className="mt-2 pt-2 border-t border-white/20 w-full text-center">
                                <span className="text-sm font-semibold">{time}</span>
                            </div>
                        </div>

                        {/* Image Section */}
                        {event.cover_image && (
                            <div className="w-28 sm:w-36 flex-shrink-0 relative">
                                <img 
                                    src={getMediaUrl(event.cover_image) || ''} 
                                    alt={event.title} 
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={(e) => {
                                        if (allImages.length > 0) {
                                            handleImageClick(e, 0);
                                        }
                                    }}
                                />
                                {/* Recurring badge on image */}
                                {event.is_recurring && (
                                    <div className={`absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                        darkMode 
                                            ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                            : 'bg-[#4D4DA4] text-white'
                                    }`}>
                                        <Repeat className="w-2.5 h-2.5" />
                                        <span className="font-medium">{t('series')}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 p-3 sm:p-4 flex flex-col min-w-0">
                            {/* Top row: Status badges */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {isRegistered ? (
                                    <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                        userStatus === 'APPROVED' 
                                            ? darkMode ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)]' : 'bg-emerald-100 text-emerald-700'
                                            : userStatus === 'WAITLIST'
                                            ? darkMode ? 'bg-[var(--brand-third)]/20 text-[var(--brand-third)]' : 'bg-amber-100 text-amber-700'
                                            : darkMode ? 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)]' : 'bg-orange-100 text-orange-700'
                                    }`}>
                                        {userStatus === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                                        {userStatus === 'WAITLIST' && <Clock className="w-3 h-3" />}
                                        {(userStatus === 'PENDING_GUARDIAN' || userStatus === 'PENDING_ADMIN') && <AlertCircle className="w-3 h-3" />}
                                        {userStatus === 'APPROVED' ? t('registered') : 
                                         userStatus === 'WAITLIST' ? t('waitlist') : 
                                         t('pending')}
                                    </span>
                                ) : (
                                    <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${
                                        isFull 
                                            ? darkMode ? 'bg-[var(--brand-red)]/20 text-[var(--brand-red)]' : 'bg-rose-100 text-rose-700'
                                            : darkMode ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)]' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        {isFull ? t('full') : t('open')}
                                    </span>
                                )}
                                
                                {/* Recurring badge if no image */}
                                {event.is_recurring && !event.cover_image && (
                                    <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                        darkMode 
                                            ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]' 
                                            : 'bg-[#EBEBFE] text-[#4D4DA4]'
                                    }`}>
                                        <Repeat className="w-2.5 h-2.5" />
                                        {t('recurring')}
                                    </span>
                                )}
                            </div>
                            
                            {/* Title */}
                            <h3 className={`font-semibold text-sm sm:text-base line-clamp-2 mb-2 transition-colors ${
                                darkMode 
                                    ? 'text-[var(--brand-light)] group-hover:text-[var(--brand-primary)]' 
                                    : 'text-gray-900 group-hover:text-[#4D4DA4]'
                            }`}>
                                {event.title}
                            </h3>
                            
                            {/* Location */}
                            <div className={`flex items-center text-xs sm:text-sm mb-3 ${
                                darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'
                            }`}>
                                <MapPin className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                                <span className="truncate">{event.location_name}</span>
                            </div>

                            {/* Bottom row: Price & Availability */}
                            <div className="flex items-center gap-3">
                                {/* Price */}
                                <span className={`text-sm font-bold ${
                                    event.cost 
                                        ? darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'
                                        : darkMode ? 'text-[var(--brand-green)]' : 'text-emerald-600'
                                }`}>
                                    {event.cost ? `${event.cost} ${t('kr')}` : t('free')}
                                </span>
                                
                                {/* Seats */}
                                {event.allow_registration && event.max_seats > 0 && (
                                    <span className={`text-xs flex items-center gap-1 ${
                                        darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                                    }`}>
                                        <Users className="w-3.5 h-3.5" />
                                        {isFull ? `${event.waitlist_count} ${t('waiting')}` : `${seatsLeft} ${t('spots')}`}
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        {/* Arrow indicator - centered on right side */}
                        <div className={`w-12 sm:w-14 flex-shrink-0 flex items-center justify-center ${
                            darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#F8F7FE]'
                        }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                darkMode 
                                    ? 'bg-[var(--dark-600)] group-hover:bg-[var(--brand-primary)]' 
                                    : 'bg-[#EBEBFE] group-hover:bg-[#4D4DA4]'
                            }`}>
                                <ArrowRight className={`w-4 h-4 transition-colors ${
                                    darkMode 
                                        ? 'text-[var(--brand-light)]/40 group-hover:text-[var(--dark-900)]' 
                                        : 'text-gray-400 group-hover:text-white'
                                }`} />
                            </div>
                        </div>
                    </div>
                </div>
            </Link>

            {/* Image Slideshow Modal */}
            {currentImageIndex !== null && allImages.length > 0 && (
                <div 
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
                    onClick={() => setCurrentImageIndex(null)}
                >
                    <div 
                        className="relative max-w-4xl max-h-[90vh] w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setCurrentImageIndex(null)}
                            className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 bg-black/50 rounded-full p-2"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        
                        <img
                            src={allImages[currentImageIndex].url || ''}
                            alt={`${event.title} ${currentImageIndex + 1}`}
                            className="w-full h-auto max-h-[90vh] object-contain"
                        />
                        
                        {allImages.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentImageIndex((prev) => 
                                            prev !== null && prev > 0 ? prev - 1 : allImages.length - 1
                                        );
                                    }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 bg-black/50 rounded-full p-2"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentImageIndex((prev) => 
                                            prev !== null && prev < allImages.length - 1 ? prev + 1 : 0
                                        );
                                    }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 bg-black/50 rounded-full p-2"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}
                        
                        {allImages.length > 1 && currentImageIndex !== null && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                                {currentImageIndex + 1} / {allImages.length}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
