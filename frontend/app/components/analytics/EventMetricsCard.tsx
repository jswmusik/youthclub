'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Users, Trophy, Target, CheckCircle, Clock, XCircle } from 'lucide-react';
import { EventMetrics } from '@/lib/analytics-api';

interface Props {
  events: EventMetrics;
}

// Status badge styling
const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  ATTENDED: { 
    bg: 'bg-[var(--brand-green)]/20 border-[var(--brand-green)]/30', 
    text: 'text-[var(--brand-green)]',
    icon: <CheckCircle className="w-3 h-3" />
  },
  APPROVED: { 
    bg: 'bg-[var(--brand-blue)]/20 border-[var(--brand-blue)]/30', 
    text: 'text-[var(--brand-blue)]',
    icon: <CheckCircle className="w-3 h-3" />
  },
  PENDING: { 
    bg: 'bg-[#F97316]/20 border-[#F97316]/30', 
    text: 'text-[#F97316]',
    icon: <Clock className="w-3 h-3" />
  },
  CANCELLED: { 
    bg: 'bg-[var(--brand-red)]/20 border-[var(--brand-red)]/30', 
    text: 'text-[var(--brand-red)]',
    icon: <XCircle className="w-3 h-3" />
  },
};

export default function EventMetricsCard({ events }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 250);
    return () => clearTimeout(timer);
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] overflow-hidden transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-[var(--dark-600)]">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[#A78BFA] flex items-center justify-center shadow-lg shadow-[var(--brand-purple)]/20">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--brand-light)]">Event Analytics</h3>
            <p className="text-xs text-[var(--brand-light)]/50">Performance overview</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-6">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-[var(--brand-purple)] group-hover:scale-110 transition-transform" />
              <span className="text-xs text-[var(--brand-light)]/50">Events</span>
            </div>
            <div className="text-2xl font-bold text-[var(--brand-purple)]">{events.total_events}</div>
          </div>
          
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[var(--brand-green)] group-hover:scale-110 transition-transform" />
              <span className="text-xs text-[var(--brand-light)]/50">Registrations</span>
            </div>
            <div className="text-2xl font-bold text-[var(--brand-green)]">{events.total_registrations}</div>
          </div>
          
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[#F97316]/50 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-[#F97316] group-hover:scale-110 transition-transform" />
              <span className="text-xs text-[var(--brand-light)]/50">Show-up Rate</span>
            </div>
            <div className="text-2xl font-bold text-[#F97316]">{events.show_up_rate}%</div>
          </div>
          
          <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-[var(--brand-blue)] group-hover:scale-110 transition-transform" />
              <span className="text-xs text-[var(--brand-light)]/50">Avg. Capacity</span>
            </div>
            <div className="text-2xl font-bold text-[var(--brand-blue)]">{events.avg_capacity_utilization}%</div>
          </div>
        </div>

        {/* Status Breakdown */}
        {events.status_breakdown && events.status_breakdown.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-[var(--brand-light)]/60 mb-3">Registration Status</h4>
            <div className="flex flex-wrap gap-2">
              {events.status_breakdown.map((status) => {
                const style = STATUS_STYLES[status.status] || STATUS_STYLES.PENDING;
                return (
                  <div 
                    key={status.status} 
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${style.bg} ${style.text} border`}
                  >
                    {style.icon}
                    {status.status}: {status.count}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Events */}
        {events.top_events && events.top_events.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[var(--brand-light)]/60 mb-3">Top Events by Registrations</h4>
            <div className="space-y-2">
              {events.top_events.map((event, index) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-3 bg-[var(--dark-700)] rounded-xl hover:bg-[var(--dark-600)] transition-all border border-[var(--dark-500)] group"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: isVisible ? 'slideIn 0.3s ease-out forwards' : 'none'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold ${
                      index === 0 ? 'bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30' :
                      index === 1 ? 'bg-[var(--brand-light)]/10 text-[var(--brand-light)]/70 border border-[var(--brand-light)]/20' :
                      index === 2 ? 'bg-[#FB923C]/20 text-[#FB923C] border border-[#FB923C]/30' :
                      'bg-[var(--dark-600)] text-[var(--brand-light)]/40 border border-[var(--dark-500)]'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium text-[var(--brand-light)] text-sm group-hover:text-[var(--brand-primary)] transition-colors">
                        {event.title}
                      </div>
                      <div className="text-xs text-[var(--brand-light)]/40">{formatDate(event.start_date)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[var(--brand-light)]/40" />
                    <span className="font-semibold text-[var(--brand-light)]">
                      {event.registration_count}
                      {event.max_seats && (
                        <span className="text-[var(--brand-light)]/40 font-normal">/{event.max_seats}</span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {events.total_events === 0 && (
          <div className="text-center py-12 text-[var(--brand-light)]/40">
            <Calendar className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No events in this period</p>
            <p className="text-sm mt-1">Create an event to start tracking analytics</p>
          </div>
        )}
      </div>
      
      <style jsx global>{`
        @keyframes slideIn {
          from { 
            opacity: 0; 
            transform: translateX(-10px); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }
      `}</style>
    </div>
  );
}
