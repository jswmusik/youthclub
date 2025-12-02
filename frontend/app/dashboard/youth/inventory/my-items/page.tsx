'use client';

import { useState, useEffect, useCallback } from 'react';
import { inventoryApi, ItemCategory } from '@/lib/inventory-api';
import ActiveTicket from '@/app/components/inventory/ActiveTicket';
import { PackageOpen, History, Package, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import NavBar from '@/app/components/NavBar';
import { getMediaUrl } from '@/app/utils';
import { differenceInMinutes, parseISO } from 'date-fns';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '@/app/components/ConfirmationModal';

export default function MyItemsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const data = await inventoryApi.getCategories();
      setCategories(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getMySessions();
      // Handle paginated response (results array) or direct array
      setSessions(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadSessions();
  }, [loadCategories]);

  // Filter Data
  const activeSessions = sessions.filter(s => {
    const matchesSearch = searchTerm === '' || 
      s.item_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || s.item_category === selectedCategory;
    return s.status === 'ACTIVE' && matchesSearch && matchesCategory;
  });
  
  const pastSessions = sessions.filter(s => {
    const matchesSearch = searchTerm === '' || 
      s.item_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || s.item_category === selectedCategory;
    return s.status !== 'ACTIVE' && matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* --- SIDEBAR FILTERS (Sticky) --- */}
          <aside className="w-full md:w-64 flex-shrink-0 space-y-8 md:sticky md:top-[72px] md:self-start md:max-h-[calc(100vh-88px)] md:overflow-y-auto">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Items</h1>
              <p className="text-sm text-gray-500 mt-1">Borrowing History</p>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Search</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Find an item..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Category Filters */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category</label>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedCategory === null 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                      selectedCategory === category.id 
                        ? 'bg-blue-50 text-blue-700 font-medium' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* --- MAIN CONTENT --- */}
          <main className="flex-1 space-y-8">
            
            {/* SECTION 1: Active Tickets */}
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <PackageOpen size={16} /> Active Now
              </h2>
              
              {loading ? (
                <div className="text-center py-8 text-gray-400">Loading...</div>
              ) : activeSessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {activeSessions.map(session => (
                    <ActiveSessionCard 
                      key={session.id} 
                      session={session} 
                      onReturnSuccess={loadSessions} 
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center">
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? 'No active items found matching your search.' : 'You are not borrowing anything right now.'}
                  </p>
                  <Link 
                    href="/dashboard/youth/inventory"
                    className="inline-block px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Browse Items
                  </Link>
                </div>
              )}
            </div>

            {/* SECTION 2: History */}
            {pastSessions.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <History size={16} /> History
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {pastSessions.map(session => (
                    <PastSessionCard key={session.id} session={session} />
                  ))}
                </div>
              </div>
            )}

            {!loading && activeSessions.length === 0 && pastSessions.length === 0 && (
              <div className="bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center">
                <p className="text-gray-500 mb-4">No items found matching your search.</p>
                <button 
                  onClick={() => { setSearchTerm(''); setSelectedCategory(null); }}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// Active Session Card Component (styled like InventoryCard)
function ActiveSessionCard({ session, onReturnSuccess }: { session: any, onReturnSuccess: () => void }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const due = parseISO(session.due_at);
      return differenceInMinutes(due, now);
    };
    
    setTimeLeft(calculateTime());
    const interval = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [session.due_at]);

  const formatTimeLeft = (minutes: number): string => {
    if (minutes < 0) return 'Overdue';
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      return `${hours}h ${mins}m`;
    }
    if (minutes < 2) {
      const now = new Date();
      const due = parseISO(session.due_at);
      const secondsLeft = Math.floor((due.getTime() - now.getTime()) / 1000);
      if (secondsLeft < 0) return 'Overdue';
      const mins = Math.floor(secondsLeft / 60);
      const secs = secondsLeft % 60;
      return `${mins}m ${secs}s`;
    }
    return `${Math.ceil(minutes)}m`;
  };

  const handleReturnConfirm = async () => {
    setLoading(true);
    try {
      await inventoryApi.returnItem(session.item);
      toast.success("Item returned successfully!");
      setShowReturnModal(false);
      onReturnSuccess();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Failed to return item.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = timeLeft <= 0;
  const borrowedDate = new Date(session.borrowed_at);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
        {/* Header Image */}
        <div className="h-32 bg-gray-200 relative">
          {session.item_image ? (
            <img src={getMediaUrl(session.item_image)} alt={session.item_title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
              <Package className="text-white w-12 h-12" />
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            <span className={`backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-medium ${
              isOverdue ? 'bg-red-500/90' : 'bg-green-500/90'
            }`}>
              {isOverdue ? 'Overdue' : 'Active'}
            </span>
          </div>

          {/* Category Badge */}
          {session.item_category_details && (
            <span className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-medium">
              {session.item_category_details.icon} {session.item_category_details.name}
            </span>
          )}
        </div>

        {/* Card Body */}
        <div className="p-5 flex-1 flex flex-col">
          <div className="mb-3">
            <h3 className="font-bold text-gray-900 text-lg leading-tight">{session.item_title}</h3>
            <p className="text-xs text-gray-500 mt-1">
              Borrowed {borrowedDate.toLocaleDateString()} at {borrowedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
          
          {/* Meta Row */}
          <div className="mb-4 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span className={`flex items-center gap-1 font-semibold ${
              isOverdue 
                ? 'text-red-600' 
                : timeLeft < 15 
                ? 'text-orange-600' 
                : 'text-green-600'
            }`}>
              <Clock size={12} /> 
              {isOverdue ? (
                <span className="flex items-center gap-1">
                  <AlertTriangle size={12} /> Overdue
                </span>
              ) : (
                `${formatTimeLeft(timeLeft)} left`
              )}
            </span>
            {session.is_guest && (
              <span className="text-purple-600 font-medium">Guest Visit</span>
            )}
          </div>

          {/* Return Now Label */}
          {isOverdue && (
            <div className="mb-4 flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg w-fit">
              <AlertTriangle size={14} className="text-red-600" />
              <span className="text-red-600 font-bold text-xs uppercase tracking-wide">
                Return Now!
              </span>
            </div>
          )}

          {/* Footer Action */}
          <div className="mt-auto pt-4 border-t border-gray-100">
            <button 
              onClick={() => setShowReturnModal(true)}
              disabled={loading}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 ${
                loading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-green-600 text-white hover:bg-green-700 hover:shadow'
              }`}
            >
              {loading ? 'Processing...' : 'Return Item'}
            </button>
          </div>
        </div>
      </div>

      {/* Return Confirmation Modal */}
      <ConfirmationModal
        isVisible={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        onConfirm={handleReturnConfirm}
        title="Return Item"
        message={`⚠️ Confirm Return:\n\nHave you handed "${session.item_title}" back to the staff?`}
        confirmButtonText="Yes, Return"
        cancelButtonText="Cancel"
        isLoading={loading}
        variant="warning"
      />
    </>
  );
}

// Past Session Card Component (styled like InventoryCard)
function PastSessionCard({ session }: { session: any }) {
  const borrowedDate = new Date(session.borrowed_at);
  const returnedDate = session.returned_at ? new Date(session.returned_at) : null;
  const isAutoReturned = session.status === 'RETURNED_SYSTEM';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Header Image */}
      <div className="h-32 bg-gray-200 relative">
        {session.item_image ? (
          <img src={getMediaUrl(session.item_image)} alt={session.item_title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
            <Package className="text-white w-12 h-12" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <span className="bg-gray-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-medium">
            Returned
          </span>
        </div>

        {/* Category Badge */}
        {session.item_category_details && (
          <span className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-medium">
            {session.item_category_details.icon} {session.item_category_details.name}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-3">
          <h3 className="font-bold text-gray-900 text-lg leading-tight">{session.item_title}</h3>
        </div>
        
        {/* Meta Row */}
        <div className="mb-4 space-y-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>Borrowed: {borrowedDate.toLocaleDateString()}</span>
          </div>
          {returnedDate && (
            <div className="flex items-center gap-1">
              <CheckCircle size={12} className="text-green-600" />
              <span>Returned: {returnedDate.toLocaleDateString()}</span>
            </div>
          )}
          {session.is_guest && (
            <span className="text-purple-600 font-medium">Guest Visit</span>
          )}
        </div>

        {/* Footer Status */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isAutoReturned 
              ? 'bg-red-100 text-red-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isAutoReturned ? 'Auto-Returned' : 'Returned'}
          </span>
        </div>
      </div>
    </div>
  );
}

