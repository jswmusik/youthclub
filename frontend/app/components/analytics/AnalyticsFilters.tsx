'use client';

import React from 'react';
import { Filter, Calendar, Users } from 'lucide-react';

interface FilterProps {
  filters: any;
  setFilters: (f: any) => void;
  onApply: () => void;
  isLoading: boolean;
}

export default function AnalyticsFilters({ filters, setFilters, onApply, isLoading }: FilterProps) {
  
  const handleChange = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row gap-4 items-end">
        
        {/* Date Range */}
        <div className="flex-1 grid grid-cols-2 gap-4 w-full md:w-auto">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Start Date
            </label>
            <input
              type="date"
              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.start_date.split('T')[0]}
              onChange={(e) => handleChange('start_date', new Date(e.target.value).toISOString())}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> End Date
            </label>
            <input
              type="date"
              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.end_date.split('T')[0]}
              onChange={(e) => handleChange('end_date', new Date(e.target.value).toISOString())}
            />
          </div>
        </div>

        {/* Demographics */}
        <div className="flex-1 w-full md:w-auto">
          <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
            <Users className="w-3 h-3" /> Gender
          </label>
          <select
            className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            onChange={(e) => handleChange('genders', e.target.value ? [e.target.value] : [])}
          >
            <option value="">All Genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="flex-1 w-full md:w-auto">
          <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Grade
          </label>
          <select
            className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            onChange={(e) => handleChange('grades', e.target.value ? [parseInt(e.target.value)] : [])}
          >
            <option value="">All Grades</option>
            <option value="7">7th Grade</option>
            <option value="8">8th Grade</option>
            <option value="9">9th Grade</option>
          </select>
        </div>

        {/* Action Button */}
        <button
          onClick={onApply}
          disabled={isLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 h-[38px] w-full md:w-auto"
        >
          {isLoading ? 'Updating...' : 'Update Report'}
        </button>
      </div>
    </div>
  );
}

