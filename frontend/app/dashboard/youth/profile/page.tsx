'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import NavBar from '@/app/components/NavBar';
import ProfileHeader from '@/app/components/profile/ProfileHeader';
import ProfileContent from '@/app/components/profile/ProfileContent';

export default function YouthProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // We might want to fetch "fresher" data than what's in context, 
  // specifically if we need relations like full Club objects.
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect if not logged in
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchProfileDetails = async () => {
      try {
        // Fetch fresh user data + relations (if your serializer supports depth)
        const res = await api.get('/auth/users/me/');
        setProfileData(res.data);
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfileDetails();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profileData) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="pb-20">
        
        {/* 1. Profile Header Container */}
        <div className="max-w-6xl mx-auto md:pt-6 md:px-6">
          <ProfileHeader 
            user={profileData} 
            primaryClub={profileData.preferred_club} 
          />
        </div>

        {/* 2. Tabs & Content */}
        <div className="mt-4">
          <ProfileContent user={profileData} />
        </div>

      </main>
    </div>
  );
}

