'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import api from '../../../../../../lib/api';
import PostForm from '../../../../../components/posts/PostForm';
import { Post } from '../../../../../../types/post';

export default function EditPostPage() {
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
                alert("Post not found");
                router.push('/admin/super/posts');
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [postId, router]);

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading post data...</div>;
    if (!post) return null;

    return (
        <div className="p-8">
            <PostForm 
                initialData={post}
                role="super" 
                onSuccess={() => router.push(buildUrlWithParams(`/admin/super/posts/${post.id}`))} // Redirect to View Page with params
            />
        </div>
    );
}