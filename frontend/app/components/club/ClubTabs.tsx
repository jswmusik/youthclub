import React from 'react';

type TabType = 'overview' | 'groups' | 'visits' | 'hours' | 'events' | 'policies' | 'contact';

interface ClubTabsProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
  excludeTabs?: TabType[]; // Optional prop to exclude certain tabs
}

export default function ClubTabs({ activeTab, onChange, excludeTabs = [] }: ClubTabsProps) {
  const allTabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'groups', label: 'Groups' },
    { id: 'visits', label: 'Visits & Attendance' },
    { id: 'hours', label: 'Opening Hours' },
    { id: 'events', label: 'Events' },
    { id: 'policies', label: 'Info & Policies' },
    { id: 'contact', label: 'Contact' },
  ];
  
  // Filter out excluded tabs
  const tabs = allTabs.filter(tab => !excludeTabs.includes(tab.id));

  return (
    <div className="bg-white border-t border-gray-200 shadow-sm sticky top-14 z-40">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <nav className="flex space-x-8 overflow-x-auto no-scrollbar" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
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

