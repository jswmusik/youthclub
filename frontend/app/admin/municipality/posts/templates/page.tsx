'use client';

import { Suspense } from 'react';
import PostTemplateManager from '../../../../components/posts/PostTemplateManager';
import { Sparkles } from 'lucide-react';

function TemplateManagerContent() {
    return <PostTemplateManager basePath="/admin/municipality" />;
}

export default function MunicipalityAdminPostTemplatesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] animate-pulse">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-[var(--brand-light)]/60">Loading templates...</p>
                </div>
            </div>
        }>
            <TemplateManagerContent />
        </Suspense>
    );
}






