import React from 'react';

export default function ClubEvents() {
  return (
    <div className="py-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 text-purple-600 mb-4">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Upcoming Events</h3>
      <p className="text-gray-500 mt-2 max-w-md mx-auto">
        We are working on the events feature! Check back soon to see parties, workshops, and trips organized by this club.
      </p>
    </div>
  );
}

