'use client';

import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string | null;
  grade?: number;
  age?: number; // Calculated on backend or frontend
}

interface MemberSelectorProps {
  criteria: {
    target_member_type: string;
    min_age: string | number;
    max_age: string | number;
    grades: number[];
    genders: string[];
    interests: number[];
    custom_field_rules?: Record<string, any>; // NEW: Custom field rules
  };
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  excludeGroupId?: number; // To exclude people already in the group (Edit mode)
}

export default function MemberSelector({ criteria, selectedIds, onChange, excludeGroupId }: MemberSelectorProps) {
  const [candidates, setCandidates] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-fetch when criteria changes significantly, or manual refresh
  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Map criteria to API params
      params.set('target_member_type', criteria.target_member_type);
      if (criteria.min_age) params.set('min_age', criteria.min_age.toString());
      if (criteria.max_age) params.set('max_age', criteria.max_age.toString());
      if (criteria.grades.length > 0) params.set('grades', criteria.grades.join(','));
      if (criteria.genders.length > 0) params.set('genders', criteria.genders.join(','));
      if (criteria.interests.length > 0) params.set('interests', criteria.interests.join(','));
      
      // NEW: Add custom field rules
      if (criteria.custom_field_rules && Object.keys(criteria.custom_field_rules).length > 0) {
        params.set('custom_field_rules', JSON.stringify(criteria.custom_field_rules));
      }
      
      if (searchTerm) params.set('search', searchTerm);
      if (excludeGroupId) params.set('exclude_group', excludeGroupId.toString());
      
      // Get all candidates (pagination handled by backend, but for selector we might want a reasonable limit or load more)
      // For now, let's get the first page (default 10) or set a higher page_size
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
    // Add only ones not already selected
    const newIds = [...selectedIds];
    visibleIds.forEach(id => {
      if (!newIds.includes(id)) newIds.push(id);
    });
    onChange(newIds);
  };

  const clearSelection = () => {
    onChange([]);
  };

  return (
    <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="p-4 bg-gray-50 border-b flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-gray-800">Add Members</h4>
          <div className="text-sm text-gray-500">
            {selectedIds.length} selected
          </div>
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchCandidates()}
          />
          <button 
            type="button" 
            onClick={fetchCandidates}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Find Matches'}
          </button>
        </div>
        
        <p className="text-xs text-gray-500">
          Showing users matching the rules defined above (Age, Grade, etc.)
        </p>
      </div>

      {/* LIST */}
      <div className="max-h-80 overflow-y-auto p-2">
        {!hasSearched && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Click "Find Matches" to see eligible users.
          </div>
        )}

        {hasSearched && candidates.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No eligible users found matching criteria.
          </div>
        )}

        {candidates.length > 0 && (
          <div className="space-y-1">
            <div className="flex justify-end px-2 mb-2">
              <button type="button" onClick={selectAllVisible} className="text-xs text-indigo-600 font-bold hover:underline">Select All</button>
            </div>
            
            {candidates.map(user => {
              const isSelected = selectedIds.includes(user.id);
              return (
                <div 
                  key={user.id} 
                  onClick={() => toggleUser(user.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors
                    ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-gray-50'}
                  `}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0
                    ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}
                  `}>
                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>

                  {user.avatar ? (
                    <img src={getMediaUrl(user.avatar) || ''} className="w-8 h-8 rounded-full object-cover bg-gray-200" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                      {user.first_name.charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>

                  {user.grade && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Gr {user.grade}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}