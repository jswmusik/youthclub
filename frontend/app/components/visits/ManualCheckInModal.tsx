'use client';

import { useState, useEffect } from 'react';
import { visits, users } from '@/lib/api';
import Toast from '@/app/components/Toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Search, UserPlus, X, CheckCircle2 } from 'lucide-react';
import { getMediaUrl } from '@/app/utils';

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

  // Helper function to get user initials
  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || 'U';
  };

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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg border-2 border-gray-100 bg-white shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-[#4D4DA4] rounded-full"></div>
              <DialogTitle className="text-xl font-bold text-[#121213] flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#4D4DA4]" />
                Manual Check-in
              </DialogTitle>
            </div>
            <DialogDescription className="text-gray-500 mt-1">
              Search for a member by name or email to check them in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search Input */}
            {!selectedUser ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  type="text" 
                  className="pl-10 bg-gray-50 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                  placeholder="Type name or email (e.g. 'Alice')"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
                
                {/* Dropdown Results */}
                {results.length > 0 && (
                  <div className="absolute w-full bg-white border border-gray-200 rounded-lg mt-2 shadow-lg max-h-60 overflow-y-auto z-10">
                    {results.map(user => (
                      <button
                        key={user.id}
                        onClick={() => { setSelectedUser(user); setResults([]); }}
                        className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors"
                      >
                        <Avatar className="h-9 w-9 rounded-lg border border-gray-200">
                          <AvatarImage src={getMediaUrl(user.avatar) || undefined} className="object-cover" />
                          <AvatarFallback className="rounded-lg font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                            {getInitials(user.first_name, user.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#121213] truncate">{user.first_name} {user.last_name}</div>
                          <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {query.length > 2 && results.length === 0 && (
                  <div className="absolute w-full bg-white border border-gray-200 rounded-lg mt-2 p-3 text-sm text-gray-500 text-center shadow-lg">
                    No members found.
                  </div>
                )}
              </div>
            ) : (
              // Selected User View
              <Card className="border-2 border-[#4D4DA4]/20 bg-gradient-to-br from-[#EBEBFE]/30 to-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 rounded-lg border-2 border-[#4D4DA4]/30">
                        <AvatarImage src={getMediaUrl(selectedUser.avatar) || undefined} className="object-cover" />
                        <AvatarFallback className="rounded-lg font-bold text-sm bg-gradient-to-br from-[#4D4DA4] to-[#FF5485] text-white">
                          {getInitials(selectedUser.first_name, selectedUser.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-[#121213]">{selectedUser.first_name} {selectedUser.last_name}</div>
                        <div className="text-xs text-gray-500">{selectedUser.email}</div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-[#10B981] font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Ready to check in
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelectedUser(null); setQuery(''); }}
                      className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!selectedUser || loading}
              className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full px-6 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Checking in...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Confirm Check-in
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
