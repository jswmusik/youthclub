'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Filter, Calendar, Users, ChevronDown, ChevronUp, UsersRound, Heart, Sliders, Building2, Search, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { analyticsApi, FilterOptions } from '@/lib/analytics-api';

interface FilterProps {
  filters: any;
  setFilters: (f: any) => void;
  onApply: () => void;
  isLoading: boolean;
  showClubFilter?: boolean;
}

interface Interest {
  id: number;
  name: string;
}

const ALL_GRADES = [
  { value: 1, label: '1st Grade' },
  { value: 2, label: '2nd Grade' },
  { value: 3, label: '3rd Grade' },
  { value: 4, label: '4th Grade' },
  { value: 5, label: '5th Grade' },
  { value: 6, label: '6th Grade' },
  { value: 7, label: '7th Grade' },
  { value: 8, label: '8th Grade' },
  { value: 9, label: '9th Grade' },
];

const selectArrowStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  backgroundSize: '1rem'
};

export default function AnalyticsFilters({ filters, setFilters, onApply, isLoading, showClubFilter = false }: FilterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const loadFilterOptions = useCallback(async (clubId?: number | null) => {
    try {
      const optionsData = await analyticsApi.getFilterOptions(clubId);
      setFilterOptions(optionsData);
    } catch (err) {
      console.error('Failed to load filter options', err);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingData(true);
      try {
        const [interestsRes] = await Promise.all([
          api.get('/interests/'),
          loadFilterOptions(filters.club_id),
        ]);
        setInterests(Array.isArray(interestsRes.data) ? interestsRes.data : interestsRes.data.results || []);
      } catch (err) {
        console.error('Failed to load filter data', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (showClubFilter) {
      loadFilterOptions(filters.club_id);
    }
  }, [filters.club_id, showClubFilter, loadFilterOptions]);

  const handleChange = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleClubChange = (clubId: number | null) => {
    setFilters((prev: any) => ({
      ...prev,
      club_id: clubId,
      group_id: null,
      custom_fields: {},
    }));
  };

  const handleCustomFieldChange = (fieldId: number, value: string) => {
    setFilters((prev: any) => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [fieldId]: value || null,
      },
    }));
  };

  const handleMultiSelect = (key: string, value: number | string, checked: boolean) => {
    setFilters((prev: any) => {
      const currentValues = prev[key] || [];
      if (checked) {
        return { ...prev, [key]: [...currentValues, value] };
      } else {
        return { ...prev, [key]: currentValues.filter((v: any) => v !== value) };
      }
    });
  };

  const clearFilters = () => {
    setFilters((prev: any) => ({
      ...prev,
      club_id: null,
      group_id: null,
      grades: [],
      genders: [],
      interests: [],
      age_min: null,
      age_max: null,
      custom_fields: {},
    }));
  };

  const hasActiveFilters = 
    filters.club_id ||
    filters.group_id || 
    (filters.grades && filters.grades.length > 0) ||
    (filters.genders && filters.genders.length > 0) ||
    (filters.interests && filters.interests.length > 0) ||
    filters.age_min ||
    filters.age_max ||
    (filters.custom_fields && Object.keys(filters.custom_fields).some(k => filters.custom_fields[k]));

  const isGroupSelected = !!filters.group_id;
  const customFields = filterOptions?.custom_fields || [];

  return (
    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
      {/* Primary Filters */}
      <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Date Range Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Start Date */}
            <div className="col-span-1">
              <label className="text-xs font-medium text-[var(--brand-light)]/50 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Start Date
              </label>
              <input
                type="date"
                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                value={filters.start_date.split('T')[0]}
                onChange={(e) => handleChange('start_date', new Date(e.target.value).toISOString())}
              />
            </div>
            
            {/* End Date */}
            <div className="col-span-1">
              <label className="text-xs font-medium text-[var(--brand-light)]/50 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> End Date
              </label>
              <input
                type="date"
                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                value={filters.end_date.split('T')[0]}
                onChange={(e) => handleChange('end_date', new Date(e.target.value).toISOString())}
              />
            </div>

            {/* Club Filter (Municipality only) */}
            {showClubFilter && filterOptions && filterOptions.clubs.length > 0 && (
              <div className="col-span-1">
                <label className="text-xs font-medium text-[var(--brand-light)]/50 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" /> Club
                </label>
                <select
                  className={`w-full h-10 px-3 bg-[var(--dark-700)] border-2 rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer ${
                    filters.club_id ? 'border-[var(--brand-purple)]' : 'border-[var(--dark-500)]'
                  }`}
                  style={selectArrowStyle}
                  value={filters.club_id || ''}
                  onChange={(e) => handleClubChange(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">All Clubs</option>
                  {filterOptions.clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Group Filter */}
            <div className="col-span-1">
              <label className="text-xs font-medium text-[var(--brand-light)]/50 mb-1.5 flex items-center gap-1.5">
                <UsersRound className="w-3 h-3" /> Group
                {isGroupSelected && <span className="text-[var(--brand-blue)] text-[10px]">(Active)</span>}
              </label>
              <select
                className={`w-full h-10 px-3 bg-[var(--dark-700)] border-2 rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer ${
                  isGroupSelected ? 'border-[var(--brand-blue)]' : 'border-[var(--dark-500)]'
                }`}
                style={selectArrowStyle}
                value={filters.group_id || ''}
                onChange={(e) => handleChange('group_id', e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">All Youth Members</option>
                {filterOptions?.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                    {group.club__name ? ` (${group.club__name})` : ' (Municipality-wide)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div className="col-span-1">
              <label className="text-xs font-medium text-[var(--brand-light)]/50 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Gender
              </label>
              <select
                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer disabled:opacity-50"
                style={selectArrowStyle}
                disabled={isGroupSelected}
                value={filters.genders && filters.genders.length === 1 ? filters.genders[0] : ''}
                onChange={(e) => handleChange('genders', e.target.value ? [e.target.value] : [])}
              >
                <option value="">All Genders</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="col-span-2 sm:col-span-1 flex items-end gap-2">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="h-10 px-3 flex items-center gap-2 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/50 transition-all text-sm"
              >
                <Sliders className="w-4 h-4" />
                <span className="hidden sm:inline">More</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={onApply}
                disabled={isLoading}
                className="flex-1 h-10 flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-4 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span className="text-sm">{isLoading ? 'Loading...' : 'Update'}</span>
              </button>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--dark-600)]">
              <span className="text-xs text-[var(--brand-light)]/40">Active:</span>
              <div className="flex flex-wrap gap-1.5">
                {filters.club_id && filterOptions && (
                  <span className="px-2 py-0.5 bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] rounded-full text-xs font-medium border border-[var(--brand-purple)]/30">
                    Club: {filterOptions.clubs.find(c => c.id === filters.club_id)?.name}
                  </span>
                )}
                {isGroupSelected && filterOptions && (
                  <span className="px-2 py-0.5 bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] rounded-full text-xs font-medium border border-[var(--brand-blue)]/30">
                    Group: {filterOptions.groups.find(g => g.id === filters.group_id)?.name}
                  </span>
                )}
                {!isGroupSelected && filters.grades?.length > 0 && (
                  <span className="px-2 py-0.5 bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] rounded-full text-xs font-medium border border-[var(--brand-purple)]/30">
                    {filters.grades.length} grade(s)
                  </span>
                )}
                {!isGroupSelected && filters.genders?.length > 0 && (
                  <span className="px-2 py-0.5 bg-[#EC4899]/20 text-[#EC4899] rounded-full text-xs font-medium border border-[#EC4899]/30">
                    {filters.genders.join(', ')}
                  </span>
                )}
                {!isGroupSelected && filters.interests?.length > 0 && (
                  <span className="px-2 py-0.5 bg-[var(--brand-green)]/20 text-[var(--brand-green)] rounded-full text-xs font-medium border border-[var(--brand-green)]/30">
                    {filters.interests.length} interest(s)
                  </span>
                )}
                {!isGroupSelected && (filters.age_min || filters.age_max) && (
                  <span className="px-2 py-0.5 bg-[#F97316]/20 text-[#F97316] rounded-full text-xs font-medium border border-[#F97316]/30">
                    Age: {filters.age_min || '0'}-{filters.age_max || '∞'}
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="ml-auto px-2 py-1 text-xs font-medium text-[var(--brand-light)]/50 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-lg transition-all flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div 
        className={`overflow-hidden transition-all duration-300 ${showAdvanced ? 'max-h-[500px]' : 'max-h-0'}`}
      >
        <div className={`border-t border-[var(--dark-600)] p-4 sm:p-6 bg-[var(--dark-900)]/50 ${isGroupSelected ? 'opacity-60' : ''}`}>
          {isGroupSelected && (
            <div className="mb-4 p-3 bg-[var(--brand-blue)]/10 border border-[var(--brand-blue)]/30 rounded-xl text-sm text-[var(--brand-blue)]">
              <strong>Note:</strong> A group is selected. The filters below are disabled because groups are pre-built segments.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Grades Multi-Select */}
            <div>
              <label className="text-xs font-medium text-[var(--brand-light)]/50 mb-2 flex items-center gap-1.5">
                <Filter className="w-3 h-3" /> Grades
              </label>
              <div className="max-h-48 overflow-y-auto bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl p-2 space-y-1">
                {ALL_GRADES.map((grade) => (
                  <label key={grade.value} className="flex items-center gap-2 cursor-pointer hover:bg-[var(--dark-600)] px-2 py-1.5 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      disabled={isGroupSelected}
                      checked={filters.grades?.includes(grade.value) || false}
                      onChange={(e) => handleMultiSelect('grades', grade.value, e.target.checked)}
                      className="rounded border-[var(--dark-400)] bg-[var(--dark-600)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] focus:ring-offset-0"
                    />
                    <span className="text-sm text-[var(--brand-light)]/80">{grade.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Age Range */}
            <div>
              <label className="text-xs font-medium text-[var(--brand-light)]/50 mb-2 flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Age Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  max="25"
                  disabled={isGroupSelected}
                  value={filters.age_min || ''}
                  onChange={(e) => handleChange('age_min', e.target.value ? parseInt(e.target.value) : null)}
                  className="flex-1 h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors disabled:opacity-50"
                />
                <span className="text-[var(--brand-light)]/30 self-center">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  max="25"
                  disabled={isGroupSelected}
                  value={filters.age_max || ''}
                  onChange={(e) => handleChange('age_max', e.target.value ? parseInt(e.target.value) : null)}
                  className="flex-1 h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            {/* Interests Multi-Select */}
            <div>
              <label className="text-xs font-medium text-[var(--brand-light)]/50 mb-2 flex items-center gap-1.5">
                <Heart className="w-3 h-3" /> Interests
              </label>
              <div className="max-h-48 overflow-y-auto bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl p-2 space-y-1">
                {loadingData ? (
                  <div className="text-sm text-[var(--brand-light)]/40 p-2 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                  </div>
                ) : interests.length === 0 ? (
                  <div className="text-sm text-[var(--brand-light)]/40 p-2">No interests defined</div>
                ) : (
                  interests.map((interest) => (
                    <label key={interest.id} className="flex items-center gap-2 cursor-pointer hover:bg-[var(--dark-600)] px-2 py-1.5 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        disabled={isGroupSelected}
                        checked={filters.interests?.includes(interest.id) || false}
                        onChange={(e) => handleMultiSelect('interests', interest.id, e.target.checked)}
                        className="rounded border-[var(--dark-400)] bg-[var(--dark-600)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] focus:ring-offset-0"
                      />
                      <span className="text-sm text-[var(--brand-light)]/80">{interest.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Custom Fields */}
            <div>
              <label className="text-xs font-medium text-[var(--brand-light)]/50 mb-2 flex items-center gap-1.5">
                <Sliders className="w-3 h-3" /> Custom Fields
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {loadingData ? (
                  <div className="text-sm text-[var(--brand-light)]/40 p-2 flex items-center gap-2 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                  </div>
                ) : customFields.length === 0 ? (
                  <div className="text-sm text-[var(--brand-light)]/40 p-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl">
                    No custom fields available
                  </div>
                ) : (
                  customFields.map((field) => (
                    <div key={field.id}>
                      <label className="text-xs text-[var(--brand-light)]/60 mb-1 block">
                        {field.name}
                        {field.club__name && <span className="text-[var(--brand-light)]/30"> ({field.club__name})</span>}
                      </label>
                      <select
                        disabled={isGroupSelected}
                        value={filters.custom_fields?.[field.id] || ''}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        className="w-full h-9 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-lg text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer disabled:opacity-50"
                        style={selectArrowStyle}
                      >
                        <option value="">All</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
