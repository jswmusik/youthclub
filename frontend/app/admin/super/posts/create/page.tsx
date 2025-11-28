'use client';

import { useRouter } from 'next/navigation';
import PostForm from '../../../../components/posts/PostForm';

export default function CreatePostPage() {
    const router = useRouter();

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <button 
                    onClick={() => router.back()}
                    className="text-sm text-gray-500 hover:text-gray-700 mb-2"
                >
                    ← Back to Posts
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Create New Post</h1>
                <p className="text-gray-500">Share updates, news, or media with your members.</p>
            </div>

            <PostForm 
                role="super" 
                onSuccess={() => router.push('/admin/super/posts')} 
            />
        </div>
    );
}