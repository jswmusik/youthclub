'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../utils';

interface RewardDetailProps {
  rewardId: string;
  basePath: string; // e.g. "/admin/super/rewards"
}

export default function RewardDetailView({ rewardId, basePath }: RewardDetailProps) {
  const searchParams = useSearchParams();
  const [reward, setReward] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const scope = searchParams.get('scope');
    const status = searchParams.get('status');
    const expired = searchParams.get('expired');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (scope) params.set('scope', scope);
    if (status) params.set('status', status);
    if (expired) params.set('expired', expired);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  useEffect(() => {
    if (rewardId) {
      fetchData();
    }
  }, [rewardId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewardRes, statsRes, historyRes] = await Promise.all([
        api.get(`/rewards/${rewardId}/`),
        api.get(`/rewards/${rewardId}/analytics_detail/`),
        api.get(`/rewards/${rewardId}/history/`)
      ]);
      setReward(rewardRes.data);
      setAnalytics(statsRes.data);
      setHistory(historyRes.data.results || historyRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading details...</div>;
  if (!reward) return <div className="p-12 text-center text-red-500">Reward not found.</div>;

  return (
    <div className="space-y-8">
      
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-6">
          {/* Image */}
          <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden border flex-shrink-0">
            {reward.image ? (
              <img src={getMediaUrl(reward.image) || ''} className="w-full h-full object-cover" alt="Reward" />
            ) : (
              <div className="flex items-center justify-center h-full text-2xl">🎁</div>
            )}
          </div>
          
          {/* Title & Status */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-gray-900">{reward.name}</h1>
              {reward.is_active ? (
                <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">Active</span>
              ) : (
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">Inactive</span>
              )}
            </div>
            
            <p className="text-gray-500 text-sm mb-2">
              Owned by: <span className="font-semibold">{reward.municipality_name || reward.club_name || 'Super Admin'}</span>
            </p>

            <div className="flex gap-2">
              <Link href={buildUrlWithParams(`${basePath}/edit/${reward.id}`)} className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-200">
                Edit Reward
              </Link>
              <Link href={buildUrlWithParams(basePath)} className="text-gray-500 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-50">
                Back to List
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ANALYTICS GRID */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase">Total Claims</p>
            <p className="text-2xl font-bold text-blue-600">{analytics.total_uses}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase">Last 24h</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.uses_last_24h}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase">Last 7 Days</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.uses_last_7d}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase">Last 30 Days</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.uses_last_30d}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase">Days Left</p>
            <p className="text-2xl font-bold text-orange-600">{analytics.days_remaining !== null ? analytics.days_remaining : '∞'}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 3. LEFT COL: INFO & CONFIG */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">About</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{reward.description}</p>
            
            {(reward.sponsor_name || reward.sponsor_link) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase">Sponsor</p>
                <p className="text-sm font-medium">
                  {reward.sponsor_name || 'Anonymous'} 
                  {reward.sponsor_link && (
                    <a href={reward.sponsor_link} target="_blank" className="ml-2 text-blue-600 hover:underline">
                      (Visit Website)
                    </a>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Usage History Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Claim History</h3>
              <span className="text-xs text-gray-500">Latest claims</span>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Date Claimed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((usage) => (
                  <tr key={usage.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{usage.user_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{usage.user_email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-right">
                      {/* Show redeemed_at if available, otherwise fallback to created_at */}
                      {(() => {
                        const date = usage.redeemed_at ? new Date(usage.redeemed_at) : (usage.created_at ? new Date(usage.created_at) : null);
                        if (!date) return 'N/A';
                        const dateStr = date.toLocaleDateString();
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        return `${dateStr} ${hours}:${minutes}`;
                      })()}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      No one has claimed this reward yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. RIGHT COL: RULES */}
        <div className="space-y-6">
          
          {/* Target Rules */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Targeting Rules</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="block text-gray-500 text-xs font-bold uppercase">Target Audience</span>
                <span className="font-medium">{reward.target_member_type === 'YOUTH_MEMBER' ? 'Youth Members' : 'Guardians'}</span>
              </div>
              
              <div>
                <span className="block text-gray-500 text-xs font-bold uppercase">Age Range</span>
                <span>{reward.min_age || 0} - {reward.max_age || 'Any'} years</span>
              </div>

              {reward.target_grades && reward.target_grades.length > 0 && (
                <div>
                  <span className="block text-gray-500 text-xs font-bold uppercase">Grades</span>
                  <span>{reward.target_grades.join(', ')}</span>
                </div>
              )}

              {reward.target_genders && reward.target_genders.length > 0 && (
                <div>
                  <span className="block text-gray-500 text-xs font-bold uppercase">Genders</span>
                  <span className="capitalize">{reward.target_genders.join(', ').toLowerCase()}</span>
                </div>
              )}

              {reward.target_groups_details && reward.target_groups_details.length > 0 && (
                <div>
                  <span className="block text-gray-500 text-xs font-bold uppercase mb-1">Specific Groups</span>
                  <div className="flex flex-wrap gap-1">
                    {reward.target_groups_details.map((g: any) => (
                      <span key={g.id} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs border border-blue-100">
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Triggers */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Active Triggers</h3>
            {reward.active_triggers && reward.active_triggers.length > 0 ? (
              <div className="space-y-2">
                {reward.active_triggers.map((t: string) => (
                  <div key={t} className="flex items-center gap-2 bg-green-50 text-green-800 px-3 py-2 rounded-lg border border-green-100">
                    <span>⚡</span>
                    <span className="font-bold text-sm">{t}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No automatic triggers set. Manual claim only.</p>
            )}
          </div>

          {/* Limits */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Availability</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="block text-gray-500 text-xs font-bold uppercase">Expires On</span>
                <span className={reward.expiration_date ? '' : 'text-gray-400'}>
                  {reward.expiration_date ? new Date(reward.expiration_date).toLocaleDateString() : 'No Expiration'}
                </span>
              </div>
              <div>
                <span className="block text-gray-500 text-xs font-bold uppercase">Usage Limit</span>
                <span>{reward.usage_limit ? `${reward.usage_limit} total claims` : 'Unlimited'}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}