'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import QuickPostForm from '../../../../components/posts/QuickPostForm';
import { Zap } from 'lucide-react';

function QuickPostContent() {
    const router = useRouter();
    
    return (
        <QuickPostForm 
            role="municipality" 
            onSuccess={() => router.push('/admin/municipality/posts')} 
        />
    );
}

export default function QuickPostPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] animate-pulse">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-[var(--brand-light)]/60">Loading quick post...</p>
                </div>
            </div>
        }>
            <QuickPostContent />
        </Suspense>
    );
}






