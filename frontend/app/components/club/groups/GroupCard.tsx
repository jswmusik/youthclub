import React, { useState } from 'react';
import { Group } from '@/types/organization';
import api from '@/lib/api';
import { getMediaUrl } from '../../../utils';

interface GroupCardProps {
  group: Group;
  onUpdate: () => void; // Callback to refresh list after action
}

export default function GroupCard({ group, onUpdate }: GroupCardProps) {
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    try {
      setLoading(true);
      await api.post(`/groups/${group.id}/join/`);
      onUpdate();
    } catch (error) {
      console.error("Failed to join group", error);
      alert("Could not join group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      setLoading(true);
      await api.post(`/groups/${group.id}/leave/`);
      onUpdate();
    } catch (error) {
      console.error("Failed to leave group", error);
    } finally {
      setLoading(false);
    }
  };

  // Logic for Button State
  const renderButton = () => {
    if (loading) return <button disabled className="px-4 py-2 bg-gray-100 rounded-lg text-xs">Processing...</button>;

    if (group.user_status === 'APPROVED') {
      return (
        <button 
          onClick={handleLeave}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Leave
        </button>
      );
    }

    if (group.user_status === 'PENDING') {
      return (
        <button disabled className="px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-sm font-medium">
          Request Pending
        </button>
      );
    }

    // Not a member
    if (group.group_type === 'CLOSED') {
      return (
        <div className="flex items-center text-gray-400 text-sm">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Invite Only
        </div>
      );
    }

    const label = group.group_type === 'APPLICATION' ? 'Request to Join' : 'Join Group';
    
    return (
      <button 
        onClick={handleJoin}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
      >
        {label}
      </button>
    );
  };

  const avatarUrl = group.avatar ? getMediaUrl(group.avatar) : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="h-12 w-12 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl font-bold overflow-hidden">
           {avatarUrl ? (
             <img src={avatarUrl} alt="" className="h-full w-full object-cover rounded-lg" />
           ) : (
             group.name.substring(0, 1).toUpperCase()
           )}
        </div>
        <span className={`px-2 py-1 text-xs rounded-full font-medium 
          ${group.group_type === 'OPEN' ? 'bg-green-50 text-green-700' : 
            group.group_type === 'CLOSED' ? 'bg-red-50 text-red-700' : 'bg-purple-50 text-purple-700'}`}>
          {group.group_type === 'APPLICATION' ? 'Application' : group.group_type}
        </span>
      </div>

      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">{group.name}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex-grow line-clamp-3">
        {group.description || "No description provided."}
      </p>

      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {group.member_count} Members
        </span>
        {renderButton()}
      </div>
    </div>
  );
}

