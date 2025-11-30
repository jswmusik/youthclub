'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Group } from '@/types/organization';

interface ClubGroupsProps {
  clubId: number;
}

// Helper Component: Badges (same as groups search page)
const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
        APPROVED: "bg-green-100 text-green-700 border-green-200",
        PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
        REJECTED: "bg-red-100 text-red-700 border-red-200"
    };
    return (
        <span className={`text-xs px-2 py-1 rounded border font-medium ${styles[status as keyof typeof styles] || "bg-gray-100"}`}>
            {status === 'APPROVED' ? 'Member' : status}
        </span>
    );
};

const IneligibleTooltip = ({ reasons }: { reasons: string[] }) => (
    <div className="absolute top-2 right-2 group z-10">
        <div className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded border border-gray-200 cursor-help shadow-sm flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <span>Restricted</span>
        </div>
        <div className="absolute right-0 mt-1 w-48 p-3 bg-gray-800 text-white text-xs rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <p className="font-bold mb-1">Requirements not met:</p>
            <ul className="list-disc pl-3 space-y-1">
                {reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
        </div>
    </div>
);

export default function ClubGroups({ clubId }: ClubGroupsProps) {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      // Fetches groups for this specific club.
      // The backend serializer includes eligibility and membership_status
      const response = await api.get(`/groups/?club=${clubId}`);
      const groupsData = response.data.results || response.data;
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (error) {
      console.error("Failed to load groups", error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clubId) fetchGroups();
  }, [clubId]);

  const handleJoin = async (groupId: number) => {
    try {
      const res = await api.post(`/groups/${groupId}/join/`);
      alert(res.data.message || "Successfully joined group!");
      // Refresh groups to update membership status
      fetchGroups();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to join group");
    }
  };

  if (loading) return (
    <div className="py-12 text-center text-gray-500">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4">Loading groups...</p>
    </div>
  );

  if (groups.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
        <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-3-3H5a3 3 0 00-3 3v2h5m2-16a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2V4z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">No Groups Found</h3>
        <p className="text-gray-500 mt-1">This club hasn't created any groups yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Groups & Activities</h2>
        <p className="text-gray-500 text-sm mt-1">Join a group to connect with others sharing your interests.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {groups.map(group => {
            // Use membership_status if available, otherwise fall back to user_status
            const membershipStatus = group.membership_status || (group.user_status === 'APPROVED' ? 'APPROVED' : group.user_status === 'PENDING' ? 'PENDING' : null);
            const isEligible = group.eligibility?.is_eligible ?? true;
            const isMember = !!membershipStatus;
            
            // Visual Style: Gray out if ineligible AND not already a member
            const cardStyle = (!isEligible && !isMember) ? 'opacity-70 grayscale-[0.3]' : 'opacity-100';

            return (
                <div key={group.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow ${cardStyle}`}>
                    {/* Header Image */}
                    <div className="h-32 bg-gray-200 relative">
                        {group.background_image ? (
                            <img src={group.background_image} alt={group.name} className="w-full h-full object-cover" />
                        ) : group.avatar ? (
                            <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                                 <span className="text-4xl">👥</span>
                            </div>
                        )}
                        
                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 flex gap-1">
                            {group.group_type !== 'OPEN' && (
                                <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">
                                    {group.group_type === 'CLOSED' ? 'Private' : 'Application'}
                                </span>
                            )}
                        </div>

                        {/* Ineligibility Tooltip */}
                        {!isEligible && !isMember && group.eligibility?.reasons && (
                            <IneligibleTooltip reasons={group.eligibility.reasons} />
                        )}
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col">
                        <div className="mb-3">
                            <h3 className="font-bold text-gray-900 text-lg leading-tight">{group.name}</h3>
                            {group.club_name && (
                                <p className="text-xs text-blue-600 font-medium mt-1">
                                    Club: {group.club_name}
                                </p>
                            )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">
                            {group.description || <span className="italic text-gray-400">No description available.</span>}
                        </p>

                        {/* Footer Action */}
                        <div className="mt-auto pt-4 border-t border-gray-100">
                            {membershipStatus ? (
                                <div className="flex justify-between items-center">
                                    <StatusBadge status={membershipStatus} />
                                    <button 
                                        onClick={() => router.push(`/dashboard/youth/groups/${group.id}`)}
                                        className="text-xs text-blue-600 hover:underline"
                                    >
                                        Visit Group
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleJoin(group.id)}
                                    disabled={!isEligible}
                                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 ${
                                        isEligible 
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow' 
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                    }`}
                                >
                                    {isEligible 
                                        ? (group.group_type === 'OPEN' ? 'Join Group' : 'Apply to Join') 
                                        : 'Unavailable'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
}

