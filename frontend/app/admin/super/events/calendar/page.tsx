'use client';

import EventCalendar from '@/app/components/events/EventCalendar';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EventCalendarPage() {
    return (
        <div className="p-4 md:p-8 space-y-6 min-h-screen">
            {/* Header */}
            <div className="space-y-4">
                {/* Top row: Back button and New Event button */}
                <div className="flex items-center justify-between">
                    <Link href="/admin/super/events">
                        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Events
                        </Button>
                    </Link>
                    <Link href="/admin/super/events/create">
                        <Button 
                            size="sm" 
                            className="gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">New Event</span>
                        </Button>
                    </Link>
                </div>
                
                {/* Title and description */}
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#121213]">Event Calendar</h1>
                    <p className="text-sm text-muted-foreground mt-1">View and manage events in calendar format.</p>
                </div>
            </div>
            
            <div className="h-[calc(100vh-200px)] min-h-[600px] flex flex-col">
                <EventCalendar scope="SUPER" />
            </div>
        </div>
    );
}

