'use client';

import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Toast from './Toast';
import { getMediaUrl } from '../../app/utils';

export default function GroupRequestsManager() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('group_name', filter);
      
      const res = await api.get(`/group-requests/?${params.toString()}`);
      setRequests(Array.isArray(res.data) ? res.data : res.data.results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      await api.post(`/group-requests/${id}/${action}/`);
      setToast({ 
        message: action === 'approve' ? 'Member approved!' : 'Request rejected.', 
        type: 'success', 
        isVisible: true 
      });
      fetchRequests(); // Refresh list
    } catch (err) {
      setToast({ message: 'Action failed.', type: 'error', isVisible: true });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Pending Applications</h2>
          <p className="text-sm text-gray-500">Manage users waiting to join your groups.</p>
        </div>
        <div className="w-full sm:w-64">
          <input 
            type="text" 
            placeholder="Filter by group name..." 
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="mb-2">No pending applications found.</p>
            {filter && <button onClick={() => setFilter('')} className="text-blue-600 underline text-sm">Clear filter</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Applying To</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Requested</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {req.user_avatar ? (
                          <img src={getMediaUrl(req.user_avatar) || ''} className="w-8 h-8 rounded-full object-cover bg-gray-200" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                            {req.user_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-bold text-gray-900">{req.user_name}</div>
                          <div className="text-xs text-gray-500">{req.user_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 bg-blue-50 px-2 py-1 rounded text-blue-700">
                        {req.group_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(req.joined_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <button 
                        onClick={() => handleAction(req.id, 'approve')}
                        className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-200 transition"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleAction(req.id, 'reject')}
                        className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition"
                      >
                        Deny
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}