'use client';

import { useState, useEffect } from 'react';
import { visits } from '@/lib/api';
import Link from 'next/link';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30); // Days

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
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [period]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Visits & Attendance</h1>
            <p className="text-slate-500">Manage check-ins for your club</p>
          </div>
          
          <div className="flex space-x-3">
            <Link 
              href="/admin/club/visits/kiosk" 
              target="_blank"
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center shadow-sm"
            >
              Launch Kiosk Screen ↗
            </Link>
            
            <Link
              href="/admin/club/visits"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
            >
              + Manual Check-in
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-6">
          <nav className="flex space-x-8">
            <Link 
              href="/admin/club/visits"
              className="border-b-2 border-transparent pb-4 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300"
            >
              Live Attendance
            </Link>
            <Link 
              href="/admin/club/visits/history"
              className="border-b-2 border-transparent pb-4 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300"
            >
              History Log
            </Link>
            <button className="border-b-2 border-emerald-500 pb-4 px-1 text-sm font-medium text-emerald-600">
              Analytics
            </button>
          </nav>
        </div>

        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Visits & Attendance</h1>
            <p className="text-slate-500">Manage check-ins for your club</p>
          </div>
          
          <div className="flex space-x-3">
            <Link 
              href="/admin/club/visits/kiosk" 
              target="_blank"
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center shadow-sm"
            >
              Launch Kiosk Screen ↗
            </Link>
            
            <Link
              href="/admin/club/visits"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
            >
              + Manual Check-in
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-6">
          <nav className="flex space-x-8">
            <Link 
              href="/admin/club/visits"
              className="border-b-2 border-transparent pb-4 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300"
            >
              Live Attendance
            </Link>
            <Link 
              href="/admin/club/visits/history"
              className="border-b-2 border-transparent pb-4 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300"
            >
              History Log
            </Link>
            <button className="border-b-2 border-emerald-500 pb-4 px-1 text-sm font-medium text-emerald-600">
              Analytics
            </button>
          </nav>
        </div>

        <div className="text-center py-12">
          <p className="text-slate-500">Failed to load analytics data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visits & Attendance</h1>
          <p className="text-slate-500">Manage check-ins for your club</p>
        </div>
        
        <div className="flex space-x-3">
          {/* Button to open the Kiosk in a new tab */}
          <Link 
            href="/admin/club/visits/kiosk" 
            target="_blank"
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center shadow-sm"
          >
            Launch Kiosk Screen ↗
          </Link>
          
          {/* Button for Manual Entry */}
          <Link
            href="/admin/club/visits"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
          >
            + Manual Check-in
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-8">
          <Link 
            href="/admin/club/visits"
            className="border-b-2 border-transparent pb-4 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300"
          >
            Live Attendance
          </Link>
          <Link 
            href="/admin/club/visits/history"
            className="border-b-2 border-transparent pb-4 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300"
          >
            History Log
          </Link>
          <button className="border-b-2 border-emerald-500 pb-4 px-1 text-sm font-medium text-emerald-600">
            Analytics
          </button>
        </nav>
      </div>

      {/* Period Selector */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Analytics & Insights</h2>
          <p className="text-slate-500">Data for the last {period} days.</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button 
              key={d} 
              onClick={() => setPeriod(d)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                period === d 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500 font-bold uppercase">Total Visits</div>
          <div className="text-4xl font-bold text-slate-900 mt-2">{stats.summary?.total_visits || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500 font-bold uppercase">Unique Youth</div>
          <div className="text-4xl font-bold text-emerald-600 mt-2">{stats.summary?.unique_visitors || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500 font-bold uppercase">Avg. Visits / Youth</div>
          <div className="text-4xl font-bold text-blue-600 mt-2">
            {stats.summary?.unique_visitors 
              ? (stats.summary.total_visits / stats.summary.unique_visitors).toFixed(1) 
              : '0.0'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Graph: Visits Over Time */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6">Visits Trend</h3>
          {stats.timeline && stats.timeline.length > 0 ? (
            <>
              <div className="h-64 flex items-end gap-2">
                {stats.timeline.map((day: any) => {
                  // Normalize height for display (max height 100% based on max value)
                  const max = Math.max(...stats.timeline.map((t: any) => t.count), 1);
                  const height = (day.count / max) * 100;
                  
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs p-2 rounded whitespace-nowrap z-10 shadow-lg">
                        {new Date(day.date).toLocaleDateString()}: {day.count} {day.count === 1 ? 'visit' : 'visits'}
                      </div>
                      {/* Bar */}
                      <div 
                        style={{ height: `${height}%` }} 
                        className="w-full bg-blue-100 hover:bg-blue-500 transition-colors rounded-t-sm cursor-pointer"
                        title={`${new Date(day.date).toLocaleDateString()}: ${day.count}`}
                      ></div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-2 border-t pt-2">
                <span>{period} days ago</span>
                <span>Today</span>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No data available for this period
            </div>
          )}
        </div>

        {/* Chart: Demographics (Gender) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6">Gender Distribution</h3>
          {stats.demographics && stats.demographics.length > 0 ? (
            <div className="space-y-4">
              {stats.demographics.map((item: any) => {
                const total = stats.summary?.unique_visitors || 1;
                const percent = Math.round((item.count / total) * 100);
                const genderLabel = item.user__legal_gender || 'Not Specified';
                
                return (
                  <div key={item.user__legal_gender || 'none'}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700 capitalize">{genderLabel.toLowerCase()}</span>
                      <span className="text-slate-500">{item.count} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3">
                      <div 
                        className="bg-emerald-500 h-3 rounded-full transition-all" 
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-slate-400 text-center py-8">
              No demographic data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

