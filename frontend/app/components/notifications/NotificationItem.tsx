// frontend/app/components/notifications/NotificationItem.tsx
import { Notification } from '../../../types/notification';

interface NotificationItemProps {
    notification: Notification;
    onClick: (notif: Notification) => void;
    onDelete: (id: number) => void;
}

export default function NotificationItem({ notification, onClick, onDelete }: NotificationItemProps) {
    
    // Helper for Icons (Local to display logic)
    const getIcon = (category: string) => {
        switch(category) {
            case 'REWARD': return '🎁';
            case 'SYSTEM': return '📢';
            case 'EVENT': return '📅';
            case 'NEWS': return '📰';
            default: return '🔔';
        }
    };

    return (
        <div 
            onClick={() => onClick(notification)}
            className={`relative group flex gap-4 p-5 rounded-xl border transition-all cursor-pointer ${
                notification.is_read 
                ? 'bg-white border-gray-100 opacity-70 hover:opacity-100' // Read style
                : 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-50' // Unread style
            }`}
        >
            {/* Icon Box */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${
                notification.is_read ? 'bg-gray-100' : 'bg-blue-50'
            }`}>
                {getIcon(notification.category)}
            </div>

            {/* Text Content */}
            <div className="flex-1 pr-8">
                <div className="flex justify-between items-start">
                    <h4 className={`text-base ${notification.is_read ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>
                        {notification.title}
                    </h4>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                        {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {notification.body}
                </p>
            </div>

            {/* Delete Button (Visible on Hover) */}
            <button 
                onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the row click
                    onDelete(notification.id);
                }}
                className="absolute top-4 right-4 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                title="Delete notification"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
            
            {/* Unread Indicator Dot */}
            {!notification.is_read && (
                <span className="absolute top-5 left-5 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white"></span>
            )}
        </div>
    );
}

