'use client';

import { useTranslations } from 'next-intl';
import { User, FileText, Calendar } from 'lucide-react';
import Link from 'next/link';

interface GuardianOverviewProps {
  user: any;
  childrenData: any[]; // Array of youth objects
  darkMode?: boolean;
}

export default function GuardianOverview({ user, childrenData, darkMode = false }: GuardianOverviewProps) {
  const t = useTranslations('profile');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN (2/3) - Activity Feed & About Me */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* About Me Card */}
        <div className={`p-6 rounded-2xl border ${
          darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' : 'bg-white border-gray-100 shadow-sm'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <h3 className={`font-bold text-lg ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>
              {t('aboutMe') || "About Me"}
            </h3>
            <Link href="/dashboard/guardian/settings" className="text-xs text-[#4D4DA4] hover:underline">
              {t('edit') || "Edit"}
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('email') || "EMAIL"}
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {user.email}
              </p>
            </div>
            <div>
              <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('phone') || "PHONE"}
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {user.phone_number || '-'}
              </p>
            </div>
            <div>
              <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('municipality') || "MUNICIPALITY"}
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {user.assigned_municipality?.name || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Latest Activity Feed (Placeholder for Phase 4 logic) */}
        <div className={`p-6 rounded-2xl border ${
          darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' : 'bg-white border-gray-100 shadow-sm'
        }`}>
          <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>
            {t('latestActivity') || "Latest Activity"}
          </h3>
          
          <div className="space-y-4">
            {/* Example Activity Items */}
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  New Questionnaire Available
                </p>
                <p className="text-xs text-gray-500">Parent Satisfaction Survey 2025 • 2 hours ago</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Event Approval Request
                </p>
                <p className="text-xs text-gray-500">
                  <span className="font-semibold">Lucas</span> applied to "Winter Camp" • 1 day ago
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN (1/3) - Children Card */}
      <div className="space-y-6">
        <div className={`p-6 rounded-2xl border ${
          darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' : 'bg-white border-gray-100 shadow-sm'
        }`}>
          <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>
            {t('myChildren') || "My Children"}
          </h3>
          
          <div className="space-y-3">
            {childrenData && childrenData.length > 0 ? (
              childrenData.map((child) => (
                <div 
                  key={child.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                    darkMode ? 'hover:bg-[var(--dark-700)]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {child.avatar ? (
                      <img src={child.avatar} alt={child.first_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-sm truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {child.first_name} {child.last_name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {child.status === 'PENDING' ? 'Link Pending' : 'Active'}
                    </p>
                  </div>
                  {/* Status Indicator */}
                  <div className={`w-2 h-2 rounded-full ${
                    child.status === 'ACTIVE' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                No children linked yet.
              </div>
            )}
          </div>
          
          {/* Add Child Button (Future Feature) */}
          <button className={`w-full mt-4 py-2.5 rounded-xl border text-sm font-medium transition ${
            darkMode 
              ? 'border-[var(--dark-600)] hover:bg-[var(--dark-700)] text-[var(--brand-light)]' 
              : 'border-gray-200 hover:bg-gray-50 text-gray-600'
          }`}>
            + {t('linkChild') || "Link Child"}
          </button>
        </div>
      </div>

    </div>
  );
}






