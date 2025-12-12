'use client';

import { VisitAnalytics } from '@/types/visit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  stats: VisitAnalytics;
  loading?: boolean;
}

export default function UserVisitsAnalytics({ stats, loading }: Props) {
  if (loading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-lg" />)}
    </div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Check-ins */}
      <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Total Check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#4D4DA4]">{stats.total_checkins}</div>
        </CardContent>
      </Card>

      {/* Avg Check-ins / Week */}
      <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Avg Check-ins / Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#4D4DA4]">{stats.avg_weekly_visits}</div>
        </CardContent>
      </Card>

      {/* Avg Duration */}
      <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Avg Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#4D4DA4]">{stats.avg_duration_minutes}m</div>
        </CardContent>
      </Card>

      {/* Different Clubs Visited */}
      <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Clubs Visited</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#4D4DA4]">{stats.clubs_visited_count}</div>
        </CardContent>
      </Card>
    </div>
  );
}

