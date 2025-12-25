'use client';

import React from 'react';

interface ComparisonData {
  club_name: string;
  visits: number;
  unique_users: number;
  new_members: number;
  utilization: number;
}

interface Props {
  data: ComparisonData[];
}

export default function ClubComparisonTable({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800">Club Comparison</h3>
        <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded">
          Ranked by Traffic
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-4 py-3">Club Name</th>
              <th className="px-4 py-3 text-right">Total Visits</th>
              <th className="px-4 py-3 text-right">Unique Youths</th>
              <th className="px-4 py-3 text-right">Visits/User</th>
              <th className="px-4 py-3 text-right">New Members</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((club, index) => (
              <tr key={club.club_name} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                    index === 1 ? 'bg-slate-200 text-slate-700' : 
                    index === 2 ? 'bg-orange-100 text-orange-800' : 
                    'bg-slate-50 text-slate-400'
                  }`}>
                    {index + 1}
                  </span>
                  {club.club_name}
                </td>
                <td className="px-4 py-3 text-right font-medium">{club.visits}</td>
                <td className="px-4 py-3 text-right text-slate-500">{club.unique_users}</td>
                <td className="px-4 py-3 text-right text-slate-500">{club.utilization}</td>
                <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                  {club.new_members > 0 ? `+${club.new_members}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

