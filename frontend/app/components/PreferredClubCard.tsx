'use client';

import { useRouter } from 'next/navigation';
import { getMediaUrl } from '../utils';

interface RegularOpeningHour {
    id: number;
    weekday: number; // 1-7 (Monday-Sunday)
    weekday_display: string;
    open_time: string; // "HH:MM:SS" format
    close_time: string; // "HH:MM:SS" format
    title?: string;
    week_cycle?: string;
}

interface PreferredClubCardProps {
    club: {
        id: number;
        name: string;
        avatar?: string | null;
        regular_hours?: RegularOpeningHour[];
    } | null;
}

export default function PreferredClubCard({ club }: PreferredClubCardProps) {
    const router = useRouter();

    if (!club) {
        return null;
    }

    // Get today's weekday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    // Convert to match backend format (1 = Monday, 7 = Sunday)
    const today = new Date();
    const todayWeekday = today.getDay() === 0 ? 7 : today.getDay();
    const currentTime = today.toTimeString().slice(0, 5); // "HH:MM" format

    // Find today's opening hours
    const todayHours = club.regular_hours?.filter(hour => {
        if (hour.weekday !== todayWeekday) return false;
        
        // Check week cycle if applicable
        if (hour.week_cycle && hour.week_cycle !== 'ALL') {
            const weekNumber = getWeekNumber(today);
            if (hour.week_cycle === 'ODD' && weekNumber % 2 === 0) return false;
            if (hour.week_cycle === 'EVEN' && weekNumber % 2 === 1) return false;
        }
        
        return true;
    }) || [];

    // Check if club is currently open
    const isOpen = todayHours.some(hour => {
        const openTime = hour.open_time.slice(0, 5); // "HH:MM"
        const closeTime = hour.close_time.slice(0, 5); // "HH:MM"
        return currentTime >= openTime && currentTime <= closeTime;
    });

    // Find next opening time
    const getNextOpening = () => {
        if (todayHours.length > 0 && !isOpen) {
            // Check if there's a later time slot today
            const laterToday = todayHours.find(hour => {
                const openTime = hour.open_time.slice(0, 5);
                return openTime > currentTime;
            });
            
            if (laterToday) {
                return {
                    day: 'Today',
                    time: laterToday.open_time.slice(0, 5)
                };
            }
        }

        // Look for next day with opening hours
        for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + dayOffset);
            const checkWeekday = checkDate.getDay() === 0 ? 7 : checkDate.getDay();
            
            const dayHours = club.regular_hours?.filter(hour => {
                if (hour.weekday !== checkWeekday) return false;
                if (hour.week_cycle && hour.week_cycle !== 'ALL') {
                    const weekNumber = getWeekNumber(checkDate);
                    if (hour.week_cycle === 'ODD' && weekNumber % 2 === 0) return false;
                    if (hour.week_cycle === 'EVEN' && weekNumber % 2 === 1) return false;
                }
                return true;
            }) || [];

            if (dayHours.length > 0) {
                const firstHour = dayHours.sort((a, b) => 
                    a.open_time.localeCompare(b.open_time)
                )[0];
                const dayName = dayOffset === 1 ? 'Tomorrow' : checkDate.toLocaleDateString('en-US', { weekday: 'long' });
                return {
                    day: dayName,
                    time: firstHour.open_time.slice(0, 5)
                };
            }
        }

        return null;
    };

    const nextOpening = getNextOpening();

    // Format time for display
    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
            <div className="flex items-center gap-4 mb-4">
                {club.avatar ? (
                    <img 
                        src={getMediaUrl(club.avatar) || ''} 
                        alt={club.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-200">
                        <span className="text-blue-600 font-bold text-xl">
                            {club.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-lg truncate">{club.name}</h3>
                    <p className="text-sm text-gray-500">My Club</p>
                </div>
            </div>

            {/* Opening Hours Status */}
            <div className="mb-4">
                {todayHours.length === 0 ? (
                    <div className="flex items-center gap-2 text-gray-600">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        <span className="text-sm font-medium">Closed today</span>
                    </div>
                ) : isOpen ? (
                    <div className="flex items-center gap-2 text-green-600">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm font-semibold">Open now</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-gray-600">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        <span className="text-sm font-medium">Closed</span>
                    </div>
                )}

                {/* Today's Hours */}
                {todayHours.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {todayHours.map((hour, index) => (
                            <div key={hour.id || index} className="text-sm text-gray-700">
                                {hour.title && (
                                    <span className="font-medium">{hour.title}: </span>
                                )}
                                <span>{formatTime(hour.open_time)} - {formatTime(hour.close_time)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Next Opening Time */}
                {!isOpen && nextOpening && (
                    <div className="mt-2 text-xs text-gray-500">
                        Opens {nextOpening.day} at {formatTime(nextOpening.time)}
                    </div>
                )}
            </div>

            {/* View Club Button */}
            <button
                onClick={() => router.push(`/dashboard/youth/clubs/${club.id}`)}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            >
                View Club
            </button>
        </div>
    );
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

