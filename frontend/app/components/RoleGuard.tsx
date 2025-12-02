'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 1. Wait until authentication check is complete
    if (!loading) {
      // 2. If no user is logged in, send to login
      if (!user) {
        router.push('/login');
        return;
      }

      // 3. If user exists but role is not allowed, send to Access Denied
      if (!allowedRoles.includes(user.role)) {
        router.push('/access-denied');
      }
    }
  }, [user, loading, allowedRoles, router]);

  // Show a simple loading state while checking permissions
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  // If checks fail, render nothing (to prevent flash of content) while redirect happens
  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  // If all clear, render the protected page!
  return <>{children}</>;
}

