// frontend/app/components/notifications/NotificationSidebar.tsx

interface NotificationSidebarProps {
    currentFilter: string;
    onFilterChange: (filter: string) => void;
}

export default function NotificationSidebar({ currentFilter, onFilterChange }: NotificationSidebarProps) {
    const filters = ['ALL', 'SYSTEM', 'REWARD', 'EVENT', 'NEWS', 'POST'];

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
            <h3 className="font-bold text-gray-800 mb-4">Inbox Filters</h3>
            <ul className="space-y-2">
                {filters.map((type) => (
                    <li 
                        key={type}
                        onClick={() => onFilterChange(type)}
                        className={`cursor-pointer px-4 py-2 rounded-lg transition-colors font-medium ${
                            currentFilter === type 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {type === 'ALL' ? 'All Notifications' : type.charAt(0) + type.slice(1).toLowerCase() + 's'}
                    </li>
                ))}
            </ul>
        </div>
    );
}

