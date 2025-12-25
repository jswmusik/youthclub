'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Event } from '@/types/event';
import EventCard from '@/app/components/events/youth/EventCard';
import { Calendar, ChevronRight } from 'lucide-react';

interface ClubEventsProps {
  clubId: number;
  darkMode?: boolean;
}

export default function ClubEvents({ clubId, darkMode = false }: ClubEventsProps) {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch ALL published events for this club that haven't started yet (upcoming)
      const now = new Date().toISOString();
      const response = await api.get(`/events/`, {
        params: {
          club: clubId,
          status: 'PUBLISHED',
          start_date__gte: now,
          ordering: 'start_date',
          page_size: 100 // Fetch all upcoming events (high limit)
        }
      });
      
      const eventsData = response.data.results || response.data;
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (err) {
      console.error('Error fetching club events:', err);
      setError('Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    if (clubId) {
      fetchEvents();
    }
  }, [clubId, fetchEvents]);

  if (loading) {
    return (
      <div className={`py-12 text-center ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
        <div className={`rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto animate-spin ${
          darkMode ? 'border-[var(--brand-primary)]' : 'border-blue-500'
        }`}></div>
        <p className="mt-4">Loading events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`py-8 text-center ${darkMode ? 'text-[var(--brand-red)]' : 'text-red-500'}`}>
        {error}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-16 text-center px-4 sm:px-0">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
          darkMode 
            ? 'bg-[var(--brand-purple)]/20 text-[var(--brand-purple)]' 
            : 'bg-purple-100 text-purple-600'
        }`}>
          <Calendar className="w-8 h-8" />
        </div>
        <h3 className={`text-lg font-bold font-heading ${
          darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
        }`}>No Upcoming Events</h3>
        <p className={`mt-2 max-w-md mx-auto ${
          darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'
        }`}>
          This club doesn't have any upcoming events at the moment. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="px-0 sm:px-0">
      {/* Header */}
      <div className="px-4 sm:px-0 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-bold font-heading ${
              darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
            }`}>Upcoming Events</h2>
            <p className={`text-sm mt-1 ${
              darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'
            }`}>
              {events.length} event{events.length !== 1 ? 's' : ''} coming up
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/youth/events')}
            className={`flex items-center gap-1 text-sm font-medium transition-colors ${
              darkMode 
                ? 'text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80' 
                : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            View All Events
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-2 sm:space-y-4">
        {events.map((event) => (
          <EventCard 
            key={event.id} 
            event={event}
            darkMode={darkMode}
          />
        ))}
      </div>
    </div>
  );
}
