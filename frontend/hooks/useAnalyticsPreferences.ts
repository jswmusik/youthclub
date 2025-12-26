'use client';

import { useState, useEffect, useCallback } from 'react';
import { analyticsApi, AnalyticsPreferences } from '@/lib/analytics-api';

// Default preferences (all visible)
const DEFAULT_PREFERENCES: AnalyticsPreferences = {
  metrics: true,
  heatmap: true,
  inventory: true,
  demographics: true,
  interests: true,
  insights: true,
  questionnaires: true,
  bookings: true,
  groupComparison: true,
  clubComparison: true,
  events: true,
};

// Local storage key for caching
const STORAGE_KEY = 'analytics_preferences_cache';

interface UseAnalyticsPreferencesReturn {
  preferences: AnalyticsPreferences;
  isLoading: boolean;
  error: string | null;
  toggleSection: (section: keyof AnalyticsPreferences) => Promise<void>;
  setPreference: (section: keyof AnalyticsPreferences, visible: boolean) => Promise<void>;
  showAll: () => Promise<void>;
  hideAll: () => Promise<void>;
  isVisible: (section: keyof AnalyticsPreferences) => boolean;
  refetch: () => Promise<void>;
}

export function useAnalyticsPreferences(): UseAnalyticsPreferencesReturn {
  const [preferences, setPreferences] = useState<AnalyticsPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences from cache first, then fetch from API
  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Try to load from localStorage first for instant UI
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch {
      // Ignore localStorage errors
    }

    // Fetch from API
    try {
      const response = await analyticsApi.getPreferences();
      const newPrefs = { ...DEFAULT_PREFERENCES, ...response.preferences };
      setPreferences(newPrefs);
      
      // Cache in localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
      } catch {
        // Ignore localStorage errors
      }
    } catch (err) {
      console.error('Failed to load analytics preferences:', err);
      setError('Failed to load preferences');
      // Keep using cached/default preferences
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Toggle a single section
  const toggleSection = useCallback(async (section: keyof AnalyticsPreferences) => {
    const newValue = !preferences[section];
    
    // Optimistic update
    const newPrefs = { ...preferences, [section]: newValue };
    setPreferences(newPrefs);
    
    // Update cache
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    } catch {
      // Ignore
    }

    // Save to API
    try {
      await analyticsApi.updatePreferences({ [section]: newValue });
    } catch (err) {
      console.error('Failed to save preference:', err);
      // Revert on error
      setPreferences(preferences);
      setError('Failed to save preference');
    }
  }, [preferences]);

  // Set a specific preference
  const setPreference = useCallback(async (section: keyof AnalyticsPreferences, visible: boolean) => {
    if (preferences[section] === visible) return;

    // Optimistic update
    const newPrefs = { ...preferences, [section]: visible };
    setPreferences(newPrefs);
    
    // Update cache
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    } catch {
      // Ignore
    }

    // Save to API
    try {
      await analyticsApi.updatePreferences({ [section]: visible });
    } catch (err) {
      console.error('Failed to save preference:', err);
      // Revert on error
      setPreferences(preferences);
      setError('Failed to save preference');
    }
  }, [preferences]);

  // Show all sections
  const showAll = useCallback(async () => {
    const allVisible: AnalyticsPreferences = {
      metrics: true,
      heatmap: true,
      inventory: true,
      demographics: true,
      interests: true,
      insights: true,
      questionnaires: true,
      bookings: true,
      groupComparison: true,
      clubComparison: true,
      events: true,
    };

    // Optimistic update
    setPreferences(allVisible);
    
    // Update cache
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allVisible));
    } catch {
      // Ignore
    }

    // Save to API
    try {
      await analyticsApi.setAllPreferences(allVisible);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setError('Failed to save preferences');
      // Reload from API
      loadPreferences();
    }
  }, [loadPreferences]);

  // Hide all sections
  const hideAll = useCallback(async () => {
    const allHidden: AnalyticsPreferences = {
      metrics: false,
      heatmap: false,
      inventory: false,
      demographics: false,
      interests: false,
      insights: false,
      questionnaires: false,
      bookings: false,
      groupComparison: false,
      clubComparison: false,
      events: false,
    };

    // Optimistic update
    setPreferences(allHidden);
    
    // Update cache
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allHidden));
    } catch {
      // Ignore
    }

    // Save to API
    try {
      await analyticsApi.setAllPreferences(allHidden);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setError('Failed to save preferences');
      // Reload from API
      loadPreferences();
    }
  }, [loadPreferences]);

  // Check if a section is visible
  const isVisible = useCallback((section: keyof AnalyticsPreferences) => {
    return preferences[section] ?? true;
  }, [preferences]);

  return {
    preferences,
    isLoading,
    error,
    toggleSection,
    setPreference,
    showAll,
    hideAll,
    isVisible,
    refetch: loadPreferences,
  };
}

// Section metadata for the settings panel
export const ANALYTICS_SECTIONS: {
  key: keyof AnalyticsPreferences;
  label: string;
  description: string;
  icon: string;
  municipalityOnly?: boolean;
}[] = [
  {
    key: 'metrics',
    label: 'Key Metrics',
    description: 'Members, visits, avg stay, retention, loans',
    icon: '📊',
  },
  {
    key: 'heatmap',
    label: 'Peak Traffic Hours',
    description: 'Heatmap showing busiest times',
    icon: '🔥',
  },
  {
    key: 'inventory',
    label: 'Top Borrowed Items',
    description: 'Most popular inventory items',
    icon: '📦',
  },
  {
    key: 'demographics',
    label: 'Demographics',
    description: 'Gender balance & grade distribution',
    icon: '👥',
  },
  {
    key: 'interests',
    label: 'Top Interests',
    description: 'Most popular member interests',
    icon: '⭐',
  },
  {
    key: 'insights',
    label: 'Insights',
    description: 'Retention & network insights',
    icon: '💡',
  },
  {
    key: 'questionnaires',
    label: 'Questionnaire Analytics',
    description: 'Survey participation & demographics',
    icon: '📋',
  },
  {
    key: 'bookings',
    label: 'Booking Analytics',
    description: 'Room & equipment reservations',
    icon: '📅',
  },
  {
    key: 'groupComparison',
    label: 'Group Comparison',
    description: 'Compare metrics across groups',
    icon: '👨‍👩‍👧‍👦',
  },
  {
    key: 'clubComparison',
    label: 'Club Comparison',
    description: 'Compare metrics across clubs',
    icon: '🏆',
    municipalityOnly: true,
  },
  {
    key: 'events',
    label: 'Event Analytics',
    description: 'Event registrations & attendance',
    icon: '🎉',
  },
];

