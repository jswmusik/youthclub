import React from 'react';
import { TrafficMetrics, InventoryMetrics } from '@/lib/analytics-api';
import { Users, Clock, ArrowRightLeft, Package, UserCheck } from 'lucide-react';

interface Props {
  traffic: TrafficMetrics;
  inventory: InventoryMetrics;
  network?: { nomad_percentage: number };
}

export default function MetricsGrid({ traffic, inventory, network }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      
      {/* 1. Total Traffic */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-xs font-medium text-slate-400 uppercase">Visits</span>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-slate-900">{traffic.total_visits}</h3>
          <span className="text-sm text-slate-500">total</span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          {traffic.unique_visitors} unique youths
        </div>
      </div>

      {/* 2. Engagement / Duration */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Clock className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-xs font-medium text-slate-400 uppercase">Avg Stay</span>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-slate-900">{traffic.avg_duration_minutes}m</h3>
        </div>
        <div className="mt-2 text-xs text-emerald-600">
          Median time per visit
        </div>
      </div>

      {/* 3. Retention */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-purple-50 rounded-lg">
            <UserCheck className="w-5 h-5 text-purple-600" />
          </div>
          <span className="text-xs font-medium text-slate-400 uppercase">Retention</span>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-slate-900">{traffic.retention_rate}%</h3>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          Returned from prev. period
        </div>
      </div>

      {/* 4. Inventory or Nomad Metric */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-orange-50 rounded-lg">
            {network ? (
              <ArrowRightLeft className="w-5 h-5 text-orange-600" />
            ) : (
              <Package className="w-5 h-5 text-orange-600" />
            )}
          </div>
          <span className="text-xs font-medium text-slate-400 uppercase">
            {network ? 'Nomads' : 'Loans'}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-slate-900">
            {network ? `${network.nomad_percentage}%` : inventory.total_loans}
          </h3>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          {network ? 'Visit >1 club' : 'Items borrowed'}
        </div>
      </div>

    </div>
  );
}

