'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import api from '../../../../../../lib/api';
import PostForm from '../../../../../components/posts/PostForm';
import { Post } from '../../../../../../types/post';
import { Sparkles } from 'lucide-react';

function EditPostPageContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const postId = params?.id as string;
    
    const buildUrlWithParams = (path: string) => {
        const urlParams = new URLSearchParams();
        const page = searchParams.get('page');
        const search = searchParams.get('search');
        const scope = searchParams.get('scope');
        const type = searchParams.get('type');
        const status = searchParams.get('status');
        
        if (page && page !== '1') urlParams.set('page', page);
        if (search) urlParams.set('search', search);
        if (scope) urlParams.set('scope', scope);
        if (type) urlParams.set('type', type);
        if (status) urlParams.set('status', status);
        
        const queryString = urlParams.toString();
        return queryString ? `${path}?${queryString}` : path;
    };
    
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!postId) return;
        
        const fetchPost = async () => {
            try {
                const res = await api.get(`/posts/${postId}/`);
                setPost(res.data);
            } catch (err) {
                console.error("Failed to fetch post", err);
                router.push('/admin/municipality/posts');
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [postId, router]);

    if (loading) return (
        <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] animate-pulse">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <p className="text-[var(--brand-light)]/60">Loading post data...</p>
            </div>
        </div>
    );
    
    if (!post) return null;

    return (
        <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6 md:py-8 px-0">
            <PostForm 
                initialData={post}
                role="municipality"
                onSuccess={() => router.push(buildUrlWithParams(`/admin/municipality/posts/${post.id}`))} 
            />
        </div>
    );
}

export default function EditPostPage() {
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
            <EditPostPageContent />
        </Suspense>
    );
}
