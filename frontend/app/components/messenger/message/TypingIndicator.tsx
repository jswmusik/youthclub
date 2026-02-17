'use client';

/**
 * TypingIndicator Component
 * 
 * Displays an animated indicator showing which users are currently typing.
 * Uses a smooth pulsing dots animation for a modern chat feel.
 */

interface TypingIndicatorProps {
    users: string[];
    darkMode?: boolean;
}

export default function TypingIndicator({ users, darkMode = false }: TypingIndicatorProps) {
    console.log('TypingIndicator render:', { users, darkMode });
    if (users.length === 0) return null;
    console.log('TypingIndicator: Rendering indicator for:', users);

    // Format the typing message
    const getTypingText = () => {
        if (users.length === 1) {
            return `${users[0]} is typing`;
        } else if (users.length === 2) {
            return `${users[0]} and ${users[1]} are typing`;
        } else {
            return `${users[0]} and ${users.length - 1} others are typing`;
        }
    };

    return (
        <>
            {/* Global keyframes - only rendered once */}
            <style>{`
                @keyframes typingPulse {
                    0%, 60%, 100% {
                        transform: translateY(0);
                        opacity: 0.4;
                    }
                    30% {
                        transform: translateY(-4px);
                        opacity: 1;
                    }
                }
            `}</style>
            
            <div className={`flex items-start gap-2 px-2 py-2 ${
                darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'
            }`}>
                {/* Typing bubble - mimics a message bubble */}
                <div className={`inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-none ${
                    darkMode 
                        ? 'bg-[var(--dark-700)] border border-[var(--dark-500)]' 
                        : 'bg-white border border-[#4D4DA4]/10 shadow-sm'
                }`}>
                    {/* Three animated dots */}
                    <span 
                        className={`w-2 h-2 rounded-full ${
                            darkMode ? 'bg-[var(--brand-primary)]' : 'bg-[#4D4DA4]'
                        }`}
                        style={{ 
                            animation: 'typingPulse 1.4s ease-in-out infinite',
                            animationDelay: '0ms'
                        }}
                    />
                    <span 
                        className={`w-2 h-2 rounded-full ${
                            darkMode ? 'bg-[var(--brand-primary)]' : 'bg-[#4D4DA4]'
                        }`}
                        style={{ 
                            animation: 'typingPulse 1.4s ease-in-out infinite',
                            animationDelay: '200ms'
                        }}
                    />
                    <span 
                        className={`w-2 h-2 rounded-full ${
                            darkMode ? 'bg-[var(--brand-primary)]' : 'bg-[#4D4DA4]'
                        }`}
                        style={{ 
                            animation: 'typingPulse 1.4s ease-in-out infinite',
                            animationDelay: '400ms'
                        }}
                    />
                </div>
                
                {/* Typing text - shown next to the bubble */}
                <span className="text-xs italic self-center ml-1">
                    {getTypingText()}
                </span>
            </div>
        </>
    );
}
