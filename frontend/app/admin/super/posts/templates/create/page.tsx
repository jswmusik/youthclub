'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import PostTemplateForm from '../../../../../components/posts/PostTemplateForm';
import { Sparkles } from 'lucide-react';

function LoadingFallback() {
    const t = useTranslations('postTemplatesManager');
    return (
        <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-[var(--brand-primary)] animate-pulse">
                    <Sparkles className="w-6 h-6 text-[var(--dark-900)]" />
                </div>
                <p className="text-[var(--brand-light)]/60">{t('loading')}</p>
            </div>
        </div>
    );
}

function TemplateFormContent() {
    const router = useRouter();
    
    return (
        <PostTemplateForm 
            role="super" 
            onSuccess={() => router.push('/admin/super/posts/templates')} 
        />
    );
}

export default function CreatePostTemplatePage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <TemplateFormContent />
        </Suspense>
    );
}



