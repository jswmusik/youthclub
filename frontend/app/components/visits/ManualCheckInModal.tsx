'use client';

import { useState, useEffect } from 'react';
import { visits, users } from '@/lib/api';
import Toast from '@/app/components/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualCheckInModal({ isOpen, onClose, onSuccess }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 2) {
        try {
          const res = await users.search(query);
          setResults(res.data.results || res.data || []); // Handle pagination structure
        } catch (e) {
          console.error(e);
          setResults([]);
        }
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await visits.manualCheckIn({ user_id: selectedUser.id });
      setToast({ message: `Checked in ${selectedUser.first_name}`, type: 'success', isVisible: true });
      setQuery('');
      setSelectedUser(null);
      setResults([]);
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      setToast({ 
        message: error.response?.data?.error || "Failed to check in", 
        type: 'error', 
        isVisible: true 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">Manual Check-in</h2>
            <p className="text-sm text-gray-500">Search for a member by name or email.</p>
          </div>

          <div className="p-6 space-y-4">
            {/* Search Input */}
            {!selectedUser ? (
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full p-3 border rounded-lg pl-10 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Type name (e.g. 'Alice')"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
                <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
                
                {/* Dropdown Results */}
                {results.length > 0 && (
                  <div className="absolute w-full bg-white border rounded-lg mt-1 shadow-xl max-h-60 overflow-y-auto z-10">
                    {results.map(user => (
                      <button
                        key={user.id}
                        onClick={() => { setSelectedUser(user); setResults([]); }}
                        className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                          {(user.first_name?.[0] || 'U')}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {query.length > 2 && results.length === 0 && (
                  <div className="absolute w-full bg-white border rounded-lg mt-1 p-3 text-sm text-gray-500 text-center">
                    No members found.
                  </div>
                )}
              </div>
            ) : (
              // Selected User View
              <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center text-emerald-800 font-bold">
                    {selectedUser.first_name?.[0] || 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{selectedUser.first_name} {selectedUser.last_name}</div>
                    <div className="text-xs text-emerald-700">Ready to check in</div>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedUser(null); setQuery(''); }}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  Change
                </button>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button 
                onClick={handleSubmit}
                disabled={!selectedUser || loading}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Checking in...' : 'Confirm Check-in'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  );
}
