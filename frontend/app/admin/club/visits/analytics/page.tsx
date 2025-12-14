'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { visits } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Users, UserCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VisitsTabs from '@/app/components/visits/VisitsTabs';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30); // Days

  // Extract club ID from user
  const assignedClub = user?.assigned_club;
  const clubId = typeof assignedClub === 'object' && assignedClub !== null 
    ? String((assignedClub as any).id)
    : typeof assignedClub === 'number' 
    ? String(assignedClub)
    : null;

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      // Calculate start date based on period
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - period);
      
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      try {
        const res = await visits.getAnalytics({ start_date: startStr, end_date: endStr });
        setStats(res.data);
      } catch (e) {
        console.error('Failed to load analytics', e);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    if (clubId) {
      loadStats();
    }
  }, [period, clubId]);

  if (!clubId) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Back Link */}
      <div>
        <Link href="/admin/club/details">
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back to Club
          </Button>
        </Link>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Visits & Attendance</h1>
          <p className="text-gray-500 mt-1">Analytics & Insights for your club.</p>
        </div>
      </div>

      {/* Tabs */}
      <VisitsTabs 
        clubId={clubId} 
        basePath="/admin/club"
        liveHref="/admin/club/visits"
        historyHref="/admin/club/visits/history"
        analyticsHref="/admin/club/visits/analytics"
      />

      {/* Period Selector */}
      <div className="flex justify-end">
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={period === d ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(d)}
              className={period === d 
                ? 'bg-[#4D4DA4] hover:bg-[#FF5485] text-white' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            >
              {d} Days
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 flex justify-center text-gray-400">
            <div className="animate-pulse">Loading analytics...</div>
          </div>
        </Card>
      ) : !stats ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">Failed to load analytics data or no data available.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Analytics Dashboard */}
          <Card className="border-0 shadow-sm bg-gray-900">
            <CardHeader className="px-4 sm:px-6 py-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-400" />
                <CardTitle className="text-sm font-semibold text-white drop-shadow-[0_0_8px_rgba(77,77,164,0.6)]" style={{ textShadow: '0 0 8px rgba(255, 84, 133, 0.4), 0 0 12px rgba(77, 77, 164, 0.3)' }}>
                  Analytics Dashboard
                </CardTitle>
              </div>
              <p className="text-xs text-gray-400 mt-1">Data for the last {period} days</p>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Card 1: Total Visits */}
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
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-sm font-medium text-white/90">Total Visits</CardTitle>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white">{stats.summary?.total_visits || 0}</div>
                  </div>
                </Card>

                {/* Card 2: Unique Youth */}
                <Card className="bg-white/5 backdrop-blur-sm border border-[#0EA5E9]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                  style={{
                    boxShadow: '0 4px 20px rgba(14, 165, 233, 0.3), 0 0 20px rgba(14, 165, 233, 0.2)',
                  }}>
                  <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] flex items-center justify-center shadow-lg"
                        style={{
                          boxShadow: '0 4px 15px rgba(14, 165, 233, 0.5), 0 0 20px rgba(14, 165, 233, 0.3)',
                        }}>
                        <UserCheck className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-sm font-medium text-white/90">Unique Youth</CardTitle>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white">{stats.summary?.unique_visitors || 0}</div>
                  </div>
                </Card>

                {/* Card 3: Avg Visits per Youth */}
                <Card className="bg-white/5 backdrop-blur-sm border border-[#10B981]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                  style={{
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3), 0 0 20px rgba(16, 185, 129, 0.2)',
                  }}>
                  <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center shadow-lg"
                        style={{
                          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.5), 0 0 20px rgba(16, 185, 129, 0.3)',
                        }}>
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-sm font-medium text-white/90">Avg. Visits / Youth</CardTitle>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white">
                      {stats.summary?.unique_visitors 
                        ? (stats.summary.total_visits / stats.summary.unique_visitors).toFixed(1) 
                        : '0.0'}
                    </div>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graph: Visits Over Time */}
            <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-[#4D4DA4] rounded-full"></div>
                  <CardTitle className="text-xl font-bold text-[#121213] flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[#4D4DA4]" />
                    Visits Trend
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {stats.timeline && stats.timeline.length > 0 ? (
                  <>
                    <div className="h-64 flex items-end gap-2">
                      {stats.timeline.map((day: any) => {
                        const max = Math.max(...stats.timeline.map((t: any) => t.count), 1);
                        const height = (day.count / max) * 100;
                        
                        return (
                          <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded whitespace-nowrap z-10 shadow-lg">
                              {new Date(day.date).toLocaleDateString()}: {day.count} {day.count === 1 ? 'visit' : 'visits'}
                            </div>
                            <div 
                              style={{ height: `${height}%` }} 
                              className="w-full bg-gradient-to-t from-[#4D4DA4] to-[#FF5485] hover:from-[#FF5485] hover:to-[#4D4DA4] transition-all rounded-t-sm cursor-pointer shadow-sm"
                              title={`${new Date(day.date).toLocaleDateString()}: ${day.count}`}
                            ></div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-2 border-t border-gray-100 pt-2">
                      <span>{period} days ago</span>
                      <span>Today</span>
                    </div>
                  </>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    No data available for this period
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart: Demographics (Gender) */}
            <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-[#FF5485] rounded-full"></div>
                  <CardTitle className="text-xl font-bold text-[#121213] flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#FF5485]" />
                    Gender Distribution
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {stats.demographics && stats.demographics.length > 0 ? (
                  <div className="space-y-4">
                    {stats.demographics.map((item: any) => {
                      const total = stats.summary?.unique_visitors || 1;
                      const percent = Math.round((item.count / total) * 100);
                      const genderLabel = item.user__legal_gender || 'Not Specified';
                      
                      return (
                        <div key={item.user__legal_gender || 'none'}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-semibold text-[#121213] capitalize">{genderLabel.toLowerCase()}</span>
                            <span className="text-gray-600">{item.count} ({percent}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-[#4D4DA4] to-[#FF5485] h-3 rounded-full transition-all shadow-sm" 
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-8">
                    No demographic data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

