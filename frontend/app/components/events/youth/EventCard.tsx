'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { MapPin, Calendar, Users, ChevronLeft, ChevronRight, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { getMediaUrl } from '@/app/utils';
import { Event } from '@/types/event';

export default function EventCard({ event }: { event: Event }) {
    const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
    
    // Calculate availability visual
    const isFull = event.max_seats > 0 && event.confirmed_participants_count >= event.max_seats;
    const seatsLeft = event.max_seats > 0 ? event.max_seats - event.confirmed_participants_count : 999;
    
    // Get user registration status
    const userStatus = (event as any).user_registration_status;
    const isRegistered = !!userStatus && userStatus !== 'CANCELLED';
    
    // Combine cover image and gallery images
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
    
    return (
        <>
            <Link href={`/dashboard/youth/events/${event.id}`} className="group block">
                <div className="bg-white rounded-xl overflow-hidden shadow-md border-2 border-green-200 flex flex-row relative">
                    {/* Event Ribbon/Header */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 relative overflow-hidden z-10">
                        <div className="absolute inset-0 flex items-center justify-between px-2">
                            <Calendar className="text-white w-2 h-2 opacity-60" />
                            <Calendar className="text-white w-2 h-2 opacity-60" />
                            <Calendar className="text-white w-2 h-2 opacity-60" />
                            <Calendar className="text-white w-2 h-2 opacity-60" />
                            <Calendar className="text-white w-2 h-2 opacity-60" />
                        </div>
                    </div>
                    
                    {/* Event Badge */}
                    <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
                        <span className="bg-green-600 text-white text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-bold shadow-lg flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            EVENT
                        </span>
                        {event.is_recurring && (
                            <span className="bg-purple-600 text-white text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-bold shadow-lg flex items-center gap-1">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                RECURRING
                            </span>
                        )}
                    </div>
                    
                    {/* Image Section - Avatar */}
                    <div className="relative bg-gray-200 w-24 flex-shrink-0">
                        {event.cover_image ? (
                            <div className="relative h-full min-h-[120px]">
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
                            </div>
                        ) : (
                            <div className="w-full h-full min-h-[120px] flex items-center justify-center text-gray-400 bg-gray-100">
                                <Calendar className="w-8 h-8 opacity-20" />
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col bg-gradient-to-b from-white to-green-50/30 pt-6 relative">
                        {/* Status Badge - Top Right */}
                        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 items-end">
                            {/* User Registration Status */}
                            {isRegistered && (
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1 ${
                                    userStatus === 'APPROVED' 
                                        ? 'bg-green-600 text-white' 
                                        : userStatus === 'WAITLIST'
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-yellow-500 text-white'
                                }`}>
                                    {userStatus === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                                    {userStatus === 'WAITLIST' && <Clock className="w-3 h-3" />}
                                    {(userStatus === 'PENDING_GUARDIAN' || userStatus === 'PENDING_ADMIN') && <AlertCircle className="w-3 h-3" />}
                                    {userStatus === 'APPROVED' ? 'Confirmed' : 
                                     userStatus === 'WAITLIST' ? 'On Waitlist' : 
                                     'Pending'}
                                </span>
                            )}
                            {/* Event Availability Status */}
                            {!isRegistered && (
                                <>
                                    {isFull ? (
                                        <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
                                            Waitlist Only
                                        </span>
                                    ) : (
                                        <span className="bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
                                            Open
                                        </span>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                            <div className="bg-green-100 p-1 rounded-lg">
                                <Calendar className="w-3 h-3 text-green-600" />
                            </div>
                            <div className="text-xs font-bold text-green-700 uppercase tracking-wide">
                                {format(new Date(event.start_date), 'MMM d, HH:mm')}
                            </div>
                        </div>
                        
                        <h3 className="font-bold text-gray-900 mb-2 text-base line-clamp-2 pr-20">
                            {event.title}
                        </h3>
                        
                        <div className="flex items-center text-gray-600 text-xs mb-3 bg-green-50/50 px-2 py-1.5 rounded-md">
                            <MapPin className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                            <span className="font-medium truncate">{event.location_name}</span>
                        </div>

                        <div className="mt-auto flex items-center justify-between text-xs border-t-2 border-green-200 pt-3">
                            <span className={`font-semibold ${event.cost ? 'text-gray-700' : 'text-green-600'}`}>
                                {event.cost ? `${event.cost} SEK` : '🆓 Free'}
                            </span>
                            
                            {event.allow_registration && event.max_seats > 0 && (
                                <div className="flex items-center gap-1.5 text-gray-700 bg-green-50 px-2 py-1 rounded-full">
                                    <Users className="w-3.5 h-3.5 text-green-600" />
                                    <span className="font-semibold">{isFull ? `${event.waitlist_count} waiting` : `${seatsLeft} left`}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Link>

            {/* Image Slideshow Modal */}
            {currentImageIndex !== null && allImages.length > 0 && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
                    onClick={() => setCurrentImageIndex(null)}
                >
                    <div 
                        className="relative max-w-4xl max-h-[90vh] w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setCurrentImageIndex(null)}
                            className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-2"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        
                        {/* Current image */}
                        <img
                            src={allImages[currentImageIndex].url || ''}
                            alt={`${event.title} ${currentImageIndex + 1}`}
                            className="w-full h-auto max-h-[90vh] object-contain"
                        />
                        
                        {/* Navigation arrows */}
                        {allImages.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentImageIndex((prev) => 
                                            prev !== null && prev > 0 ? prev - 1 : allImages.length - 1
                                        );
                                    }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-2"
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
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-2"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}
                        
                        {/* Image counter */}
                        {allImages.length > 1 && currentImageIndex !== null && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
                                {currentImageIndex + 1} / {allImages.length}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

