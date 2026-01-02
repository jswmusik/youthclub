"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className={`p-2 rounded-lg bg-gray-100 dark:bg-[var(--dark-700)] border border-gray-200 dark:border-[var(--dark-500)] ${className}`}
        disabled
      >
        <div className="w-5 h-5" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`
        flex items-center gap-2 p-2 rounded-lg 
        ${isDark 
          ? 'bg-[var(--dark-700)] hover:bg-[var(--dark-600)] border border-[var(--dark-500)] hover:border-[var(--dark-400)] text-[var(--brand-light)]'
          : 'bg-gray-100 hover:bg-gray-200 border border-gray-200 hover:border-gray-300 text-gray-700'
        }
        transition-all duration-200
        ${className}
      `}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-[var(--brand-peach)]" />
      ) : (
        <Moon className="w-5 h-5 text-[#4D4DA4]" />
      )}
      {showLabel && (
        <span className="text-sm font-medium">
          {isDark ? "Light mode" : "Dark mode"}
        </span>
      )}
    </button>
  );
}

