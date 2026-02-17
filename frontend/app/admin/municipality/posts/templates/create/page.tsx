'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import PostTemplateForm from '../../../../../components/posts/PostTemplateForm';
import { Sparkles } from 'lucide-react';

function TemplateFormContent() {
    const router = useRouter();
    
    return (
        <PostTemplateForm 
            role="municipality" 
            onSuccess={() => router.push('/admin/municipality/posts/templates')} 
        />
    );
}

export default function CreatePostTemplatePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] animate-pulse">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-[var(--brand-light)]/60">Loading form...</p>
                </div>
            </div>
        }>
            <TemplateFormContent />
        </Suspense>
    );
}

















