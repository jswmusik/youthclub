'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3, Users, TrendingUp } from 'lucide-react';
import { visits } from '@/lib/api';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SuperClubAnalyticsPage() {
  const pathname = usePathname();
  const params = useParams();
  const clubId = params?.id as string;
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
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
    loadStats();
  }, [period]);

  const isActiveTab = (href: string) => pathname === href;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-6">
      {/* Back Link */}
      <div>
        <Link href={`/admin/super/clubs/${clubId}`}>
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back to Club
          </Button>
        </Link>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#121213]">Visits & Attendance</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Analytics & Insights for this club.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 overflow-x-auto">
        <nav className="flex space-x-4 md:space-x-8 min-w-max md:min-w-0">
          <Link 
            href={`/admin/super/clubs/${clubId}/visits`}
            className={`border-b-2 pb-3 md:pb-4 px-1 text-sm font-medium whitespace-nowrap -mb-px transition-colors ${
              isActiveTab(`/admin/super/clubs/${clubId}/visits`) 
                ? 'border-[#4D4DA4] text-[#4D4DA4]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Live Attendance
          </Link>
          <Link 
            href={`/admin/super/clubs/${clubId}/visits/history`}
            className={`border-b-2 pb-3 md:pb-4 px-1 text-sm font-medium whitespace-nowrap -mb-px transition-colors ${
              isActiveTab(`/admin/super/clubs/${clubId}/visits/history`) 
                ? 'border-[#4D4DA4] text-[#4D4DA4]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            History Log
          </Link>
          <button className="border-b-2 border-[#4D4DA4] pb-3 md:pb-4 px-1 text-sm font-medium text-[#4D4DA4] -mb-px whitespace-nowrap">
            Analytics
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4D4DA4] mx-auto mb-4"></div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      ) : !stats ? (
        <div className="py-20 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500">Failed to load analytics data or no data available.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-[#121213]">Analytics & Insights</h2>
              <p className="text-sm text-gray-500 mt-1">Data for the last {period} days.</p>
            </div>
            <div className="flex gap-2">
              {[7, 30, 90].map((d) => (
                <Button
                  key={d}
                  variant={period === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod(d)}
                  className={period === d 
                    ? 'bg-[#4D4DA4] hover:bg-[#4D4DA4]/90 text-white' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                >
                  {d} Days
                </Button>
              ))}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Total Visits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl md:text-4xl font-bold text-[#4D4DA4]">{stats.summary?.total_visits || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Unique Youth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl md:text-4xl font-bold text-[#4D4DA4]">{stats.summary?.unique_visitors || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm sm:col-span-2 lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Avg. Visits / Youth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl md:text-4xl font-bold text-[#4D4DA4]">
                  {stats.summary?.unique_visitors 
                    ? (stats.summary.total_visits / stats.summary.unique_visitors).toFixed(1) 
                    : '0.0'}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
            {/* Graph: Visits Over Time */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base md:text-lg font-semibold text-[#121213]">Visits Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.timeline && stats.timeline.length > 0 ? (
                  <>
                    <div className="h-48 md:h-64 flex items-end gap-1 md:gap-2 overflow-x-auto pb-2">
                      {stats.timeline.map((day: any) => {
                        const max = Math.max(...stats.timeline.map((t: any) => t.count), 1);
                        const height = (day.count / max) * 100;
                        
                        return (
                          <div key={day.date} className="flex-1 min-w-[20px] flex flex-col items-center group relative">
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#121213] text-white text-xs p-2 rounded whitespace-nowrap z-10 shadow-lg">
                              {new Date(day.date).toLocaleDateString()}: {day.count} {day.count === 1 ? 'visit' : 'visits'}
                            </div>
                            <div 
                              style={{ height: `${height}%` }} 
                              className="w-full bg-[#4D4DA4] hover:bg-[#FF5485] transition-colors rounded-t-sm cursor-pointer min-h-[4px]"
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
                  <div className="h-48 md:h-64 flex items-center justify-center text-gray-400">
                    No data available for this period
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart: Demographics (Gender) */}
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base md:text-lg font-semibold text-[#121213]">Gender Distribution</CardTitle>
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
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-[#121213] capitalize">{genderLabel.toLowerCase()}</span>
                            <span className="text-gray-500">{item.count} ({percent}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3">
                            <div 
                              className="bg-[#4D4DA4] h-3 rounded-full transition-all" 
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

