import React from 'react';
import { Club } from '@/types/organization';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

interface ClubContactProps {
  club: Club;
  darkMode?: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.75rem'
};

export default function ClubContact({ club, darkMode = false }: ClubContactProps) {
  // Default to a central location if coords are missing (e.g., Stockholm)
  const center = {
    lat: club.latitude || 59.3293,
    lng: club.longitude || 18.0686
  };
  
  const hasCoords = club.latitude && club.longitude;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 px-4 sm:px-0">
      {/* Contact Info Card */}
      <div className="lg:col-span-1 space-y-6">
        <div className={`rounded-xl p-6 border ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
            : 'bg-white shadow-sm border-gray-100'
        }`}>
          <h3 className={`text-lg font-bold mb-6 font-heading ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
          }`}>Contact Details</h3>
          
          <div className="space-y-4">
            {club.address && (
              <div className="flex items-start">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                  darkMode 
                    ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]' 
                    : 'bg-blue-50 text-blue-500'
                }`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className={`text-xs uppercase font-semibold ${
                    darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                  }`}>Address</p>
                  <p className={darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}>{club.address}</p>
                </div>
              </div>
            )}

            {club.email && (
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                  darkMode 
                    ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]' 
                    : 'bg-blue-50 text-blue-500'
                }`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className={`text-xs uppercase font-semibold ${
                    darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                  }`}>Email</p>
                  <a href={`mailto:${club.email}`} className={`hover:underline break-all ${
                    darkMode ? 'text-[var(--brand-primary)]' : 'text-blue-600'
                  }`}>{club.email}</a>
                </div>
              </div>
            )}

            {club.phone && (
              <div className="flex items-center">
                 <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                   darkMode 
                     ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]' 
                     : 'bg-blue-50 text-blue-500'
                 }`}>
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                   </svg>
                 </div>
                <div>
                  <p className={`text-xs uppercase font-semibold ${
                    darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                  }`}>Phone</p>
                  <a href={`tel:${club.phone}`} className={`hover:underline ${
                    darkMode ? 'text-[var(--brand-primary)]' : 'text-blue-600'
                  }`}>{club.phone}</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Column */}
      <div className="lg:col-span-2">
        <div className={`rounded-xl p-2 h-full min-h-[400px] border ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
            : 'bg-white shadow-sm border-gray-100'
        }`}>
           {hasCoords ? (
             <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""}>
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={center}
                  zoom={15}
                >
                  <Marker position={center} />
                </GoogleMap>
             </LoadScript>
           ) : (
             <div className={`h-full w-full flex flex-col items-center justify-center rounded-lg ${
               darkMode 
                 ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/40' 
                 : 'bg-gray-50 text-gray-400'
             }`}>
                <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 01-.806-.984A1 1 0 0021 6.618l-5.447 2.724A1 1 0 0015 16.382V5.618a1 1 0 011.447-.894L9 7m0 13V7" />
                </svg>
                <p>No coordinates available for map view.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
