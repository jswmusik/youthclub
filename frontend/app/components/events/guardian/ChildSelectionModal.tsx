'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import { User, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Child {
  id: number;
  first_name: string;
  last_name: string;
  avatar?: string;
  is_registered?: boolean;
}

interface EligibilityResult {
  [childId: number]: {
    eligible: boolean;
    reason?: string;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: Child[]; // From user profile
  eligibility: EligibilityResult; // Pre-calculated or passed down
  onSelectChild: (childId: number) => void;
  loading?: boolean;
  eventTitle: string;
}

export default function ChildSelectionModal({ 
  isOpen, 
  onClose, 
  children, 
  eligibility, 
  onSelectChild,
  loading = false,
  eventTitle
}: Props) {
  const t = useTranslations('events');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[var(--dark-800)] border-0">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
            {t('whoIsAttending') || "Who is attending?"}
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Applying for: <span className="font-semibold text-gray-800 dark:text-gray-200">{eventTitle}</span>
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {children.map((child) => {
            const status = eligibility[child.id];
            const isEligible = status?.eligible;
            const isDisabled = !isEligible || child.is_registered || loading;

            return (
              <button
                key={child.id}
                onClick={() => isEligible && !child.is_registered && onSelectChild(child.id)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-4 p-3 rounded-xl border text-left transition-all ${
                  isDisabled
                    ? 'opacity-60 bg-gray-50 dark:bg-[var(--dark-900)] border-gray-100 dark:border-[var(--dark-700)] cursor-not-allowed'
                    : 'bg-white dark:bg-[var(--dark-700)] border-gray-200 dark:border-[var(--dark-600)] hover:border-[#4D4DA4] dark:hover:border-[var(--brand-primary)] shadow-sm hover:shadow-md'
                }`}
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {child.avatar ? (
                      <img src={child.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  {child.is_registered && (
                    <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h4 className={`font-bold ${isDisabled ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                    {child.first_name} {child.last_name}
                  </h4>
                  
                  {/* Status Message */}
                  {!isEligible ? (
                    <div className="flex items-center gap-1.5 text-xs text-red-500 mt-0.5">
                      <AlertCircle className="w-3 h-3" />
                      {status?.reason || "Not eligible"}
                    </div>
                  ) : child.is_registered ? (
                    <div className="text-xs text-green-600 font-medium mt-0.5">
                      {t('alreadyRegistered') || "Already registered"}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t('tapToSelect') || "Tap to register"}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}





