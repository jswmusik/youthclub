'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '../../../../../../lib/api';
import PostForm from '../../../../../components/posts/PostForm';
import { Post } from '../../../../../../types/post';

export default function EditPostPage() {
    const router = useRouter();
    const params = useParams();
    const postId = params?.id as string;
    
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
                router.push('/admin/municipality/posts');
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [postId, router]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading post data...</div>;
    if (!post) return null;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <button 
                    onClick={() => router.back()}
                    className="text-sm text-gray-500 hover:text-gray-700 mb-2"
                >
                    ← Cancel & Back
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Edit Post</h1>
            </div>

            <PostForm 
                initialData={post}
                role="municipality" // <--- Ensures "Global" option is HIDDEN
                onSuccess={() => router.push(`/admin/municipality/posts/${post.id}`)} 
            />
        </div>
    );
}