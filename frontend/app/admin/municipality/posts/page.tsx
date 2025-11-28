'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../../lib/api';
import { Post } from '../../../../types/post';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';
import Toast from '../../../components/Toast';

export default function SuperAdminPostsPage() {
    const [posts, setPosts] = useState<any[]>([]); // Use any to handle the nested details easier
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [postToDelete, setPostToDelete] = useState<{ id: number; title: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    const fetchData = async () => {
        try {
            const postsRes = await api.get('/posts/');
            setPosts(postsRes.data.results || postsRes.data);

            const statsRes = await api.get('/posts/analytics_overview/');
            setStats(statsRes.data);
        } catch (err) {
            console.error("Failed to fetch posts", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDeleteClick = (post: Post) => {
        setPostToDelete({ id: post.id, title: post.title });
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!postToDelete) return;

        setIsDeleting(true);
        try {
            await api.delete(`/posts/${postToDelete.id}/`);
            setToast({ message: 'Post deleted successfully!', type: 'success', isVisible: true });
            setShowDeleteModal(false);
            setPostToDelete(null);
            fetchData(); 
        } catch (err) {
            setToast({ message: 'Failed to delete post.', type: 'error', isVisible: true });
        } finally {
            setIsDeleting(false);
        }
    };

    // Helper to determine what to show in the "Scope" column
    const getScopeBadge = (post: any) => {
        if (post.is_global) {
            return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-bold">🌍 Global</span>;
        }
        
        // Super Admin creating for specific Munis
        if (post.target_municipalities_details && post.target_municipalities_details.length > 0) {
            const count = post.target_municipalities_details.length;
            const name = post.target_municipalities_details[0].name;
            return (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">
                    🏛️ {count > 1 ? `${count} Municipalities` : name}
                </span>
            );
        }

        // Super/Muni Admin creating for specific Clubs
        if (post.target_clubs_details && post.target_clubs_details.length > 0) {
            const count = post.target_clubs_details.length;
            const name = post.target_clubs_details[0].name;
            return (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                    ⚽ {count > 1 ? `${count} Clubs` : name}
                </span>
            );
        }

        // Fallback based on ownership
        if (post.owner_role === 'MUNICIPALITY_ADMIN') return <span className="text-gray-500 text-xs">Municipality</span>;
        if (post.owner_role === 'CLUB_ADMIN') return <span className="text-gray-500 text-xs">Club</span>;

        return <span className="text-gray-400 text-xs">-</span>;
    };

    if (loading) return <div className="p-8 text-center">Loading posts...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Post Management</h1>
                <Link 
                    href="/admin/super/posts/create"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
                >
                    + Create New Post
                </Link>
            </div>

            {/* Analytics Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                        <p className="text-sm text-gray-500">Total Posts</p>
                        <p className="text-2xl font-bold">{stats.total_posts}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                        <p className="text-sm text-gray-500">New (7 Days)</p>
                        <p className="text-2xl font-bold">{stats.created_last_7_days}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
                        <p className="text-sm text-gray-500">New (30 Days)</p>
                        <p className="text-2xl font-bold">{stats.created_last_30_days}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
                        <p className="text-sm text-gray-500">Avg Views</p>
                        <p className="text-2xl font-bold">{stats.average_views}</p>
                    </div>
                </div>
            )}

            {/* Posts Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Scope</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Views</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {posts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No posts found. Create your first one!
                                </td>
                            </tr>
                        ) : (
                            posts.map((post) => (
                                <tr key={post.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-900">
                                            {post.is_pinned && <span className="mr-2 text-red-500" title="Pinned">📌</span>}
                                            {post.title}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            By {post.author?.first_name || 'Unknown'} • {new Date(post.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    
                                    {/* NEW SCOPE COLUMN */}
                                    <td className="px-6 py-4">
                                        {getScopeBadge(post)}
                                    </td>

                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                            {post.post_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                            post.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                                            post.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {post.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {post.view_count}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                                        <Link href={`/admin/super/posts/${post.id}`} className="text-indigo-600 hover:text-indigo-900">
                                            View
                                        </Link>
                                        <Link href={`/admin/super/posts/edit/${post.id}`} className="text-blue-600 hover:text-blue-900">
                                            Edit
                                        </Link>
                                        <button 
                                            onClick={() => handleDeleteClick(post)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <DeleteConfirmationModal
                isVisible={showDeleteModal}
                onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setPostToDelete(null); } }}
                onConfirm={handleDeleteConfirm}
                itemName={postToDelete?.title}
                isLoading={isDeleting}
            />
            <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast({ ...toast, isVisible: false })} />
        </div>
    );
}
