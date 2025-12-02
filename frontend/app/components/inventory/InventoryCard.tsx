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
}

export default function InventoryCard({ item, onRefresh }: InventoryCardProps) {
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
      const response = await api.visits.getMyActiveVisit();
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Header Image */}
      <div className="h-32 bg-gray-200 relative">
        {item.image ? (
          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
            <Package className="text-white w-12 h-12" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 left-2 flex gap-1">
          {isAvailable ? (
            <span className="bg-green-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-medium">
              Available
            </span>
          ) : (
            <span className="bg-orange-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-medium">
              Borrowed
            </span>
          )}
        </div>

        {/* Category Badge */}
        {item.category_details && (
          <span className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-medium">
            {item.category_details.icon} {item.category_details.name}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-3">
          <h3 className="font-bold text-gray-900 text-lg leading-tight">{item.title}</h3>
          {item.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
        
        {/* Meta Row */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            {isCurrentUserBorrowing && timeLeft !== null ? (
              <span className={`flex items-center gap-1 font-semibold ${
                timeLeft <= 0 
                  ? 'text-red-600' 
                  : timeLeft < 15 
                  ? 'text-orange-600' 
                  : 'text-green-600'
              }`}>
                <Clock size={12} /> 
                {timeLeft <= 0 ? (
                  <span className="flex items-center gap-1">
                    <AlertCircle size={12} /> Overdue
                  </span>
                ) : (
                  `${formatTimeLeft(timeLeft)} left`
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Clock size={12} /> {item.max_borrow_duration}m
              </span>
            )}
            {item.queue_count > 0 && (
              <span className="flex items-center gap-1 text-purple-600 font-medium">
                <Users size={12} /> {item.queue_count} waiting
              </span>
            )}
          </div>
          
          {/* Return Now Label */}
          {isCurrentUserBorrowing && timeLeft !== null && timeLeft <= 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={14} className="text-red-600" />
              <span className="text-red-600 font-bold text-xs uppercase tracking-wide">
                Return Now!
              </span>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          {isAvailable ? (
            <>
              {checkingStatus ? (
                <button 
                  disabled
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                >
                  Checking status...
                </button>
              ) : isCheckedIn === false ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                    <LogIn size={16} className="text-orange-600" />
                    <span className="text-xs text-orange-700 font-medium">
                      Check in required to borrow
                    </span>
                  </div>
                  <button 
                    onClick={handleBorrowClick}
                    disabled={true}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                  >
                    Borrow Item
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleBorrowClick}
                  disabled={loading}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 ${
                    loading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow'
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
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 ${
                loading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-green-600 text-white hover:bg-green-700 hover:shadow'
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
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 ${
                    loading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200'
                  }`}
                >
                  {loading ? 'Processing...' : 'Leave Queue'}
                </button>
              ) : checkingStatus ? (
                <button 
                  disabled
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                >
                  Checking status...
                </button>
              ) : isCheckedIn === false ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                    <LogIn size={16} className="text-orange-600" />
                    <span className="text-xs text-orange-700 font-medium">
                      Check in required to join queue
                    </span>
                  </div>
                  <button 
                    onClick={handleJoinQueueClick}
                    disabled={true}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                  >
                    Join Queue
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleJoinQueueClick}
                  disabled={loading}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 ${
                    loading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                      : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow'
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
      />
    </div>
  );
}

