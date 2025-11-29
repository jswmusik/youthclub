'use client';

import Link from 'next/link';
import YouthRegistrationWizard from '@/app/components/YouthRegistrationWizard';

export default function YouthRegisterPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Join the Club! 🚀</h1>
        <p className="text-gray-600 mt-2">Create your account to sign up for events and earn rewards.</p>
      </div>
      
      <YouthRegistrationWizard />
      
      <div className="text-center mt-8">
        <Link href="/login" className="text-blue-600 hover:underline text-sm font-medium">
          Already have an account? Log in here.
        </Link>
      </div>
    </main>
  );
}