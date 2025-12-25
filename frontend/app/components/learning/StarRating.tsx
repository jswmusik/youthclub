'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
    value: number; // 0-5
    onChange?: (value: number) => void;
    readOnly?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export default function StarRating({ 
    value, 
    onChange, 
    readOnly = false,
    size = 'md',
    showLabel = false 
}: StarRatingProps) {
    const [hoverValue, setHoverValue] = useState<number | null>(null);

    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    };

    const displayValue = hoverValue !== null ? hoverValue : value;

    const handleClick = (rating: number) => {
        if (!readOnly && onChange) {
            onChange(rating);
        }
    };

    const handleMouseEnter = (rating: number) => {
        if (!readOnly) {
            setHoverValue(rating);
        }
    };

    const handleMouseLeave = () => {
        if (!readOnly) {
            setHoverValue(null);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <div 
                className="flex items-center gap-1"
                onMouseLeave={handleMouseLeave}
            >
                {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= displayValue;
                    return (
                        <button
                            key={star}
                            type="button"
                            onClick={() => handleClick(star)}
                            onMouseEnter={() => handleMouseEnter(star)}
                            disabled={readOnly}
                            className={`transition-all duration-150 ${!readOnly ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                        >
                            <Star
                                className={`
                                    ${sizeClasses[size]}
                                    ${isFilled
                                        ? 'text-[var(--brand-peach)] fill-[var(--brand-peach)]'
                                        : 'text-[var(--dark-500)]'
                                    }
                                    ${!readOnly && isFilled ? 'hover:text-[var(--brand-peach)] hover:fill-[var(--brand-peach)]' : ''}
                                `}
                            />
                        </button>
                    );
                })}
            </div>
            {showLabel && value > 0 && (
                <span className="text-sm text-[var(--brand-light)]/60 font-medium">
                    {value.toFixed(1)}
                </span>
            )}
        </div>
    );
}
