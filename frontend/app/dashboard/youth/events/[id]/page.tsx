'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { getMediaUrl } from '@/app/utils';
import { Event } from '@/types/event';
import { MapPin, Calendar, Clock, FileText, ChevronLeft, ChevronRight, CheckCircle, ArrowLeft, XCircle, AlertCircle } from 'lucide-react';
import { GoogleMap, Marker, LoadScript } from '@react-google-maps/api';
import EventRegistrationModal from '@/app/components/events/youth/EventRegistrationModal';
import NavBar from '@/app/components/NavBar';
import { useAuth } from '@/context/AuthContext';

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRegModalOpen, setRegModalOpen] = useState(false);
    const [isCancelModalOpen, setCancelModalOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    
    // Gallery State
    const [activeSlide, setActiveSlide] = useState(0);

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

    useEffect(() => { 
        if (params.id) {
            fetchEvent(); 
        }
    }, [params.id]);

    const handleCancelRegistration = async () => {
        if (!event) return;
        
        setIsCancelling(true);
        try {
            await api.post(`/events/${event.id}/cancel/`);
            await fetchEvent(); // Refresh event data
            setCancelModalOpen(false);
            // Optionally redirect to events list
            router.push('/dashboard/youth/events');
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || 'Failed to cancel registration. Please try again.');
        } finally {
            setIsCancelling(false);
        }
    };

    if (loading || !event) {
        return (
            <div className="min-h-screen bg-gray-100">
                <NavBar />
                <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
                    <div className="text-center py-10 text-gray-500">Loading...</div>
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

    // Status logic for button
    // user_registration_status comes from serializer method field
    const userStatus = (event as any).user_registration_status; 
    const isRegistered = !!userStatus && userStatus !== 'CANCELLED';
    const isFull = (event as any).is_full || (event.max_seats > 0 && event.confirmed_participants_count >= event.max_seats);

    return (
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Sidebar - Location & Documents */}
                    <aside className="w-full md:w-80 flex-shrink-0 space-y-6 md:sticky md:top-[72px] md:self-start md:max-h-[calc(100vh-88px)] md:overflow-y-auto">
                        {/* Back Button */}
                        <div>
                            <Link 
                                href="/dashboard/youth/events"
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors mb-4"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Events
                            </Link>
                        </div>

                        {/* Location & Map */}
                        {(event.location_name || event.address || ((event as any).is_map_visible && event.latitude && event.longitude)) && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-green-600" />
                                    Location
                                </h3>
                                
                                {event.location_name && (
                                    <p className="text-sm text-gray-700 mb-2 font-medium">{event.location_name}</p>
                                )}
                                
                                {event.address && (
                                    <p className="text-xs text-gray-500 mb-3">{event.address}</p>
                                )}

                                {(event as any).is_map_visible && event.latitude && event.longitude && (
                                    <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
                                        {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                                            <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
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
                                            <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
                                                <MapPin className="w-12 h-12 text-gray-400 mb-2" />
                                                <p className="text-sm text-gray-600 mb-2">Map Unavailable</p>
                                                <a 
                                                    href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`} 
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-green-600 hover:text-green-700 underline text-sm"
                                                >
                                                    Open in Google Maps →
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Documents */}
                        {(event as any).documents?.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-green-600" />
                                    Documents
                                </h3>
                                <div className="space-y-2">
                                    {(event as any).documents.map((doc: any) => (
                                        <a 
                                            key={doc.id} 
                                            href={getMediaUrl(doc.file) || '#'} 
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                                        >
                                            <div className="bg-white p-2 rounded-lg shadow-sm">
                                                <FileText className="w-4 h-4 text-red-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm text-gray-800 truncate">{doc.title}</div>
                                                {doc.description && <div className="text-xs text-gray-500 truncate">{doc.description}</div>}
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Header Image / Slideshow */}
                            <div className="relative h-64 bg-gray-900">
                                {/* Slides */}
                                {slides.length > 0 ? (
                                    <div className="relative w-full h-full">
                                        <img 
                                            src={slides[activeSlide].url || ''} 
                                            className="w-full h-full object-cover opacity-90" 
                                            alt="Event" 
                                        />
                                        
                                        {/* Navigation arrows */}
                                        {slides.length > 1 && (
                                            <>
                                                <button
                                                    onClick={() => setActiveSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white backdrop-blur-sm hover:bg-black/70 transition z-10"
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setActiveSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white backdrop-blur-sm hover:bg-black/70 transition z-10"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500">No Image</div>
                                )}

                                {/* Dots */}
                                {slides.length > 1 && (
                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                                        {slides.map((_, idx) => (
                                            <button 
                                                key={idx} 
                                                onClick={() => setActiveSlide(idx)}
                                                className={`w-2 h-2 rounded-full transition ${idx === activeSlide ? 'bg-white' : 'bg-white/50'}`} 
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h1>
                                        {event.cost ? (
                                            <span className="inline-block bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-sm">
                                                {event.cost} SEK
                                            </span>
                                        ) : (
                                            <span className="inline-block bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-sm">🆓 Free</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 mb-6 text-sm">
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <div className="bg-green-100 p-1.5 rounded-lg">
                                            <Calendar className="w-4 h-4 text-green-600" />
                                        </div>
                                        <span className="font-medium">{new Date(event.start_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <div className="bg-green-100 p-1.5 rounded-lg">
                                            <Clock className="w-4 h-4 text-green-600" />
                                        </div>
                                        <span>
                                            {new Date(event.start_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} 
                                            {' - '}
                                            {new Date(event.end_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <div className="bg-green-100 p-1.5 rounded-lg">
                                            <MapPin className="w-4 h-4 text-green-600" />
                                        </div>
                                        <span className="font-medium">{event.location_name}</span>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="mb-8">
                                    <h3 className="font-bold text-gray-900 mb-3">About this Event</h3>
                                    <div 
                                        className="prose prose-sm max-w-none text-gray-700" 
                                        dangerouslySetInnerHTML={{ __html: event.description }} 
                                    />
                                </div>
                            </div>

                            {/* Bottom Action Bar */}
                            <div className="border-t border-gray-200 bg-gray-50 p-4">
                                {isRegistered ? (
                                    <div className="space-y-3">
                                        <div className="w-full bg-green-50 border border-green-200 text-green-800 font-bold py-3 rounded-xl text-center flex items-center justify-center gap-2">
                                            <CheckCircle className="w-5 h-5" />
                                            {userStatus === 'APPROVED' ? 'You are going!' : 
                                             userStatus === 'WAITLIST' ? 'You are on the waitlist' :
                                             userStatus === 'PENDING_GUARDIAN' ? 'Waiting for guardian approval' :
                                             userStatus === 'PENDING_ADMIN' ? 'Waiting for admin approval' :
                                             'Application Sent'}
                                        </div>
                                        <button 
                                            onClick={() => setCancelModalOpen(true)}
                                            className="w-full bg-red-50 border border-red-200 text-red-700 font-semibold py-2.5 rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Cancel Registration
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setRegModalOpen(true)}
                                        disabled={!event.allow_registration || (event.max_seats > 0 && isFull && event.max_waitlist === 0)}
                                        className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-700 disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                                    >
                                        {!event.allow_registration ? 'Registration Closed' : 
                                         (event.max_seats > 0 && isFull) ? 'Join Waitlist' : 'Register Now'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            <EventRegistrationModal 
                event={event} 
                isOpen={isRegModalOpen} 
                onClose={() => setRegModalOpen(false)} 
                onSuccess={fetchEvent} // Refresh to show "Registered" state
            />

            {/* Cancel Registration Modal */}
            {isCancelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
                            Cancel Registration?
                        </h3>
                        
                        <p className="text-gray-600 mb-6 text-center text-sm">
                            Are you sure you want to cancel your registration for <span className="font-semibold">{event?.title}</span>? 
                            {userStatus === 'APPROVED' && ' Your seat will be released.'}
                            {userStatus === 'WAITLIST' && ' You will be removed from the waitlist.'}
                        </p>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setCancelModalOpen(false)}
                                disabled={isCancelling}
                                className="flex-1 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50"
                            >
                                Keep Registration
                            </button>
                            <button 
                                onClick={handleCancelRegistration}
                                disabled={isCancelling}
                                className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isCancelling ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <XCircle className="w-4 h-4" />
                                        Cancel Registration
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

