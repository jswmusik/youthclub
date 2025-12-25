'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import PostForm from '../../../../components/posts/PostForm';
import { Sparkles } from 'lucide-react';

function CreatePostPageContent() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6 md:py-8 px-0">
            <PostForm 
                role="municipality"
                onSuccess={() => router.push('/admin/municipality/posts')} 
            />
        </div>
    );
}

export default function CreatePostPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] animate-pulse">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-[var(--brand-light)]/60">Loading post form...</p>
                </div>
            </div>
        }>
            <CreatePostPageContent />
        </Suspense>
    );
}
