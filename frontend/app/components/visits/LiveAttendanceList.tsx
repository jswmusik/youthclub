'use client';

import { useEffect, useState } from 'react';
import { visits } from '@/lib/api';
import Toast from '@/app/components/Toast';

// Define the shape of our session data based on the API serializer
interface Session {
  id: number;
  user_details: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar?: string;
    age?: number;
  };
  check_in_at: string;
  check_out_at: string | null;
  method: string;
}

export default function LiveAttendanceList({ clubId, refreshTrigger }: { clubId: string | number, refreshTrigger: number }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  const fetchSessions = async () => {
    try {
      const res = await visits.getActiveSessions(clubId);
      // Handle paginated response (results array) or direct array
      const data = res.data;
      let sessionsList: Session[] = [];
      
      if (Array.isArray(data)) {
        sessionsList = data;
      } else if (data && Array.isArray(data.results)) {
        sessionsList = data.results;
      }
      
      // Additional frontend filter: Only show sessions that haven't been checked out
      // This is a safety check in case backend filtering isn't working
      sessionsList = sessionsList.filter(session => !session.check_out_at);
      
      // Additional safety: Only show the most recent active session per user
      // Group by user ID and take the most recent check-in
      const userSessionsMap = new Map<number, Session>();
      sessionsList.forEach(session => {
        const userId = session.user_details.id;
        const existing = userSessionsMap.get(userId);
        if (!existing || new Date(session.check_in_at) > new Date(existing.check_in_at)) {
          userSessionsMap.set(userId, session);
        }
      });
      
      setSessions(Array.from(userSessionsMap.values()));
    } catch (error) {
      console.error("Failed to fetch sessions", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when the trigger changes (e.g. after a manual check-in)
  useEffect(() => {
    fetchSessions();
    // Optional: Auto-refresh every 30 seconds to keep list live
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, [clubId, refreshTrigger]);

  const handleCheckOut = async (sessionId: number) => {
    try {
      await visits.checkOut(sessionId);
      setToast({ message: "Checked out successfully", type: 'success', isVisible: true });
      fetchSessions(); // Refresh list immediately
    } catch (error) {
      setToast({ message: "Could not check out", type: 'error', isVisible: true });
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading live data...</div>;

  // Ensure sessions is always an array
  const sessionsArray = Array.isArray(sessions) ? sessions : [];

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-semibold text-slate-700">Currently Inside ({sessionsArray.length})</h3>
        <button onClick={fetchSessions} className="text-sm text-emerald-600 hover:underline">Refresh</button>
      </div>
      
      {sessionsArray.length === 0 ? (
        <div className="p-10 text-center text-slate-400">
          No active check-ins. The club is empty.
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="p-4">Member</th>
              <th className="p-4">Check-in Time</th>
              <th className="p-4">Method</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessionsArray.map((session) => (
              <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                       {/* You can use your UserAvatar component here */}
                       {session.user_details.avatar ? (
                         <img src={session.user_details.avatar} alt="avatar" />
                       ) : (
                         <span className="text-xs font-bold text-slate-500">
                            {(session.user_details.first_name || 'U')[0]}
                         </span>
                       )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">
                        {session.user_details.first_name || 'User'} {session.user_details.last_name}
                      </div>
                      <div className="text-xs text-slate-500">
                         {session.user_details.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-slate-600">
                  {new Date(session.check_in_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    session.method === 'QR_KIOSK' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {session.method === 'QR_KIOSK' ? 'Self Scan' : 'Manual'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {session.check_out_at ? (
                    <span className="text-gray-400 text-sm">
                      Checked out: {new Date(session.check_out_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleCheckOut(session.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded border border-red-200"
                    >
                      Check Out
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}