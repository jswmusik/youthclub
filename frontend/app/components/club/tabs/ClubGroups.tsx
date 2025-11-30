import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Group } from '@/types/organization';
import GroupCard from '../groups/GroupCard';

interface ClubGroupsProps {
  clubId: number;
}

export default function ClubGroups({ clubId }: ClubGroupsProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      // Fetches groups for this specific club.
      // Thanks to our backend change, this includes OPEN and APPLICATION groups.
      const response = await api.get(`/groups/?club=${clubId}`);
      setGroups(response.data.results || response.data);
    } catch (error) {
      console.error("Failed to load groups", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clubId) fetchGroups();
  }, [clubId]);

  if (loading) return <div className="py-12 text-center text-gray-500">Loading groups...</div>;

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Groups Found</h3>
        <p className="text-gray-500 mt-2">This club hasn't created any groups yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Groups & Activities</h2>
        <p className="text-gray-500 text-sm">Join a group to connect with others sharing your interests.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map(group => (
          <GroupCard 
            key={group.id} 
            group={group} 
            onUpdate={fetchGroups} // Reload to update 'user_status' after join/leave
          />
        ))}
      </div>
    </div>
  );
}

