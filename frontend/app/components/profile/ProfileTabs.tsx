'use client';

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isSticky?: boolean;
}

export default function ProfileTabs({ activeTab, onTabChange, isSticky = false }: ProfileTabsProps) {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'clubs', label: 'Clubs & Groups' },
    { id: 'inventory', label: 'Inventory History' },
    { id: 'guardians', label: 'Guardians' },
    { id: 'wallet', label: 'My Wallet' },
    { id: 'timeline', label: 'Activity' },
  ];

  return (
    <div className={`bg-[#050505] border-t border-[#262626] shadow-sm z-40 ${
      isSticky ? 'fixed top-14 left-0 right-0' : 'relative'
    }`}>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <nav className="flex space-x-8 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id 
                  ? 'border-[#4D4DA4] text-[#6D6DD4]' 
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-[#262626]'}
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

