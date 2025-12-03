'use client';

import { useState, useEffect } from 'react';
import api from '../../../lib/api';

interface QuestionnaireSettingsProps {
  data: any;
  onChange: (data: any) => void;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function QuestionnaireSettings({ data, onChange, scope }: QuestionnaireSettingsProps) {
  const [rewards, setRewards] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [allClubs, setAllClubs] = useState<any[]>([]); // Store all clubs
  const [loading, setLoading] = useState(true);
  
  // Rewards search state
  const [rewardSearchTerm, setRewardSearchTerm] = useState('');
  const [showRewardDropdown, setShowRewardDropdown] = useState(false);

  // Filter clubs based on selected municipality
  const filteredClubs = data.municipality 
    ? allClubs.filter(club => club.municipality === parseInt(data.municipality))
    : allClubs;

  // Filter groups based on municipality and club selection
  const filteredGroups = (() => {
    if (data.club) {
      // If club is selected, show only groups from that club
      return groups.filter(group => {
        const groupClubId = typeof group.club === 'object' ? group.club?.id : group.club;
        return groupClubId === parseInt(data.club);
      });
    } else if (data.municipality) {
      // If municipality is selected (but no club), show groups from that municipality
      // This includes: groups directly assigned to municipality OR groups from clubs in that municipality
      return groups.filter(group => {
        const groupMuniId = typeof group.municipality === 'object' ? group.municipality?.id : group.municipality;
        const groupClubId = typeof group.club === 'object' ? group.club?.id : group.club;
        
        // Group directly assigned to municipality
        if (groupMuniId === parseInt(data.municipality)) {
          return true;
        }
        
        // Group assigned to a club in this municipality
        if (groupClubId) {
          const club = allClubs.find(c => c.id === groupClubId);
          if (club && club.municipality === parseInt(data.municipality)) {
            return true;
          }
        }
        
        return false;
      });
    } else {
      // No municipality or club selected - show all groups
      return groups;
    }
  })();

  useEffect(() => {
    fetchOptions();
  }, [scope]);

  // Clear club selection if municipality changes and selected club is not in new municipality
  useEffect(() => {
    if (data.municipality && data.club && allClubs.length > 0) {
      const club = allClubs.find(c => c.id === parseInt(data.club));
      if (club && club.municipality !== parseInt(data.municipality)) {
        handleChange('club', null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.municipality, allClubs.length]);

  // Clear group selection if municipality/club changes and selected group is not valid
  useEffect(() => {
    if (data.visibility_group && groups.length > 0) {
      const selectedGroup = groups.find(g => g.id === parseInt(data.visibility_group));
      if (selectedGroup) {
        const groupMuniId = typeof selectedGroup.municipality === 'object' ? selectedGroup.municipality?.id : selectedGroup.municipality;
        const groupClubId = typeof selectedGroup.club === 'object' ? selectedGroup.club?.id : selectedGroup.club;
        
        // If club is selected, group must belong to that club
        if (data.club && groupClubId !== parseInt(data.club)) {
          handleChange('visibility_group', null);
        }
        // If municipality is selected (but no club), group must belong to that municipality
        else if (data.municipality && !data.club && groupMuniId !== parseInt(data.municipality)) {
          handleChange('visibility_group', null);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.municipality, data.club, groups.length]);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      // Fetch rewards (handle pagination)
      let allRewards: any[] = [];
      let page = 1;
      const pageSize = 100;
      while (true) {
        const rewardRes = await api.get(`/rewards/?page=${page}&page_size=${pageSize}`);
        const rewardData = Array.isArray(rewardRes.data) ? rewardRes.data : rewardRes.data.results || [];
        if (rewardData.length === 0) break;
        allRewards = [...allRewards, ...rewardData];
        const hasMore = Array.isArray(rewardRes.data) ? false : (rewardRes.data.next !== null && rewardRes.data.next !== undefined);
        if (!hasMore || rewardData.length < pageSize) break;
        page++;
      }
      setRewards(allRewards);
      console.log('Loaded rewards:', allRewards.length);

      // Fetch groups (handle pagination)
      let allGroups: any[] = [];
      page = 1;
      while (true) {
        const groupRes = await api.get(`/groups/?page=${page}&page_size=${pageSize}`);
        const groupsData = Array.isArray(groupRes.data) ? groupRes.data : groupRes.data.results || [];
        if (groupsData.length === 0) break;
        allGroups = [...allGroups, ...groupsData];
        // Check if there's more data
        const hasMore = Array.isArray(groupRes.data) ? false : (groupRes.data.next !== null && groupRes.data.next !== undefined);
        if (!hasMore || groupsData.length < pageSize) break;
        page++;
      }
      setGroups(allGroups);
      console.log('Loaded groups:', allGroups.length);

      // Fetch municipalities (only for SUPER admin)
      if (scope === 'SUPER') {
        let allMunicipalities: any[] = [];
        page = 1;
        while (true) {
          const muniRes = await api.get(`/municipalities/?page=${page}&page_size=${pageSize}`);
          const muniData = Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || [];
          if (muniData.length === 0) break;
          allMunicipalities = [...allMunicipalities, ...muniData];
          const hasMore = Array.isArray(muniRes.data) ? false : (muniRes.data.next !== null && muniRes.data.next !== undefined);
          if (!hasMore || muniData.length < pageSize) break;
          page++;
        }
        setMunicipalities(allMunicipalities);
        console.log('Loaded municipalities:', allMunicipalities.length);
      }

      // Fetch clubs (handle pagination and scope)
      let allClubs: any[] = [];
      page = 1;
      while (true) {
        const clubRes = await api.get(`/clubs/?page=${page}&page_size=${pageSize}`);
        const clubData = Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || [];
        if (clubData.length === 0) break;
        allClubs = [...allClubs, ...clubData];
        const hasMore = Array.isArray(clubRes.data) ? false : (clubRes.data.next !== null && clubRes.data.next !== undefined);
        if (!hasMore || clubData.length < pageSize) break;
        page++;
      }
      setAllClubs(allClubs);
      console.log('Loaded clubs:', allClubs.length);
    } catch (err) {
      console.error("Error fetching settings options", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  // Rewards selection logic
  const toggleReward = (id: number) => {
    const currentRewards = Array.isArray(data.rewards) ? data.rewards : [];
    const exists = currentRewards.includes(id);
    const newRewards = exists 
      ? currentRewards.filter((r: number) => r !== id)
      : [...currentRewards, id];
    handleChange('rewards', newRewards);
    setRewardSearchTerm('');
    setShowRewardDropdown(false);
  };

  const removeReward = (id: number) => {
    const currentRewards = Array.isArray(data.rewards) ? data.rewards : [];
    handleChange('rewards', currentRewards.filter((r: number) => r !== id));
  };

  const getSelectedRewards = () => {
    const currentRewards = Array.isArray(data.rewards) ? data.rewards : [];
    return currentRewards.map((id: number) => rewards.find(r => r.id === id)).filter(Boolean);
  };

  const filteredRewards = rewards.filter(r => {
    const term = rewardSearchTerm.toLowerCase();
    const match = r.name.toLowerCase().includes(term);
    const currentRewards = Array.isArray(data.rewards) ? data.rewards : [];
    return match && !currentRewards.includes(r.id);
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-1">
      <div className="grid grid-cols-1 gap-6">
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                required
                className="w-full border rounded-md p-2"
                value={data.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border rounded-md p-2 h-24"
                value={data.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Publish Date (Optional)</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded-md p-2"
                  value={data.scheduled_publish_date ? data.scheduled_publish_date.slice(0, 16) : ''}
                  onChange={(e) => handleChange('scheduled_publish_date', e.target.value || null)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to publish immediately when you click "Publish". Set a future date to schedule automatic publishing.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date *</label>
                <input
                  type="datetime-local"
                  required
                  className="w-full border rounded-md p-2"
                  value={data.expiration_date ? data.expiration_date.slice(0, 16) : ''}
                  onChange={(e) => handleChange('expiration_date', e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
                <input 
                    type="checkbox" 
                    id="is_anonymous"
                    checked={data.is_anonymous || false}
                    onChange={(e) => handleChange('is_anonymous', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="is_anonymous" className="text-sm text-gray-700 font-medium">Anonymous Responses (Admins cannot see who answered)</label>
            </div>
          </div>
        </div>

        {/* Targeting */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Target Audience</h3>
          <div className="grid gap-4">
            
            {/* Scope Selection for Super/Muni Admins */}
            {scope === 'SUPER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Municipality (Optional - Limits scope)</label>
                <select 
                    className="w-full border rounded-md p-2"
                    value={data.municipality || ''}
                    onChange={(e) => handleChange('municipality', e.target.value || null)}
                >
                    <option value="">All / Global</option>
                    {municipalities.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
              </div>
            )}
            
            {(scope === 'SUPER' || scope === 'MUNICIPALITY') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Club (Optional - Limits scope)</label>
                <select 
                    className="w-full border rounded-md p-2"
                    value={data.club || ''}
                    onChange={(e) => handleChange('club', e.target.value || null)}
                    disabled={scope === 'CLUB'} // Club admins can't change club
                >
                    <option value="">All in Scope</option>
                    {filteredClubs.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                {data.municipality && filteredClubs.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">No clubs found in this municipality.</p>
                )}
              </div>
            )}

            {/* Role / Group Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Who can answer?</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                        className="w-full border rounded-md p-2"
                        value={data.target_audience || 'YOUTH'}
                        onChange={(e) => handleChange('target_audience', e.target.value)}
                        disabled={!!data.visibility_group} // Disable if group is selected
                    >
                        <option value="YOUTH">Youth Members</option>
                        <option value="GUARDIAN">Guardians</option>
                        <option value="BOTH">Both</option>
                    </select>
                    
                    <select
                        className="w-full border rounded-md p-2"
                        value={data.visibility_group || ''}
                        onChange={(e) => handleChange('visibility_group', e.target.value || null)}
                    >
                        <option value="">-- Or Target Specific Group --</option>
                        {filteredGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                    {filteredGroups.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {data.club 
                          ? "No groups found in this club." 
                          : data.municipality 
                          ? "No groups found in this municipality." 
                          : "No groups available."}
                      </p>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Note: Selecting a Group overrides the Youth/Guardian setting.</p>
            </div>
          </div>
        </div>

        {/* Rewards */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Rewards (Optional)</h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Reward(s)</label>
              
              {/* Selected Rewards Display */}
              {getSelectedRewards().length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  {getSelectedRewards().map(reward => (
                    <span 
                      key={reward.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-full font-medium"
                    >
                      {reward.name}
                      <button
                        type="button"
                        onClick={() => removeReward(reward.id)}
                        className="hover:bg-blue-700 rounded-full p-0.5 transition-colors"
                        title="Remove reward"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Searchable Dropdown */}
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search rewards by name..."
                    value={rewardSearchTerm}
                    onChange={(e) => {
                      setRewardSearchTerm(e.target.value);
                      setShowRewardDropdown(true);
                    }}
                    onFocus={() => setShowRewardDropdown(true)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <svg 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Dropdown List */}
                {showRewardDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowRewardDropdown(false)}
                    ></div>
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredRewards.length > 0 ? (
                        filteredRewards.map(reward => (
                          <button
                            key={reward.id}
                            type="button"
                            onClick={() => toggleReward(reward.id)}
                            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{reward.name}</div>
                            {reward.description && (
                              <div className="text-xs text-gray-500">{reward.description}</div>
                            )}
                          </button>
                        ))
                      ) : rewardSearchTerm ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No rewards found matching "{rewardSearchTerm}"
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          {getSelectedRewards().length === 0 
                            ? 'No rewards available. Create a reward first.'
                            : 'All rewards are already selected.'}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limit (Optional)</label>
              <input
                type="number"
                placeholder="e.g. First 10 users only"
                className="w-full border rounded-md p-2"
                value={data.benefit_limit || ''}
                onChange={(e) => handleChange('benefit_limit', parseInt(e.target.value) || null)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

