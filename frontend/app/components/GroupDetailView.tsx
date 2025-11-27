'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import Toast from './Toast';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface GroupDetailProps {
  groupId: string;
  basePath: string; // e.g. "/admin/super/groups"
}

export default function GroupDetailView({ groupId, basePath }: GroupDetailProps) {
  const router = useRouter();
  const [group, setGroup] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'MEMBERS' | 'SETTINGS'>('DASHBOARD');
  const [loading, setLoading] = useState(true);
  
  // Actions
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });
  const [memberToRemove, setMemberToRemove] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupRes, analyticsRes, membersRes] = await Promise.all([
        api.get(`/groups/${groupId}/`),
        api.get(`/groups/${groupId}/analytics/`),
        api.get(`/groups/${groupId}/members/`)
      ]);
      setGroup(groupRes.data);
      setAnalytics(analyticsRes.data);
      setMembers(membersRes.data.results || membersRes.data);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to load group details.', type: 'error', isVisible: true });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!confirm("Create a copy of this group?")) return;
    try {
      await api.post(`/groups/${groupId}/duplicate/`);
      setToast({ message: 'Group duplicated! Check the list.', type: 'success', isVisible: true });
      setTimeout(() => router.push(basePath), 1000);
    } catch (err) {
      setToast({ message: 'Failed to duplicate.', type: 'error', isVisible: true });
    }
  };

  const handleApproveMember = async (membershipId: number) => {
    try {
      await api.post(`/groups/${groupId}/approve_member/`, { membership_id: membershipId });
      setToast({ message: 'Member approved.', type: 'success', isVisible: true });
      fetchData(); // Refresh list
    } catch (err) {
      setToast({ message: 'Failed to approve.', type: 'error', isVisible: true });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await api.post(`/groups/${groupId}/remove_member/`, { membership_id: memberToRemove });
      setToast({ message: 'Member removed.', type: 'success', isVisible: true });
      setMemberToRemove(null);
      fetchData();
    } catch (err) {
      setToast({ message: 'Failed to remove member.', type: 'error', isVisible: true });
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading group details...</div>;
  if (!group) return <div className="p-12 text-center text-red-500">Group not found.</div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase
              ${group.group_type === 'OPEN' ? 'bg-green-100 text-green-800' : 
                group.group_type === 'CLOSED' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}
            `}>
              {group.group_type}
            </span>
          </div>
          
          {/* NEW: Context Info (Club/Muni) */}
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
            {group.club_name && (
              <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                🏢 <b>Club:</b> {group.club_name}
              </span>
            )}
            {group.municipality_name && (
              <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                🏛️ <b>Municipality:</b> {group.municipality_name}
              </span>
            )}
            {!group.club_name && !group.municipality_name && !group.is_system_group && (
              <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                🌍 Global Group
              </span>
            )}
          </div>

          <p className="text-gray-500 mt-2">{group.description || 'No description provided.'}</p>
        </div>
        
        {/* Buttons remain the same */}
        <div className="flex gap-2">
          {!group.is_system_group && (
            <>
              <Link 
                href={`${basePath}/edit/${group.id}`}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200"
              >
                Edit
              </Link>
              <button 
                onClick={handleDuplicate}
                className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium hover:bg-indigo-100"
              >
                Duplicate
              </button>
            </>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {['DASHBOARD', 'MEMBERS', 'SETTINGS'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </nav>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'DASHBOARD' && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-xs font-bold uppercase">Total Members</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total_members}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-xs font-bold uppercase">New This Week</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">+{analytics.new_this_week}</p>
          </div>
          
          {/* Gender Dist */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 col-span-1 md:col-span-2">
            <h3 className="text-gray-500 text-xs font-bold uppercase mb-4">Gender Distribution</h3>
            <div className="flex gap-4">
              {Object.entries(analytics.gender_distribution || {}).map(([key, val]: any) => (
                <div key={key} className="text-center bg-gray-50 p-3 rounded-lg min-w-[80px]">
                  <span className="block text-xl font-bold text-gray-800">{val}</span>
                  <span className="text-xs text-gray-500 uppercase">{key || 'Unset'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grade Dist */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 col-span-1 md:col-span-4">
            <h3 className="text-gray-500 text-xs font-bold uppercase mb-4">Grade Distribution</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(analytics.grade_distribution || {}).map(([grade, count]: any) => (
                <div key={grade} className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-800">Grade {grade}</span>
                  <span className="bg-white text-indigo-600 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">{count}</span>
                </div>
              ))}
              {Object.keys(analytics.grade_distribution || {}).length === 0 && <p className="text-sm text-gray-400">No data available.</p>}
            </div>
          </div>
        </div>
      )}

      {/* MEMBERS TAB */}
      {activeTab === 'MEMBERS' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Member</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {members.map((m: any) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {m.user_avatar ? (
                        <img src={m.user_avatar} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold">
                          {m.user_name.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{m.user_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{m.user_email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold 
                      ${m.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                        m.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}
                    `}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {m.status === 'PENDING' && (
                      <button 
                        onClick={() => handleApproveMember(m.id)}
                        className="text-green-600 hover:text-green-800 font-bold text-xs uppercase"
                      >
                        Approve
                      </button>
                    )}
                    <button 
                      onClick={() => setMemberToRemove(m.id)}
                      className="text-red-600 hover:text-red-800 font-bold text-xs uppercase"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No members in this group yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'SETTINGS' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <span className="block text-gray-500 font-bold uppercase text-xs">Target Audience</span>
              <span className="text-gray-900">{group.target_member_type === 'YOUTH' ? 'Youth Members' : 'Guardians'}</span>
            </div>
            <div>
              <span className="block text-gray-500 font-bold uppercase text-xs">Age Range</span>
              <span className="text-gray-900">
                {group.min_age || 0} - {group.max_age || 'Any'} years
              </span>
            </div>
            <div>
              <span className="block text-gray-500 font-bold uppercase text-xs">Allowed Grades</span>
              <span className="text-gray-900">
                {group.grades?.length > 0 ? group.grades.join(', ') : 'All Grades'}
              </span>
            </div>
            <div>
              <span className="block text-gray-500 font-bold uppercase text-xs">Allowed Genders</span>
              <span className="text-gray-900">
                {group.genders?.length > 0 ? group.genders.join(', ') : 'All Genders'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="block text-gray-500 font-bold uppercase text-xs mb-2">Required Interests</span>
              <div className="flex flex-wrap gap-2">
                {group.interests_details?.map((i: any) => (
                  <span key={i.id} className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-xs font-medium border border-purple-100">
                    {i.name}
                  </span>
                ))}
                {(!group.interests_details || group.interests_details.length === 0) && (
                  <span className="text-gray-400 italic">None</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <DeleteConfirmationModal
        isVisible={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message="Are you sure you want to remove this member from the group?"
        confirmButtonText="Remove"
      />

      <Toast {...toast} onClose={() => setToast({ ...toast, isVisible: false })} />
    </div>
  );
}