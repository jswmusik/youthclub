'use client';

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'clubs', label: 'Clubs & Groups' },
    { id: 'wallet', label: 'My Wallet' },
    { id: 'timeline', label: 'Activity' },
  ];

  return (
    <div className="bg-white border-t border-gray-200 shadow-sm sticky top-14 z-40">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <nav className="flex space-x-8 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

