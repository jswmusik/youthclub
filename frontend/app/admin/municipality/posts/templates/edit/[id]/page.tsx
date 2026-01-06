'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../../../../lib/api';
import PostTemplateForm from '../../../../../../components/posts/PostTemplateForm';
import { Sparkles } from 'lucide-react';

function TemplateEditContent() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            api.get(`/post-templates/${id}/`)
                .then(res => {
                    setData(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] animate-pulse">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-[var(--brand-light)]/60">Loading template...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-[var(--brand-light)]/60">Template not found</p>
                </div>
            </div>
        );
    }

    return (
        <PostTemplateForm 
            initialData={data} 
            role="municipality" 
            onSuccess={() => router.push('/admin/municipality/posts/templates')} 
        />
    );
}

export default function EditPostTemplatePage() {
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
            <TemplateEditContent />
        </Suspense>
    );
}










