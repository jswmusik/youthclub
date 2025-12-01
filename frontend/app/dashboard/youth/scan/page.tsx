'use client';

import { useRouter } from 'next/navigation';
import CheckInScanner from '@/app/components/visits/CheckInScanner';

export default function ScanPage() {
  const router = useRouter();

  const handleSuccess = () => {
    // Redirect back to dashboard after successful check-in
    setTimeout(() => {
      router.push('/dashboard/youth');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center pt-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Check In</h1>
        <p className="text-slate-500">Point your camera at the screen at the entrance.</p>
      </div>

      <CheckInScanner onSuccess={handleSuccess} />

      <button 
        onClick={() => router.back()}
        className="mt-8 text-slate-500 underline"
      >
        Cancel and go back
      </button>
    </div>
  );
}