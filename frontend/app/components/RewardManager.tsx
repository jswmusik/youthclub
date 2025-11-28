'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import Toast from './Toast';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { getMediaUrl } from '../utils';

interface Reward {
  id: number;
  name: string;
  image: string | null;
  owner_role: string;
  municipality_name?: string;
  club_name?: string;
  is_active: boolean;
  expiration_date: string | null;
  usage_limit: number | null;
}

interface Analytics {
  total_created: number;
  active_rewards: number;
  expired_rewards: number;
  total_uses: number;
  uses_last_7_days: number;
}

interface RewardManagerProps {
  basePath: string; // e.g. "/admin/super/rewards"
}

export default function RewardManager({ basePath }: RewardManagerProps) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Actions
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });
  const [rewardToDelete, setRewardToDelete] = useState<Reward | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/rewards/'),
        api.get('/rewards/analytics_overview/')
      ]);
      
      setRewards(Array.isArray(listRes.data) ? listRes.data : listRes.data.results);
      setAnalytics(statsRes.data);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to load rewards.', type: 'error', isVisible: true });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!rewardToDelete) return;
    try {
      await api.delete(`/rewards/${rewardToDelete.id}/`);
      setToast({ message: 'Reward deleted successfully.', type: 'success', isVisible: true });
      setRewardToDelete(null);
      fetchData(); // Refresh list
    } catch (err) {
      setToast({ message: 'Failed to delete reward.', type: 'error', isVisible: true });
    }
  };

  const getScopeLabel = (r: Reward) => {
    if (r.owner_role === 'SUPER_ADMIN') return '🌍 Global';
    if (r.owner_role === 'MUNICIPALITY_ADMIN') return `🏛️ ${r.municipality_name}`;
    if (r.owner_role === 'CLUB_ADMIN') return `⚽ ${r.club_name}`;
    return '-';
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading rewards...</div>;

  return (
    <div className="space-y-8">
      
      {/* 1. HEADER & ACTIONS */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Rewards Management</h1>
        <Link 
          href={`${basePath}/create`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow transition"
        >
          + Create Reward
        </Link>
      </div>

      {/* 2. ANALYTICS CARDS */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase">Active Rewards</p>
            <p className="text-2xl font-bold text-green-600">{analytics.active_rewards}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase">Total Created</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.total_created}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase">Total Claims</p>
            <p className="text-2xl font-bold text-blue-600">{analytics.total_uses}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase">Claims (7 Days)</p>
            <p className="text-2xl font-bold text-purple-600">{analytics.uses_last_7_days}</p>
          </div>
        </div>
      )}

      {/* 3. LIST TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Reward</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Scope</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Expiry</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rewards.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No rewards found.</td></tr>
            ) : rewards.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border">
                      {r.image ? (
                        <img src={getMediaUrl(r.image) || ''} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-lg">🎁</div>
                      )}
                    </div>
                    <span className="font-bold text-gray-900">{r.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{getScopeLabel(r)}</td>
                <td className="px-6 py-4">
                  {r.is_active 
                    ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">Active</span>
                    : <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-bold">Inactive</span>
                  }
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {r.expiration_date ? new Date(r.expiration_date).toLocaleDateString() : 'No Expiry'}
                </td>
                <td className="px-6 py-4 text-right space-x-3 text-sm">
                  <Link href={`${basePath}/${r.id}`} className="text-indigo-600 font-bold hover:underline">View</Link>
                  <Link href={`${basePath}/edit/${r.id}`} className="text-blue-600 font-bold hover:underline">Edit</Link>
                  <button onClick={() => setRewardToDelete(r)} className="text-red-600 font-bold hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteConfirmationModal
        isVisible={!!rewardToDelete}
        onClose={() => setRewardToDelete(null)}
        onConfirm={handleDelete}
        itemName={rewardToDelete?.name}
      />

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}