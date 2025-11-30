'use client';

import { useState, useRef, useEffect } from 'react';

interface SwipeButtonProps {
  onSuccess: () => void;
  text?: string;
  successText?: string;
  color?: string; // Tailwind color class prefix (e.g. 'blue', 'green')
  disabled?: boolean;
}

export default function SwipeButton({ 
  onSuccess, 
  text = "Swipe to Redeem", 
  successText = "Redeemed!", 
  color = "blue",
  disabled = false
}: SwipeButtonProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragWidth, setDragWidth] = useState(0);
  const [completed, setCompleted] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  // Constants
  const THUMB_WIDTH = 48; // px (w-12)
  const UPDATE_INTERVAL = 1000 / 60; // 60fps

  useEffect(() => {
    if (completed) {
      setDragWidth(100); // 100% width on completion
      return;
    }

    const handleMove = (clientX: number) => {
      if (!isDragging || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const maxDrag = containerRect.width - THUMB_WIDTH;
      
      // Calculate position relative to container
      let offsetX = clientX - containerRect.left - (THUMB_WIDTH / 2);
      
      // Constraints
      offsetX = Math.max(0, offsetX);
      offsetX = Math.min(maxDrag, offsetX);
      
      setDragWidth(offsetX);
      
      // Check threshold (90%)
      if (offsetX >= maxDrag * 0.9) {
        setCompleted(true);
        setIsDragging(false);
        onSuccess();
      }
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      if (!completed) {
        setIsDragging(false);
        setDragWidth(0); // Snap back
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, completed, onSuccess]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!completed && !disabled) {
      e.preventDefault();
      setIsDragging(true);
    }
  };

  // Dynamic Styles - Using explicit color classes since Tailwind needs them at build time
  const bgColorClass = completed ? 'bg-green-500' : 'bg-gray-200';
  const thumbColorClass = completed ? 'bg-green-600' : color === 'green' ? 'bg-green-600' : 'bg-blue-600';
  const textColorClass = completed ? 'text-white' : 'text-gray-500';
  const progressColorClass = color === 'green' ? 'bg-green-100' : 'bg-blue-100';

  return (
    <div 
      className={`relative h-14 rounded-full overflow-hidden select-none transition-colors duration-300 ${bgColorClass} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      ref={containerRef}
    >
      {/* Background Text */}
      <div className={`absolute inset-0 flex items-center justify-center font-bold text-sm uppercase tracking-wider z-0 ${textColorClass}`}>
        {completed ? successText : text}
      </div>

      {/* Progress Track (Fills behind the thumb) */}
      <div 
        className={`absolute top-0 left-0 h-full ${progressColorClass} z-0 opacity-50 transition-all duration-75`}
        style={{ width: completed ? '100%' : `${dragWidth + THUMB_WIDTH}px` }}
      />

      {/* Draggable Thumb */}
      <div
        ref={thumbRef}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        className={`absolute top-1 bottom-1 w-12 rounded-full shadow-md z-10 flex items-center justify-center text-white transition-transform duration-75 ease-out ${thumbColorClass}`}
        style={{ 
          ...(completed ? { right: '4px' } : { left: 0, transform: `translateX(${dragWidth}px)` })
        }}
      >
        {completed ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
        )}
      </div>
    </div>
  );
}

