'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import api from '../../../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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
    <div className="space-y-4 sm:space-y-6">
      {/* Basic Information */}
      <Card className="border-none shadow-sm">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl">Basic Information</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Enter the questionnaire title, description, and dates.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 sm:pt-6 space-y-4 px-4 sm:px-6">
          <div className="space-y-2">
            <Label>Title <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              required
              value={data.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={data.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Schedule Publish Date (Optional)</Label>
              <Input
                type="datetime-local"
                value={data.scheduled_publish_date ? data.scheduled_publish_date.slice(0, 16) : ''}
                onChange={(e) => handleChange('scheduled_publish_date', e.target.value || null)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to publish immediately when you click "Publish". Set a future date to schedule automatic publishing.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Expiration Date <span className="text-red-500">*</span></Label>
              <Input
                type="datetime-local"
                required
                value={data.expiration_date ? data.expiration_date.slice(0, 16) : ''}
                onChange={(e) => handleChange('expiration_date', e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-input">
            <input 
              type="checkbox" 
              id="is_anonymous"
              checked={data.is_anonymous || false}
              onChange={(e) => handleChange('is_anonymous', e.target.checked)}
              className="w-5 h-5 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded mt-0.5 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <Label htmlFor="is_anonymous" className="font-semibold text-foreground cursor-pointer block">Anonymous Responses</Label>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Admins cannot see who answered</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Audience */}
      <Card className="border-none shadow-sm">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl">Target Audience</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Configure who can see and answer this questionnaire.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 sm:pt-6 space-y-4 px-4 sm:px-6">
          {/* Scope Selection for Super/Muni Admins */}
          {scope === 'SUPER' && (
            <div className="space-y-2">
              <Label>Municipality (Optional - Limits scope)</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            <div className="space-y-2">
              <Label>Club (Optional - Limits scope)</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                <p className="text-xs text-muted-foreground mt-1">No clubs found in this municipality.</p>
              )}
            </div>
          )}

          {/* Role / Group Selection */}
          <div className="space-y-2">
            <Label>Who can answer?</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={data.target_audience || 'YOUTH'}
                onChange={(e) => handleChange('target_audience', e.target.value)}
                disabled={!!data.visibility_group} // Disable if group is selected
              >
                <option value="YOUTH">Youth Members</option>
                <option value="GUARDIAN">Guardians</option>
                <option value="BOTH">Both</option>
              </select>
              
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={data.visibility_group || ''}
                onChange={(e) => handleChange('visibility_group', e.target.value || null)}
              >
                <option value="">-- Or Target Specific Group --</option>
                {filteredGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            {filteredGroups.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {data.club 
                  ? "No groups found in this club." 
                  : data.municipality 
                  ? "No groups found in this municipality." 
                  : "No groups available."}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Note: Selecting a Group overrides the Youth/Guardian setting.</p>
          </div>
        </CardContent>
      </Card>

      {/* Rewards */}
      <Card className="border-none shadow-sm">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl">Rewards (Optional)</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Select rewards to give to users who complete this questionnaire.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 sm:pt-6 space-y-4 px-4 sm:px-6">
          <div className="space-y-2">
            <Label>Select Reward(s)</Label>
            
            {/* Selected Rewards Display */}
            {getSelectedRewards().length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-[#EBEBFE]/30 rounded-lg border border-[#4D4DA4]/20">
                {getSelectedRewards().map(reward => (
                  <Badge 
                    key={reward.id}
                    variant="outline" 
                    className="bg-[#4D4DA4] text-white border-[#4D4DA4] px-3 py-1 flex items-center gap-2"
                  >
                    {reward.name}
                    <button
                      type="button"
                      onClick={() => removeReward(reward.id)}
                      className="ml-1 hover:bg-[#4D4DA4]/80 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${reward.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Searchable Dropdown */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search rewards by name..."
                  value={rewardSearchTerm}
                  onChange={(e) => {
                    setRewardSearchTerm(e.target.value);
                    setShowRewardDropdown(true);
                  }}
                  onFocus={() => setShowRewardDropdown(true)}
                  className="pl-9"
                />
              </div>

              {/* Dropdown List */}
              {showRewardDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowRewardDropdown(false)}
                  ></div>
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredRewards.length > 0 ? (
                      filteredRewards.map(reward => (
                        <button
                          key={reward.id}
                          type="button"
                          onClick={() => toggleReward(reward.id)}
                          className="w-full text-left px-4 py-2.5 hover:bg-[#EBEBFE]/50 transition-colors border-b border-gray-100 last:border-b-0"
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
          <div className="space-y-2">
            <Label>Limit (Optional)</Label>
            <Input
              type="number"
              placeholder="e.g. First 10 users only"
              value={data.benefit_limit || ''}
              onChange={(e) => handleChange('benefit_limit', parseInt(e.target.value) || null)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
