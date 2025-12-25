'use client';

import React, { useState, useEffect } from 'react';
import { analyticsApi, AnalyticsResponse } from '@/lib/analytics-api';
import MetricsGrid from '@/app/components/analytics/MetricsGrid';
import HeatmapChart from '@/app/components/analytics/HeatmapChart';
import InventoryChart from '@/app/components/analytics/InventoryChart';
import ClubComparisonTable from '@/app/components/analytics/ClubComparisonTable';
import AnalyticsFilters from '@/app/components/analytics/AnalyticsFilters';
import { Loader2, AlertCircle } from 'lucide-react';

export default function MunicipalityAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(),
    end_date: new Date().toISOString(),
    genders: [],
    grades: [],
    group_id: null,
    club_id: null, // Municipality view starts showing ALL clubs
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await analyticsApi.getDashboardMetrics(filters);
      setData(result);
    } catch (err) {
      console.error(err);
      setError('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Municipality Overview</h1>
        <p className="text-slate-500">Aggregated analytics across all clubs.</p>
      </div>

      <AnalyticsFilters 
        filters={filters} 
        setFilters={setFilters} 
        onApply={fetchData} 
        isLoading={loading} 
      />

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex justify-center h-64 items-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {data && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* 1. High Level Metrics (Includes Network/Nomad Metric) */}
          <MetricsGrid 
            traffic={data.traffic} 
            inventory={data.inventory} 
            network={data.network}
          />

          {/* 2. The League Table (Unique to Municipality) */}
          {/* We only show this if we are looking at ALL clubs (club_id is null) */}
          {!filters.club_id && data.comparison && (
            <ClubComparisonTable data={data.comparison} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HeatmapChart data={data.heatmap} />
            <InventoryChart data={data.inventory.top_items} />
          </div>

          {/* Retention & Network Insight (Text Block) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-2">💡 Retention Insight</h3>
                <p className="text-sm text-slate-600">
                  <span className="font-bold text-blue-600">{data.traffic.retention_rate}%</span> of youths who visited last month returned this month.
                  {data.traffic.retention_rate < 30 
                    ? " This is below average. Consider organizing a 'Come Back' event." 
                    : " This is a healthy retention rate!"}
                </p>
             </div>
             {data.network && (
               <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                  <h3 className="font-semibold text-slate-800 mb-2">🌍 Network Insight</h3>
                  <p className="text-sm text-slate-600">
                    <span className="font-bold text-purple-600">{data.network.nomad_percentage}%</span> of your members visit other clubs in the municipality.
                  </p>
               </div>
             )}
          </div>

        </div>
      )}
    </div>
  );
}

