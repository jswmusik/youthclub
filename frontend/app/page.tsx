'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link'; // We need this for navigation
import { Club } from './types';
import { getMediaUrl } from './utils';
import { useAuth } from '../context/AuthContext'; // Import Auth

export default function Home() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  
  // Get user info from our Auth Context
  const { user, logout, loading: authLoading } = useAuth();

  useEffect(() => {
    fetch('http://localhost:8000/api/clubs/')
      .then((res) => res.json())
      .then((data) => {
        setClubs(data);
        setLoadingClubs(false);
      })
      .catch((err) => {
        console.error('Error fetching clubs:', err);
        setLoadingClubs(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* HEADER */}
      <header className="bg-blue-600 text-white p-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Ungdomsappen</h1>
          
          <div className="flex items-center gap-4">
            {!authLoading && (
              <>
                {user ? (
                  // LOGGED IN STATE
                  <div className="flex items-center gap-4">
                    <span className="hidden md:block font-medium">Hi, {user.first_name}</span>
                    
                    {/* Link back to their specific dashboard based on role */}
                    <Link 
                      href={
                        user.role === 'SUPER_ADMIN' ? '/admin/super' :
                        user.role === 'MUNICIPALITY_ADMIN' ? '/admin/municipality' :
                        user.role === 'CLUB_ADMIN' ? '/admin/club' :
                        user.role === 'GUARDIAN' ? '/dashboard/guardian' :
                        '/dashboard/youth'
                      }
                      className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition"
                    >
                      My Dashboard
                    </Link>

                    <button 
                      onClick={logout}
                      className="bg-blue-800 px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  // LOGGED OUT STATE
                  <Link 
                    href="/login"
                    className="bg-blue-800 px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Login
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto p-6 mt-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Explore Clubs</h2>
        
        {loadingClubs ? (
          <p>Loading clubs...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {clubs.map((club) => {
              const heroUrl = getMediaUrl(club.hero_image);
              const avatarUrl = getMediaUrl(club.avatar);

              return (
                <div key={club.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 flex flex-col h-full hover:shadow-xl transition">
                  {/* HERO IMAGE */}
                  <div className="h-48 bg-gray-200 w-full relative">
                    {heroUrl ? (
                      <img 
                        src={heroUrl} 
                        alt={club.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        No Image
                      </div>
                    )}
                    
                    <div className="absolute -bottom-6 left-6">
                      {avatarUrl && (
                        <img 
                          src={avatarUrl} 
                          alt="Avatar" 
                          className="w-16 h-16 rounded-full border-4 border-white shadow-md bg-white object-cover" 
                        />
                      )}
                    </div>
                  </div>

                  <div className="p-6 pt-8 flex-grow">
                    <h3 className="text-xl font-bold text-gray-900">{club.name}</h3>
                    <p className="text-sm text-blue-600 font-medium mb-2">{club.municipality_name}</p>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {club.description}
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>📍 {club.address || 'No address set'}</p>
                      <p>📧 {club.email}</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 border-t border-gray-100">
                    <button className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
                      Visit Club
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}