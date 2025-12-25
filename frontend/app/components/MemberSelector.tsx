'use client';

import { useState, useEffect } from 'react';
import { Search, Users, CheckCircle2, UserPlus, X } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string | null;
  grade?: number;
  age?: number;
}

interface MemberSelectorProps {
  criteria: {
    target_member_type: string;
    min_age: string | number;
    max_age: string | number;
    grades: number[];
    genders: string[];
    interests: number[];
    custom_field_rules?: Record<string, any>;
  };
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  excludeGroupId?: number;
  darkMode?: boolean;
}

export default function MemberSelector({ criteria, selectedIds, onChange, excludeGroupId, darkMode = true }: MemberSelectorProps) {
  const [candidates, setCandidates] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      params.set('target_member_type', criteria.target_member_type);
      if (criteria.min_age) params.set('min_age', criteria.min_age.toString());
      if (criteria.max_age) params.set('max_age', criteria.max_age.toString());
      if (criteria.grades.length > 0) params.set('grades', criteria.grades.join(','));
      if (criteria.genders.length > 0) params.set('genders', criteria.genders.join(','));
      if (criteria.interests.length > 0) params.set('interests', criteria.interests.join(','));
      
      if (criteria.custom_field_rules && Object.keys(criteria.custom_field_rules).length > 0) {
        params.set('custom_field_rules', JSON.stringify(criteria.custom_field_rules));
      }
      
      if (searchTerm) params.set('search', searchTerm);
      if (excludeGroupId) params.set('exclude_group', excludeGroupId.toString());
      
      params.set('page_size', '50'); 

      const res = await api.get(`/groups/search_candidates/?${params.toString()}`);
      const data = Array.isArray(res.data) ? res.data : res.data.results;
      setCandidates(data || []);
      setHasSearched(true);
    } catch (err) {
      console.error("Failed to search members", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(sid => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAllVisible = () => {
    const visibleIds = candidates.map(c => c.id);
    const newIds = [...selectedIds];
    visibleIds.forEach(id => {
      if (!newIds.includes(id)) newIds.push(id);
    });
    onChange(newIds);
  };

  const clearSelection = () => {
    onChange([]);
  };

  const getInitials = (first: string, last: string) => {
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  };

  // Dark mode styles
  const bgCard = darkMode ? 'bg-[var(--dark-700)]' : 'bg-white';
  const bgHeader = darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-50';
  const borderColor = darkMode ? 'border-[var(--dark-500)]' : 'border-gray-200';
  const textColor = darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900';
  const textMuted = darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500';
  const inputBg = darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30' : 'bg-white border-gray-300 text-gray-900';

  return (
    <div className={`${bgCard} rounded-xl overflow-hidden border ${borderColor}`}>
      {/* Header */}
      <div className={`p-4 ${bgHeader} border-b ${borderColor}`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${darkMode ? 'bg-[var(--brand-green)]/20' : 'bg-green-100'} flex items-center justify-center`}>
              <UserPlus className={`w-4 h-4 ${darkMode ? 'text-[var(--brand-green)]' : 'text-green-600'}`} />
            </div>
            <h4 className={`font-semibold ${textColor}`}>Find Members</h4>
          </div>
          <div className={`text-sm font-medium px-3 py-1 rounded-full ${
            selectedIds.length > 0 
              ? darkMode 
                ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]'
                : 'bg-indigo-100 text-indigo-700'
              : darkMode 
                ? 'bg-[var(--dark-500)] text-[var(--brand-light)]/50'
                : 'bg-gray-100 text-gray-500'
          }`}>
            {selectedIds.length} selected
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`} />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              className={`w-full h-10 pl-10 pr-4 rounded-xl border-2 ${inputBg} text-sm outline-none transition-all focus:border-[var(--brand-primary)]`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchCandidates()}
            />
          </div>
          <button 
            type="button" 
            onClick={fetchCandidates}
            disabled={loading}
            className={`h-10 px-4 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              darkMode 
                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90 disabled:bg-[var(--dark-500)] disabled:text-[var(--brand-light)]/30'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500'
            } disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <div className={`w-4 h-4 border-2 ${darkMode ? 'border-[var(--dark-900)]/30 border-t-[var(--dark-900)]' : 'border-white/30 border-t-white'} rounded-full animate-spin`} />
                <span className="hidden sm:inline">Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Find Matches</span>
              </>
            )}
          </button>
        </div>
        
        <p className={`text-xs ${textMuted} mt-3`}>
          Showing users matching the rules defined above (Age, Grade, etc.)
        </p>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {!hasSearched && (
          <div className={`text-center py-12 ${textMuted}`}>
            <div className={`w-16 h-16 rounded-2xl ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-100'} flex items-center justify-center mx-auto mb-4`}>
              <Users className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-light)]/30' : 'text-gray-400'}`} />
            </div>
            <p className={`text-sm font-medium ${textColor} mb-1`}>Ready to search</p>
            <p className="text-xs">Click "Find Matches" to see eligible users</p>
          </div>
        )}

        {hasSearched && candidates.length === 0 && (
          <div className={`text-center py-12 ${textMuted}`}>
            <div className={`w-16 h-16 rounded-2xl ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-100'} flex items-center justify-center mx-auto mb-4`}>
              <Users className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-light)]/30' : 'text-gray-400'}`} />
            </div>
            <p className={`text-sm font-medium ${textColor} mb-1`}>No matches found</p>
            <p className="text-xs">No eligible users found matching criteria</p>
          </div>
        )}

        {candidates.length > 0 && (
          <div className="p-2">
            {/* Action Bar */}
            <div className={`flex justify-between items-center px-2 py-2 mb-2 rounded-lg ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-50'}`}>
              <span className={`text-xs ${textMuted}`}>{candidates.length} users found</span>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={selectAllVisible} 
                  className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
                    darkMode 
                      ? 'text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10'
                      : 'text-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  Select All
                </button>
                {selectedIds.length > 0 && (
                  <button 
                    type="button" 
                    onClick={clearSelection} 
                    className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
                      darkMode 
                        ? 'text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            
            {/* User List */}
            <div className="space-y-1">
              {candidates.map(user => {
                const isSelected = selectedIds.includes(user.id);
                return (
                  <div 
                    key={user.id} 
                    onClick={() => toggleUser(user.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
                      isSelected 
                        ? darkMode 
                          ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30'
                          : 'bg-indigo-50 border-indigo-200'
                        : darkMode 
                          ? 'bg-transparent border-transparent hover:bg-[var(--dark-600)]'
                          : 'bg-white border-transparent hover:bg-gray-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected 
                        ? darkMode 
                          ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]'
                          : 'bg-indigo-600 border-indigo-600'
                        : darkMode 
                          ? 'border-[var(--dark-400)] bg-transparent'
                          : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Avatar */}
                    {user.avatar ? (
                      <img 
                        src={getMediaUrl(user.avatar) || ''} 
                        alt=""
                        className={`w-10 h-10 rounded-full object-cover ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-200'}`} 
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                        darkMode 
                          ? 'bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {getInitials(user.first_name, user.last_name)}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${textColor}`}>
                        {user.first_name} {user.last_name}
                      </p>
                      <p className={`text-xs truncate ${textMuted}`}>{user.email}</p>
                    </div>

                    {/* Grade Badge */}
                    {user.grade && (
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                        darkMode 
                          ? 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        Gr {user.grade}
                      </span>
                    )}

                    {/* Selected Indicator */}
                    {isSelected && (
                      <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${
                        darkMode ? 'text-[var(--brand-primary)]' : 'text-indigo-600'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer - Selected Summary */}
      {selectedIds.length > 0 && (
        <div className={`p-3 border-t ${borderColor} ${bgHeader}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${darkMode ? 'text-[var(--brand-green)]' : 'text-green-600'}`} />
              <span className={`text-sm ${textColor}`}>
                <span className="font-semibold">{selectedIds.length}</span> {selectedIds.length === 1 ? 'member' : 'members'} will be added
              </span>
            </div>
            <button 
              type="button" 
              onClick={clearSelection}
              className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                darkMode 
                  ? 'text-[var(--brand-light)]/50 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10'
                  : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
              }`}
            >
              <X className="w-3 h-3 inline mr-1" />
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
