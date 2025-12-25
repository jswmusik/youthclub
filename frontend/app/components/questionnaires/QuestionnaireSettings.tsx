'use client';

import { useState, useEffect } from 'react';
import { Search, X, ClipboardList, Users, Gift, Building2, EyeOff } from 'lucide-react';
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
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
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
      return groups.filter(group => {
        const groupClubId = typeof group.club === 'object' ? group.club?.id : group.club;
        return groupClubId === parseInt(data.club);
      });
    } else if (data.municipality) {
      return groups.filter(group => {
        const groupMuniId = typeof group.municipality === 'object' ? group.municipality?.id : group.municipality;
        const groupClubId = typeof group.club === 'object' ? group.club?.id : group.club;
        
        if (groupMuniId === parseInt(data.municipality)) {
          return true;
        }
        
        if (groupClubId) {
          const club = allClubs.find(c => c.id === groupClubId);
          if (club && club.municipality === parseInt(data.municipality)) {
            return true;
          }
        }
        
        return false;
      });
    } else {
      return groups;
    }
  })();

  useEffect(() => {
    fetchOptions();
  }, [scope]);

  useEffect(() => {
    if (data.municipality && data.club && allClubs.length > 0) {
      const club = allClubs.find(c => c.id === parseInt(data.club));
      if (club && club.municipality !== parseInt(data.municipality)) {
        handleChange('club', null);
      }
    }
  }, [data.municipality, allClubs.length]);

  useEffect(() => {
    if (data.visibility_group && groups.length > 0) {
      const selectedGroup = groups.find(g => g.id === parseInt(data.visibility_group));
      if (selectedGroup) {
        const groupMuniId = typeof selectedGroup.municipality === 'object' ? selectedGroup.municipality?.id : selectedGroup.municipality;
        const groupClubId = typeof selectedGroup.club === 'object' ? selectedGroup.club?.id : selectedGroup.club;
        
        if (data.club && groupClubId !== parseInt(data.club)) {
          handleChange('visibility_group', null);
        }
        else if (data.municipality && !data.club && groupMuniId !== parseInt(data.municipality)) {
          handleChange('visibility_group', null);
        }
      }
    }
  }, [data.municipality, data.club, groups.length]);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      // Fetch rewards
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

      // Fetch groups
      let allGroups: any[] = [];
      page = 1;
      while (true) {
        const groupRes = await api.get(`/groups/?page=${page}&page_size=${pageSize}`);
        const groupsData = Array.isArray(groupRes.data) ? groupRes.data : groupRes.data.results || [];
        if (groupsData.length === 0) break;
        allGroups = [...allGroups, ...groupsData];
        const hasMore = Array.isArray(groupRes.data) ? false : (groupRes.data.next !== null && groupRes.data.next !== undefined);
        if (!hasMore || groupsData.length < pageSize) break;
        page++;
      }
      setGroups(allGroups);

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
      }

      // Fetch clubs
      let fetchedClubs: any[] = [];
      page = 1;
      while (true) {
        const clubRes = await api.get(`/clubs/?page=${page}&page_size=${pageSize}`);
        const clubData = Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || [];
        if (clubData.length === 0) break;
        fetchedClubs = [...fetchedClubs, ...clubData];
        const hasMore = Array.isArray(clubRes.data) ? false : (clubRes.data.next !== null && clubRes.data.next !== undefined);
        if (!hasMore || clubData.length < pageSize) break;
        page++;
      }
      setAllClubs(fetchedClubs);
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

  const labelClasses = "block text-sm font-medium text-[var(--brand-light)]/70 mb-2";
  
  const inputClasses = (field: string) => `
    w-full h-11 px-4 rounded-xl
    bg-[var(--dark-700)] border-2 
    ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)] placeholder-[var(--brand-light)]/30
    outline-none transition-all duration-200
    hover:border-[var(--brand-primary)]/50
    focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
  `;

  const textareaClasses = (field: string) => `
    w-full px-4 py-3 rounded-xl resize-none
    bg-[var(--dark-700)] border-2 
    ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)] placeholder-[var(--brand-light)]/30
    outline-none transition-all duration-200
    hover:border-[var(--brand-primary)]/50
    focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
  `;

  const selectClasses = (field: string) => `
    w-full h-11 px-4 rounded-xl appearance-none cursor-pointer
    bg-[var(--dark-700)] border-2 
    ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)]
    outline-none transition-all duration-200
    hover:border-[var(--brand-primary)]/50
    focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
  `;

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1rem'
  };

  return (
    <div className="space-y-6">
      {/* Basic Information Card */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Basic Information</h2>
              <p className="text-sm text-[var(--brand-light)]/50">Enter the questionnaire title, description, and dates</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Title */}
          <div>
            <label className={labelClasses}>Title <span className="text-[var(--brand-red)]">*</span></label>
            <input
              type="text"
              required
              placeholder="Enter questionnaire title..."
              className={inputClasses('title')}
              value={data.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              onFocus={() => setFocusedField('title')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClasses}>Description</label>
            <textarea
              rows={3}
              placeholder="Enter a description for this questionnaire..."
              className={textareaClasses('description')}
              value={data.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              onFocus={() => setFocusedField('description')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          {/* Schedule Publish Date */}
          <div>
            <label className={labelClasses}>
              Schedule Publish Date (Optional)
            </label>
            <input
              type="datetime-local"
              className={inputClasses('scheduled_publish_date')}
              value={data.scheduled_publish_date ? data.scheduled_publish_date.slice(0, 16) : ''}
              onChange={(e) => handleChange('scheduled_publish_date', e.target.value || null)}
              onFocus={() => setFocusedField('scheduled_publish_date')}
              onBlur={() => setFocusedField(null)}
            />
            <p className="text-xs text-[var(--brand-light)]/40 mt-2">
              Leave empty to publish immediately when you click "Publish"
            </p>
          </div>

          {/* Expiration Date */}
          <div>
            <label className={labelClasses}>
              Expiration Date <span className="text-[var(--brand-red)]">*</span>
            </label>
            <input
              type="datetime-local"
              required
              className={inputClasses('expiration_date')}
              value={data.expiration_date ? data.expiration_date.slice(0, 16) : ''}
              onChange={(e) => handleChange('expiration_date', e.target.value)}
              onFocus={() => setFocusedField('expiration_date')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          {/* Anonymous Toggle */}
          <div 
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              data.is_anonymous 
                ? 'bg-[var(--brand-purple)]/10 border-[var(--brand-purple)]/50' 
                : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
            }`}
            onClick={() => handleChange('is_anonymous', !data.is_anonymous)}
          >
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                data.is_anonymous 
                  ? 'bg-[var(--brand-purple)] border-[var(--brand-purple)]' 
                  : 'border-[var(--dark-400)]'
              }`}>
                {data.is_anonymous && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-[var(--brand-purple)]" />
                  <span className="font-semibold text-[var(--brand-light)]">Anonymous Responses</span>
                </div>
                <p className="text-sm text-[var(--brand-light)]/50 mt-1">Admins cannot see who answered</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Audience Card */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-primary)] flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Target Audience</h2>
              <p className="text-sm text-[var(--brand-light)]/50">Configure who can see and answer this questionnaire</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Scope Selection for Super Admins */}
          {scope === 'SUPER' && (
            <div>
              <label className={labelClasses}>
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[var(--brand-light)]/50" />
                  Municipality (Optional - Limits scope)
                </span>
              </label>
              <select 
                className={selectClasses('municipality')}
                style={selectArrowStyle}
                value={data.municipality || ''}
                onChange={(e) => handleChange('municipality', e.target.value || null)}
                onFocus={() => setFocusedField('municipality')}
                onBlur={() => setFocusedField(null)}
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
              <label className={labelClasses}>
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[var(--brand-light)]/50" />
                  Club (Optional - Limits scope)
                </span>
              </label>
              <select 
                className={`${selectClasses('club')} ${scope === 'CLUB' ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={selectArrowStyle}
                value={data.club || ''}
                onChange={(e) => handleChange('club', e.target.value || null)}
                disabled={scope === 'CLUB'}
                onFocus={() => setFocusedField('club')}
                onBlur={() => setFocusedField(null)}
              >
                <option value="">All in Scope</option>
                {filteredClubs.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {data.municipality && filteredClubs.length === 0 && (
                <p className="text-xs text-[var(--brand-light)]/40 mt-2">No clubs found in this municipality.</p>
              )}
            </div>
          )}

          {/* Role / Group Selection */}
          <div>
            <label className={labelClasses}>Who can answer?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <select
                className={`${selectClasses('target_audience')} ${data.visibility_group ? 'opacity-50' : ''}`}
                style={selectArrowStyle}
                value={data.target_audience || 'YOUTH'}
                onChange={(e) => handleChange('target_audience', e.target.value)}
                disabled={!!data.visibility_group}
                onFocus={() => setFocusedField('target_audience')}
                onBlur={() => setFocusedField(null)}
              >
                <option value="YOUTH">Youth Members</option>
                <option value="GUARDIAN">Guardians</option>
                <option value="BOTH">Both</option>
              </select>
              
              <select
                className={selectClasses('visibility_group')}
                style={selectArrowStyle}
                value={data.visibility_group || ''}
                onChange={(e) => handleChange('visibility_group', e.target.value || null)}
                onFocus={() => setFocusedField('visibility_group')}
                onBlur={() => setFocusedField(null)}
              >
                <option value="">-- Or Target Specific Group --</option>
                {filteredGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            {filteredGroups.length === 0 && (
              <p className="text-xs text-[var(--brand-light)]/40 mt-2">
                {data.club 
                  ? "No groups found in this club." 
                  : data.municipality 
                  ? "No groups found in this municipality." 
                  : "No groups available."}
              </p>
            )}
            <p className="text-xs text-[var(--brand-light)]/40 mt-2">Note: Selecting a Group overrides the Youth/Guardian setting.</p>
          </div>
        </div>
      </div>

      {/* Rewards Card */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center">
              <Gift className="w-5 h-5 text-[var(--dark-900)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Rewards (Optional)</h2>
              <p className="text-sm text-[var(--brand-light)]/50">Select rewards to give to users who complete this questionnaire</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          <div>
            <label className={labelClasses}>Select Reward(s)</label>
            
            {/* Selected Rewards Display */}
            {getSelectedRewards().length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-[var(--brand-purple)]/10 rounded-xl border border-[var(--brand-purple)]/30 mb-4">
                {getSelectedRewards().map(reward => (
                  <span 
                    key={reward.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--brand-purple)] text-white"
                  >
                    {reward.name}
                    <button
                      type="button"
                      onClick={() => removeReward(reward.id)}
                      className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${reward.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Searchable Dropdown */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--brand-light)]/40" />
                <input
                  type="text"
                  placeholder="Search rewards by name..."
                  value={rewardSearchTerm}
                  onChange={(e) => {
                    setRewardSearchTerm(e.target.value);
                    setShowRewardDropdown(true);
                  }}
                  onFocus={() => setShowRewardDropdown(true)}
                  className={`${inputClasses('reward_search')} pl-11`}
                />
              </div>

              {/* Dropdown List */}
              {showRewardDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowRewardDropdown(false)}
                  ></div>
                  <div className="absolute z-20 w-full mt-2 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {filteredRewards.length > 0 ? (
                      filteredRewards.map(reward => (
                        <button
                          key={reward.id}
                          type="button"
                          onClick={() => toggleReward(reward.id)}
                          className="w-full text-left px-4 py-3 hover:bg-[var(--dark-600)] transition-colors border-b border-[var(--dark-600)] last:border-b-0"
                        >
                          <div className="font-medium text-[var(--brand-light)]">{reward.name}</div>
                          {reward.description && (
                            <div className="text-xs text-[var(--brand-light)]/50 mt-0.5">{reward.description}</div>
                          )}
                        </button>
                      ))
                    ) : rewardSearchTerm ? (
                      <div className="px-4 py-4 text-sm text-[var(--brand-light)]/50 text-center">
                        No rewards found matching "{rewardSearchTerm}"
                      </div>
                    ) : (
                      <div className="px-4 py-4 text-sm text-[var(--brand-light)]/50 text-center">
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

          {/* Limit Field */}
          <div>
            <label className={labelClasses}>Limit (Optional)</label>
            <input
              type="number"
              placeholder="e.g. First 10 users only"
              className={inputClasses('benefit_limit')}
              value={data.benefit_limit || ''}
              onChange={(e) => handleChange('benefit_limit', parseInt(e.target.value) || null)}
              onFocus={() => setFocusedField('benefit_limit')}
              onBlur={() => setFocusedField(null)}
            />
            <p className="text-xs text-[var(--brand-light)]/40 mt-2">Leave empty for unlimited rewards</p>
          </div>
        </div>
      </div>
    </div>
  );
}
