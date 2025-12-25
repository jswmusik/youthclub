'use client';

import React, { useState, useEffect } from 'react';
import { analyticsApi, AnalyticsResponse } from '@/lib/analytics-api';
import MetricsGrid from '@/app/components/analytics/MetricsGrid';
import HeatmapChart from '@/app/components/analytics/HeatmapChart';
import InventoryChart from '@/app/components/analytics/InventoryChart';
import AnalyticsFilters from '@/app/components/analytics/AnalyticsFilters';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState('');

  // Default: Last 30 Days
  const [filters, setFilters] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(),
    end_date: new Date().toISOString(),
    genders: [],
    grades: [],
    group_id: null,
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await analyticsApi.getDashboardMetrics(filters);
      setData(result);
    } catch (err) {
      console.error(err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
          <p className="text-slate-500">Real-time insights on visits, inventory, and engagement.</p>
        </div>
      </div>

      {/* 1. Filter Bar */}
      <AnalyticsFilters 
        filters={filters} 
        setFilters={setFilters} 
        onApply={fetchData} 
        isLoading={loading} 
      />

      {/* Error State */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Data Visualization */}
      {data && (
        <div className="space-y-6 animate-in fade-in duration-500">
          
          {/* A. Key Metrics Cards */}
          <MetricsGrid 
            traffic={data.traffic} 
            inventory={data.inventory}
            network={data.network}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* B. Traffic Heatmap */}
            <HeatmapChart data={data.heatmap} />

            {/* C. Top Inventory Items */}
            <InventoryChart data={data.inventory.top_items} />
          </div>

          {/* D. Retention & Network Insight (Text Block) */}
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

