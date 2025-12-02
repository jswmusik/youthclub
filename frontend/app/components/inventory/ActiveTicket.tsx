'use client';

import { useState, useEffect } from 'react';
import { differenceInMinutes, parseISO } from 'date-fns';
import { inventoryApi } from '@/lib/inventory-api';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ActiveTicketProps {
  session: any; // The LendingSession object
  onReturnSuccess: () => void;
}

export default function ActiveTicket({ session, onReturnSuccess }: ActiveTicketProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 1. Calculate initial time
    const calculateTime = () => {
      const now = new Date();
      const due = parseISO(session.due_at);
      return differenceInMinutes(due, now);
    };
    
    setTimeLeft(calculateTime());

    // 2. Update timer every minute
    const interval = setInterval(() => {
        setTimeLeft(calculateTime());
    }, 60000);

    return () => clearInterval(interval);
  }, [session]);

  const handleReturn = async () => {
    // 3. The "Digital Handshake" confirmation
    if (!confirm("⚠️ Confirm Return:\n\nHave you handed the item back to the staff?")) return;
    
    setLoading(true);
    try {
      // We pass the ITEM ID to the return endpoint
      await inventoryApi.returnItem(session.item); 
      toast.success("Item returned successfully!");
      onReturnSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Failed to return item.");
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = timeLeft < 0;

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 shadow-lg bg-white mb-6 ${isOverdue ? 'border-red-500' : 'border-green-500'}`}>
      
      {/* Header Banner */}
      <div className={`p-4 text-center text-white flex flex-col items-center justify-center ${isOverdue ? 'bg-red-500' : 'bg-green-500'}`}>
        <h3 className="font-bold text-lg uppercase tracking-widest flex items-center gap-2">
          {isOverdue ? <><AlertTriangle size={20}/> OVERDUE</> : <><CheckCircle size={20}/> ACTIVE TICKET</>}
        </h3>
        <p className="text-white/90 text-xs mt-1">Show this screen to staff</p>
      </div>

      {/* Ticket Body */}
      <div className="p-6 text-center space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 leading-tight">{session.item_title}</h2>
          <p className="text-slate-500 text-sm mt-1">
            Borrowed at {new Date(session.borrowed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>
        </div>

        {/* The Big Timer */}
        <div className="py-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className={`text-4xl font-mono font-bold flex items-center justify-center gap-2 ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
            <Clock size={32} className={isOverdue ? 'text-red-400' : 'text-slate-400'} />
            {timeLeft > 60 ? '> 1 hr' : `${timeLeft} min`}
          </div>
          <p className="text-xs text-slate-400 uppercase mt-2 font-semibold tracking-wide">Time Remaining</p>
        </div>

        {/* Self-Return Action */}
        <button
          onClick={handleReturn}
          disabled={loading}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
        >
          {loading ? 'Processing...' : 'Return Item'}
        </button>
        
        <p className="text-[10px] text-slate-400 px-4">
          Only click "Return Item" after you have physically handed the item to a staff member.
        </p>
      </div>
      
      {/* Pulsing "Live" Indicator */}
      {!isOverdue && (
        <span className="absolute top-4 right-4 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
      )}
    </div>
  );
}

