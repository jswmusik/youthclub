'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import api from '../../lib/api';
import Toast from './Toast';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface Group {
  id: number;
  name: string;
  group_type: 'OPEN' | 'APPLICATION' | 'CLOSED';
  is_system_group: boolean;
  member_count: number;
  pending_request_count: number;
  created_at: string;
  municipality: number | null;
  municipality_name?: string; // New
  club: number | null;
  club_name?: string;         // New
}

interface GroupManagerProps {
  basePath: string; // e.g., "/admin/super/groups"
}

export default function GroupManager({ basePath }: GroupManagerProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Determine admin type from basePath
  const isSuperAdmin = basePath.includes('/super');
  const isMuniAdmin = basePath.includes('/municipality');
  
  // Stats
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalMembers: 0,
    activeGroups: 0,
    emptyGroups: 0
  });

  // Actions
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false });
  const [showDelete, setShowDelete] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/groups/');
      const data = Array.isArray(res.data) ? res.data : res.data.results;
      setGroups(data);
      calculateStats(data);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to load groups.', type: 'error', isVisible: true });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Group[]) => {
    const totalMembers = data.reduce((sum, g) => sum + g.member_count, 0);
    const activeGroups = data.filter(g => g.member_count > 0).length;
    
    setStats({
      totalGroups: data.length,
      totalMembers,
      activeGroups,
      emptyGroups: data.length - activeGroups
    });
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    try {
      await api.delete(`/groups/${selectedGroup.id}/`);
      setToast({ message: 'Group deleted successfully.', type: 'success', isVisible: true });
      fetchGroups();
    } catch (err) {
      setToast({ message: 'Failed to delete group.', type: 'error', isVisible: true });
    } finally {
      setShowDelete(false);
      setSelectedGroup(null);
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'OPEN': return 'bg-green-100 text-green-800';
      case 'APPLICATION': return 'bg-blue-100 text-blue-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-500 text-sm">Manage member segments and filters.</p>
        </div>
        <Link 
          href={`${basePath}/create`}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow transition text-center"
        >
          + Create New Group
        </Link>
      </div>

      {/* ANALYTICS CARDS (Same as before) */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase">Total Groups</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalGroups}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase">Total Members</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.totalMembers}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase">Active Groups</p>
            <p className="text-2xl font-bold text-green-600">{stats.activeGroups}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase">Empty Groups</p>
            <p className="text-2xl font-bold text-gray-400">{stats.emptyGroups}</p>
          </div>
        </div>
      )}

      {/* GROUPS LIST */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-2">No groups found.</p>
            <p className="text-sm text-gray-400">Create your first group to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Group Name</th>
                  
                  {/* DYNAMIC COLUMNS */}
                  {isSuperAdmin && <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Municipality</th>}
                  {(isSuperAdmin || isMuniAdmin) && <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Club</th>}
                  
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Members</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-bold text-gray-900">{group.name}</div>
                          {group.is_system_group && (
                            <span className="text-[10px] uppercase font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">System</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* DYNAMIC CELLS */}
                    {isSuperAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {group.municipality_name || '-'}
                      </td>
                    )}
                    {(isSuperAdmin || isMuniAdmin) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {group.club_name || '-'}
                      </td>
                    )}

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getBadgeStyle(group.group_type)}`}>
                        {group.group_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">{group.member_count}</div>
                      {group.pending_request_count > 0 && (
                        <div className="text-xs text-orange-600 font-semibold">
                          {group.pending_request_count} pending
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <Link 
                        href={`${basePath}/${group.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </Link>
                      {!group.is_system_group && (
                        <button 
                          onClick={() => { setSelectedGroup(group); setShowDelete(true); }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isVisible={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        itemName={selectedGroup?.name}
        message="Are you sure? This will remove all members from this group."
      />

      <Toast {...toast} onClose={() => setToast({ ...toast, isVisible: false })} />
    </div>
  );
}