'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { visits } from '@/lib/api';
import { getMediaUrl } from '@/app/utils';
import Toast from '@/app/components/Toast';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

  if (loading) return <div className="py-20 text-center text-gray-400 animate-pulse">Loading live data...</div>;

  // Ensure sessions is always an array
  const sessionsArray = Array.isArray(sessions) ? sessions : [];

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-row items-center justify-between">
          <h3 className="text-base font-semibold text-[#121213]">
            Currently Inside ({sessionsArray.length})
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchSessions}
            className="gap-2 text-[#4D4DA4] hover:text-[#4D4DA4] hover:bg-[#EBEBFE]"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {sessionsArray.length === 0 ? (
          <div className="py-20 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-500">No active check-ins. The club is empty.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-[#EBEBFE]/50">
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead className="text-[#4D4DA4] font-semibold">Member</TableHead>
                  <TableHead className="text-[#4D4DA4] font-semibold">Check-in Time</TableHead>
                  <TableHead className="text-[#4D4DA4] font-semibold">Method</TableHead>
                  <TableHead className="text-right text-[#4D4DA4] font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionsArray.map((session) => (
                  <TableRow key={session.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-lg border border-gray-200">
                          <AvatarImage src={getMediaUrl(session.user_details.avatar) || undefined} className="object-cover" />
                          <AvatarFallback className="rounded-lg font-bold text-[10px] bg-[#EBEBFE] text-[#4D4DA4]">
                            {(session.user_details.first_name || 'U')[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-[#121213]">
                            {session.user_details.first_name || 'User'} {session.user_details.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {session.user_details.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-gray-600">
                      {new Date(session.check_in_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge 
                        variant="outline" 
                        className={session.method === 'QR_KIOSK' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                        }
                      >
                        {session.method === 'QR_KIOSK' ? 'Self Scan' : 'Manual'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      {session.check_out_at ? (
                        <span className="text-gray-400 text-sm">
                          Checked out: {new Date(session.check_out_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      ) : (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckOut(session.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          Check Out
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
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