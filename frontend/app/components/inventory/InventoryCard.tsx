'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import { Item, inventoryApi } from '@/lib/inventory-api';
import { Package, Clock, Users, AlertCircle, LogIn } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { differenceInMinutes, parseISO } from 'date-fns';
import { visits } from '@/lib/api';


interface InventoryCardProps {
  item: Item;
  onRefresh: () => void;
  darkMode?: boolean;
}

export default function InventoryCard({ item, onRefresh, darkMode = false }: InventoryCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showJoinQueueModal, setShowJoinQueueModal] = useState(false);
  const [showLeaveQueueModal, setShowLeaveQueueModal] = useState(false);
  const [showMaxLoansModal, setShowMaxLoansModal] = useState(false);
  const [maxLoansError, setMaxLoansError] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState<boolean | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Status Logic
  const isAvailable = item.status === 'AVAILABLE';
  const isBorrowed = item.status === 'BORROWED';
  
  // Check if current user is borrowing this item
  const isCurrentUserBorrowing = isBorrowed && item.active_loan?.user_id === user?.id;

  // Check if user is checked in to this item's club
  useEffect(() => {
    const checkCheckInStatus = async () => {
      if (!user || !isAvailable) {
        setCheckingStatus(false);
        return;
      }

      try {
        const response = await visits.getMyActiveVisit();
        const activeVisit = response.data;
        
        if (activeVisit.is_checked_in && activeVisit.club_id) {
          // Check if the active check-in is for this item's club
          setIsCheckedIn(activeVisit.club_id === item.club);
        } else {
          setIsCheckedIn(false);
        }
      } catch (error) {
        console.error('Error checking check-in status:', error);
        setIsCheckedIn(false);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkCheckInStatus();
  }, [user, item.club, isAvailable]);

  // Timer logic for borrowed items
  useEffect(() => {
    if (!isCurrentUserBorrowing || !item.active_loan?.due_at) {
      setTimeLeft(null);
      return;
    }

    const calculateTime = () => {
      try {
        const now = new Date();
        const due = parseISO(item.active_loan!.due_at);
        return differenceInMinutes(due, now);
      } catch (error) {
        console.error('Error calculating time left:', error);
        return null;
      }
    };

    // Set initial time
    setTimeLeft(calculateTime());

    // Update every second for better accuracy (especially when close to deadline)
    const interval = setInterval(() => {
      const newTime = calculateTime();
      setTimeLeft(newTime);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isCurrentUserBorrowing, item.active_loan?.due_at]);

  const formatTimeLeft = (minutes: number | null): string => {
    if (minutes === null) return '';
    if (minutes < 0) return 'Overdue';
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      return `${hours}h ${mins}m`;
    }
    // Show seconds when less than 2 minutes remaining for precision
    if (minutes < 2 && item.active_loan?.due_at) {
      try {
        const now = new Date();
        const due = parseISO(item.active_loan.due_at);
        const secondsLeft = Math.floor((due.getTime() - now.getTime()) / 1000);
        if (secondsLeft < 0) return 'Overdue';
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        return `${mins}m ${secs}s`;
      } catch (error) {
        return `${Math.ceil(minutes)}m`;
      }
    }
    return `${Math.ceil(minutes)}m`;
  };

  const handleBorrowClick = () => {
    setShowBorrowModal(true);
  };

  const handleBorrowConfirm = async () => {
    setLoading(true);
    try {
      await inventoryApi.borrowItem(item.id);
      toast.success("Borrowed! Show your ticket to staff.");
      setShowBorrowModal(false);
      onRefresh();
      // Refresh check-in status after borrowing
      const response = await visits.getMyActiveVisit();
      const activeVisit = response.data;
      if (activeVisit.is_checked_in && activeVisit.club_id) {
        setIsCheckedIn(activeVisit.club_id === item.club);
      } else {
        setIsCheckedIn(false);
      }
    } catch (error: any) {
      console.error(error);
      const errorData = error.response?.data;
      const msg = errorData?.error || "Could not borrow item.";
      
      // Show specific message for check-in requirement
      if (errorData?.code === 'CHECKIN_REQUIRED' || msg.includes('checked in')) {
        toast.error("You must be checked in to this club to borrow items.");
      } else if (
        errorData?.code === 'MAX_LOANS_REACHED' || 
        msg.includes('maximum borrowing limit') || 
        msg.includes('reached the maximum') ||
        msg.includes('maximum limit') ||
        (error.response?.status === 400 && msg.toLowerCase().includes('limit'))
      ) {
        // Show modal for max loans error
        setMaxLoansError(msg);
        setShowMaxLoansModal(true);
        setShowBorrowModal(false);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReturnClick = () => {
    setShowReturnModal(true);
  };

  const handleReturnConfirm = async () => {
    setLoading(true);
    try {
      await inventoryApi.returnItem(item.id);
      toast.success("Item returned successfully!");
      setShowReturnModal(false);
      onRefresh();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Failed to return item.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQueueClick = () => {
    setShowJoinQueueModal(true);
  };

  const handleJoinQueueConfirm = async () => {
    setLoading(true);
    try {
      await inventoryApi.joinQueue(item.id);
      toast.success("Joined the waiting list!");
      setShowJoinQueueModal(false);
      onRefresh();
    } catch (error: any) {
      const errorData = error.response?.data;
      const msg = errorData?.error || "Could not join queue.";
      
      // Show specific message for check-in requirement
      if (errorData?.code === 'CHECKIN_REQUIRED' || msg.includes('checked in')) {
        toast.error("You must be checked in to this club to join the waiting list.");
      } else {
        toast.error(msg);
      }
      setShowJoinQueueModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveQueueClick = () => {
    setShowLeaveQueueModal(true);
  };

  const handleLeaveQueueConfirm = async () => {
    setLoading(true);
    try {
      await inventoryApi.leaveQueue(item.id);
      toast.success("Left the waiting list.");
      setShowLeaveQueueModal(false);
      onRefresh();
    } catch (error: any) {
      const errorData = error.response?.data;
      const msg = errorData?.error || "Could not leave queue.";
      toast.error(msg);
      setShowLeaveQueueModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`overflow-hidden flex flex-col transition-all group ${
      darkMode 
        ? 'bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] hover:border-[var(--brand-primary)]/30' 
        : 'bg-white rounded-2xl shadow-md border-2 border-[#4D4DA4]/10 hover:shadow-xl hover:border-[#4D4DA4]/30'
    }`}>
      {/* Header Image */}
      <div className="h-40 sm:h-44 relative overflow-hidden">
        {item.image ? (
          <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${
            darkMode 
              ? 'bg-gradient-to-br from-[var(--dark-700)] to-[var(--dark-600)]' 
              : 'bg-gradient-to-br from-[#EBEBFE] to-[#FFE8F0]'
          }`}>
            <Package className={`w-14 h-14 ${darkMode ? 'text-[var(--brand-purple)] opacity-50' : 'text-[#4D4DA4] opacity-30'}`} />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3 flex gap-1">
          {isAvailable ? (
            <span className={`text-[10px] px-3 py-1.5 rounded-xl uppercase tracking-wide font-bold ${
              darkMode 
                ? 'bg-[var(--brand-third)] text-[var(--dark-900)]' 
                : 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-lg'
            }`}>
              Available
            </span>
          ) : (
            <span className={`text-[10px] px-3 py-1.5 rounded-xl uppercase tracking-wide font-bold ${
              darkMode 
                ? 'bg-[var(--brand-peach)] text-[var(--dark-900)]' 
                : 'bg-gradient-to-r from-[#FF8C42] to-[#FFA05C] text-white shadow-lg'
            }`}>
              Borrowed
            </span>
          )}
        </div>

        {/* Category Badge */}
        {item.category_details && (
          <span className={`absolute top-3 right-3 text-[10px] px-3 py-1.5 rounded-xl uppercase tracking-wide font-bold flex items-center gap-1 ${
            darkMode 
              ? 'bg-[var(--brand-purple)]/80 backdrop-blur-sm text-[var(--brand-light)]' 
              : 'bg-[#4D4DA4]/80 backdrop-blur-sm text-white'
          }`}>
            <span>{item.category_details.icon}</span>
            <span>{item.category_details.name}</span>
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <div className="mb-3">
          <h3 className={`font-bold text-base sm:text-lg leading-tight font-heading ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
          }`}>{item.title}</h3>
          {item.description && (
            <p className={`text-xs mt-1.5 line-clamp-2 font-medium ${
              darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
            }`}>
              {item.description}
            </p>
          )}
        </div>
        
        {/* Meta Row */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-3 text-xs flex-wrap">
            {isCurrentUserBorrowing && timeLeft !== null ? (
              <span className={`flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg ${
                timeLeft <= 0 
                  ? darkMode ? 'bg-[var(--brand-red)]/20 text-[var(--brand-red)]' : 'bg-red-100 text-red-600'
                  : timeLeft < 15 
                  ? darkMode ? 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)]' : 'bg-[#FF8C42]/20 text-[#FF8C42]'
                  : darkMode ? 'bg-[var(--brand-third)]/20 text-[var(--brand-third)]' : 'bg-[#10B981]/20 text-[#10B981]'
              }`}>
                <Clock size={14} /> 
                {timeLeft <= 0 ? (
                  <span className="flex items-center gap-1">
                    <AlertCircle size={14} /> Overdue
                  </span>
                ) : (
                  `${formatTimeLeft(timeLeft)} left`
                )}
              </span>
            ) : (
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold ${
                darkMode ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/60' : 'bg-gray-100 text-gray-700'
              }`}>
                <Clock size={14} /> {item.max_borrow_duration}m max
              </span>
            )}
            {item.queue_count > 0 && (
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold ${
                darkMode ? 'bg-[var(--brand-purple)]/20 text-[var(--brand-purple)]' : 'bg-[#4D4DA4]/10 text-[#4D4DA4]'
              }`}>
                <Users size={14} /> {item.queue_count} waiting
              </span>
            )}
          </div>
          
          {/* Return Now Label */}
          {isCurrentUserBorrowing && timeLeft !== null && timeLeft <= 0 && (
            <div className={`flex items-center gap-2 px-3 py-2 border rounded-xl ${
              darkMode 
                ? 'bg-[var(--brand-red)]/10 border-[var(--brand-red)]/30' 
                : 'bg-gradient-to-r from-red-100 to-red-50 border-2 border-red-300 shadow-sm'
            }`}>
              <AlertCircle size={16} className={darkMode ? 'text-[var(--brand-red)]' : 'text-red-600'} />
              <span className={`font-bold text-xs uppercase tracking-wide ${
                darkMode ? 'text-[var(--brand-red)]' : 'text-red-600'
              }`}>
                Return Now!
              </span>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className={`mt-auto pt-4 border-t ${darkMode ? 'border-[var(--dark-600)]' : 'border-gray-100 border-t-2'}`}>
          {isAvailable ? (
            <>
              {checkingStatus ? (
                <button 
                  disabled
                  className={`w-full py-3 rounded-xl text-sm font-bold cursor-not-allowed ${
                    darkMode 
                      ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/40 border border-[var(--dark-600)]' 
                      : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                  }`}
                >
                  Checking status...
                </button>
              ) : isCheckedIn === false ? (
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 px-3 py-2 border rounded-xl ${
                    darkMode 
                      ? 'bg-[var(--brand-peach)]/10 border-[var(--brand-peach)]/30' 
                      : 'bg-[#FF8C42]/10 border-2 border-[#FF8C42]/30'
                  }`}>
                    <LogIn size={16} className={darkMode ? 'text-[var(--brand-peach)]' : 'text-[#FF8C42]'} />
                    <span className={`text-xs font-bold ${darkMode ? 'text-[var(--brand-peach)]' : 'text-[#FF8C42]'}`}>
                      Check in required to borrow
                    </span>
                  </div>
                  <button 
                    onClick={handleBorrowClick}
                    disabled={true}
                    className={`w-full py-3 rounded-xl text-sm font-bold cursor-not-allowed ${
                      darkMode 
                        ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/40 border border-[var(--dark-600)]' 
                        : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                    }`}
                  >
                    Borrow Item
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleBorrowClick}
                  disabled={loading}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                    loading
                      ? darkMode 
                        ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/40 cursor-not-allowed border border-[var(--dark-600)]' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                      : darkMode 
                        ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90' 
                        : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white hover:from-[#3D3D94] hover:to-[#5D5DC4] hover:shadow-lg shadow-md'
                  }`}
                >
                  {loading ? 'Processing...' : 'Borrow Item'}
                </button>
              )}
            </>
          ) : isCurrentUserBorrowing ? (
            <button 
              onClick={handleReturnClick}
              disabled={loading}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                loading
                  ? darkMode 
                    ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/40 cursor-not-allowed border border-[var(--dark-600)]' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                  : darkMode 
                    ? 'bg-[var(--brand-third)] text-[var(--dark-900)] hover:bg-[var(--brand-third)]/90' 
                    : 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white hover:from-[#0EA572] hover:to-[#047857] hover:shadow-lg shadow-md'
              }`}
            >
              {loading ? 'Processing...' : 'Return Item'}
            </button>
          ) : (
            <>
              {item.user_in_queue ? (
                <button 
                  onClick={handleLeaveQueueClick}
                  disabled={loading}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                    loading
                      ? darkMode 
                        ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/40 cursor-not-allowed border border-[var(--dark-600)]' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                      : darkMode 
                        ? 'bg-[var(--dark-700)] text-[var(--brand-purple)] hover:bg-[var(--dark-600)] border border-[var(--brand-purple)]/30' 
                        : 'bg-[#4D4DA4]/10 text-[#4D4DA4] hover:bg-[#4D4DA4]/20 border-2 border-[#4D4DA4]/30 shadow-md'
                  }`}
                >
                  {loading ? 'Processing...' : 'Leave Queue'}
                </button>
              ) : checkingStatus ? (
                <button 
                  disabled
                  className={`w-full py-3 rounded-xl text-sm font-bold cursor-not-allowed ${
                    darkMode 
                      ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/40 border border-[var(--dark-600)]' 
                      : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                  }`}
                >
                  Checking status...
                </button>
              ) : isCheckedIn === false ? (
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 px-3 py-2 border rounded-xl ${
                    darkMode 
                      ? 'bg-[var(--brand-peach)]/10 border-[var(--brand-peach)]/30' 
                      : 'bg-[#FF8C42]/10 border-2 border-[#FF8C42]/30'
                  }`}>
                    <LogIn size={16} className={darkMode ? 'text-[var(--brand-peach)]' : 'text-[#FF8C42]'} />
                    <span className={`text-xs font-bold ${darkMode ? 'text-[var(--brand-peach)]' : 'text-[#FF8C42]'}`}>
                      Check in required to join queue
                    </span>
                  </div>
                  <button 
                    onClick={handleJoinQueueClick}
                    disabled={true}
                    className={`w-full py-3 rounded-xl text-sm font-bold cursor-not-allowed ${
                      darkMode 
                        ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/40 border border-[var(--dark-600)]' 
                        : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                    }`}
                  >
                    Join Queue
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleJoinQueueClick}
                  disabled={loading}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                    loading
                      ? darkMode 
                        ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/40 cursor-not-allowed border border-[var(--dark-600)]' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                      : darkMode 
                        ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90' 
                        : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white hover:from-[#3D3D94] hover:to-[#5D5DC4] hover:shadow-lg shadow-md'
                  }`}
                >
                  {loading ? 'Processing...' : 'Join Queue'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Borrow Confirmation Modal */}
      <ConfirmationModal
        isVisible={showBorrowModal}
        onClose={() => setShowBorrowModal(false)}
        onConfirm={handleBorrowConfirm}
        title="Borrow Item"
        message={`Do you want to borrow "${item.title}"?`}
        confirmButtonText="Yes, Borrow"
        cancelButtonText="Cancel"
        isLoading={loading}
        variant="info"
        darkMode={darkMode}
      />

      {/* Return Confirmation Modal */}
      <ConfirmationModal
        isVisible={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        onConfirm={handleReturnConfirm}
        title="Return Item"
        message={`⚠️ Confirm Return:\n\nHave you handed "${item.title}" back to the staff?`}
        confirmButtonText="Yes, Return"
        cancelButtonText="Cancel"
        isLoading={loading}
        variant="warning"
        darkMode={darkMode}
      />

      {/* Join Queue Confirmation Modal */}
      <ConfirmationModal
        isVisible={showJoinQueueModal}
        onClose={() => setShowJoinQueueModal(false)}
        onConfirm={handleJoinQueueConfirm}
        title="Join Queue"
        message={`You are waiting in queue for "${item.title}". You will receive a notification when the item is free to use.`}
        confirmButtonText="Got it!"
        cancelButtonText=""
        isLoading={loading}
        variant="success"
        darkMode={darkMode}
      />

      {/* Leave Queue Confirmation Modal */}
      <ConfirmationModal
        isVisible={showLeaveQueueModal}
        onClose={() => setShowLeaveQueueModal(false)}
        onConfirm={handleLeaveQueueConfirm}
        title="Leave Queue"
        message={`Are you sure you want to leave the queue for "${item.title}"?`}
        confirmButtonText="Yes, Leave Queue"
        cancelButtonText="Cancel"
        isLoading={loading}
        variant="warning"
        darkMode={darkMode}
      />

      {/* Max Loans Error Modal */}
      <ConfirmationModal
        isVisible={showMaxLoansModal}
        onClose={() => setShowMaxLoansModal(false)}
        onConfirm={() => {
          setShowMaxLoansModal(false);
          // Navigate to my items page
          router.push('/dashboard/youth/inventory/my-items');
        }}
        title="Maximum Items Reached"
        message={`You have reached the maximum borrowing limit.\n\nPlease return an item before borrowing another one.`}
        confirmButtonText="View My Items"
        cancelButtonText="Close"
        isLoading={false}
        variant="warning"
        darkMode={darkMode}
      />
    </div>
  );
}
