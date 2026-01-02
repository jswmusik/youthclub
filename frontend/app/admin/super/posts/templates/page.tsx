'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import PostTemplateManager from '../../../../components/posts/PostTemplateManager';
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

function TemplateManagerContent() {
    return <PostTemplateManager basePath="/admin/super" />;
}

export default function SuperAdminPostTemplatesPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <TemplateManagerContent />
        </Suspense>
    );
}



