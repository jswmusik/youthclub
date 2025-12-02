'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AccessDeniedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 text-center border-t-4 border-red-500">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-8 w-8 text-red-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Access Denied
        </h1>
        
        <p className="text-gray-600 mb-8">
          You do not have permission to view this page. This area is restricted to specific user roles.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Go Back
          </button>
          
          <Link 
            href="/"
            className="px-6 py-2.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

