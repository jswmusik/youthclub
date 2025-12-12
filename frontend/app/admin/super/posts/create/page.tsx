'use client';

import { useRouter } from 'next/navigation';
import PostForm from '../../../../components/posts/PostForm';

export default function CreatePostPage() {
    const router = useRouter();

    return (
        <div className="p-8">
            <PostForm 
                role="super" 
                onSuccess={() => router.push('/admin/super/posts')} 
            />
        </div>
    );
}