'use client';

import { VisitAnalytics } from '@/types/visit';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Calendar, Clock, Building2 } from 'lucide-react';

interface Props {
  stats: VisitAnalytics;
  loading?: boolean;
}

export default function UserVisitsAnalytics({ stats, loading }: Props) {
  if (loading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl" />)}
    </div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Total Check-ins */}
      <Card className="bg-white/5 backdrop-blur-sm border border-[#4D4DA4]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
        style={{
          boxShadow: '0 4px 20px rgba(77, 77, 164, 0.3), 0 0 20px rgba(255, 84, 133, 0.2)',
        }}>
        <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4D4DA4] to-[#FF5485] flex items-center justify-center shadow-lg"
              style={{
                boxShadow: '0 4px 15px rgba(77, 77, 164, 0.5), 0 0 20px rgba(255, 84, 133, 0.3)',
              }}>
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-sm font-medium text-white/90">Total Check-ins</CardTitle>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">{stats.total_checkins}</div>
        </div>
      </Card>

      {/* Avg Check-ins / Week */}
      <Card className="bg-white/5 backdrop-blur-sm border border-[#0EA5E9]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
        style={{
          boxShadow: '0 4px 20px rgba(14, 165, 233, 0.3), 0 0 20px rgba(56, 189, 248, 0.2)',
        }}>
        <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] flex items-center justify-center shadow-lg"
              style={{
                boxShadow: '0 4px 15px rgba(14, 165, 233, 0.5), 0 0 20px rgba(56, 189, 248, 0.3)',
              }}>
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-sm font-medium text-white/90">Avg Check-ins / Week</CardTitle>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">{stats.avg_weekly_visits}</div>
        </div>
      </Card>

      {/* Avg Duration */}
      <Card className="bg-white/5 backdrop-blur-sm border border-[#10B981]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
        style={{
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3), 0 0 20px rgba(52, 211, 153, 0.2)',
        }}>
        <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center shadow-lg"
              style={{
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.5), 0 0 20px rgba(52, 211, 153, 0.3)',
              }}>
              <Clock className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-sm font-medium text-white/90">Avg Duration</CardTitle>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">{stats.avg_duration_minutes}m</div>
        </div>
      </Card>

      {/* Different Clubs Visited */}
      <Card className="bg-white/5 backdrop-blur-sm border border-[#FF5485]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
        style={{
          boxShadow: '0 4px 20px rgba(255, 84, 133, 0.3), 0 0 20px rgba(255, 84, 133, 0.2)',
        }}>
        <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5485] to-[#FF8FA3] flex items-center justify-center shadow-lg"
              style={{
                boxShadow: '0 4px 15px rgba(255, 84, 133, 0.5), 0 0 20px rgba(255, 143, 163, 0.3)',
              }}>
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-sm font-medium text-white/90">Clubs Visited</CardTitle>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">{stats.clubs_visited_count}</div>
        </div>
      </Card>
    </div>
  );
}

