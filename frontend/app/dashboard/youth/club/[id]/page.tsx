'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { Club } from '@/types/organization';
import ClubHeader from '@/app/components/club/ClubHeader';
import ClubTabs from '@/app/components/club/ClubTabs';
import ClubOverview from '@/app/components/club/tabs/ClubOverview';
import ClubGroups from '@/app/components/club/tabs/ClubGroups';
import ClubHours from '@/app/components/club/tabs/ClubHours';
import ClubPolicies from '@/app/components/club/tabs/ClubPolicies';
import ClubContact from '@/app/components/club/tabs/ClubContact';
import ClubEvents from '@/app/components/club/tabs/ClubEvents';
import NavBar from '@/app/components/NavBar';

// Placeholder components for the tabs (We will build these next)
const PlaceholderTab = ({ name }: { name: string }) => (
  <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow mt-4">
    <h3 className="text-lg font-medium">{name}</h3>
    <p>This section is under construction.</p>
  </div>
);

export default function ClubDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = params?.id;

  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Get initial tab from URL, default to 'overview'
  const tabFromUrl = searchParams.get('tab');
  const validTabs: Array<'overview' | 'groups' | 'hours' | 'events' | 'policies' | 'contact'> = 
    ['overview', 'groups', 'hours', 'events', 'policies', 'contact'];
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl as any) 
    ? (tabFromUrl as typeof validTabs[number]) 
    : 'overview';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Handle tab change - update both state and URL
  const handleTabChange = (tab: typeof validTabs[number]) => {
    setActiveTab(tab);
    // Update URL without page refresh
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
  
  // Sync with URL when it changes (e.g., browser back/forward or direct navigation)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && validTabs.includes(tabFromUrl as any)) {
      const tab = tabFromUrl as typeof validTabs[number];
      if (tab !== activeTab) {
        setActiveTab(tab);
      }
    } else if (!tabFromUrl && activeTab !== 'overview') {
      // If no tab in URL and we're not on overview, reset to overview
      setActiveTab('overview');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchClub = async () => {
      try {
        setLoading(true);
        // Ensure this endpoint exists and returns full details including regular_hours
        const response = await api.get(`/clubs/${id}/`);
        setClub(response.data);
      } catch (err) {
        console.error("Failed to fetch club", err);
        setError('Could not load club details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchClub();
    }
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="p-8 text-center">Loading club details...</div>
    </div>
  );

  if (error || !club) return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="p-8 text-center text-red-500">{error || 'Club not found'}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <NavBar />
      
      {/* Profile Header Container - same width as youth profile */}
      <div className="max-w-6xl mx-auto md:pt-6 md:px-6">
        <ClubHeader club={club} />
      </div>

      {/* Tabs & Content - same spacing as youth profile */}
      <div className="mt-4">
        <ClubTabs activeTab={activeTab} onChange={handleTabChange} />
        
        {/* Content Area */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {activeTab === 'overview' && club && (
          <ClubOverview club={club} onChangeTab={handleTabChange} />
        )}
        
        {activeTab === 'groups' && club && (
          <ClubGroups clubId={club.id} />
        )}

        {activeTab === 'hours' && club && (
          <ClubHours club={club} />
        )}

        {activeTab === 'events' && (
          <ClubEvents />
        )}
        
        {activeTab === 'policies' && club && (
          <ClubPolicies club={club} />
        )}

        {activeTab === 'contact' && club && (
          <ClubContact club={club} />
        )}
        </div>
      </div>
    </div>
  );
}

