'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { Post, PostImage } from '../../../types/post';
import RichTextEditor from '../RichTextEditor';
import { getMediaUrl } from '../../utils';
import Toast from '../Toast';
import { useAuth } from '../../../context/AuthContext';

interface PostFormProps {
    initialData?: Post;
    role: 'super' | 'municipality' | 'club';
    onSuccess: () => void;
}

export default function PostForm({ initialData, role, onSuccess }: PostFormProps) {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
        message: '', type: 'success', isVisible: false,
    });

    // --- Dynamic Data ---
    const [municipalities, setMunicipalities] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [availableInterests, setAvailableInterests] = useState<any[]>([]);
    const [availableCustomFields, setAvailableCustomFields] = useState<any[]>([]);

    // --- 1. Distribution (Scope) State ---
    const getInitialDistributionMode = (): 'GLOBAL' | 'MUNICIPALITY' | 'CLUB' => {
        if (initialData) {
            // Municipality and club admins cannot have global posts
            if (initialData.is_global && role === 'super') return 'GLOBAL';
            if (initialData.target_municipalities?.length) return 'MUNICIPALITY';
            return 'CLUB';
        }
        if (role === 'super') return 'GLOBAL';
        if (role === 'municipality') return 'MUNICIPALITY';
        return 'CLUB';
    };
    
    const [distributionMode, setDistributionMode] = useState<'GLOBAL' | 'MUNICIPALITY' | 'CLUB'>(getInitialDistributionMode());
    const [selectedMunis, setSelectedMunis] = useState<number[]>(initialData?.target_municipalities || []);
    const [selectedClubs, setSelectedClubs] = useState<number[]>(initialData?.target_clubs || []);
    
    // For Muni Admin: "All Clubs" vs "Specific"
    const [muniScope, setMuniScope] = useState<'ALL' | 'SPECIFIC'>(
        (initialData?.target_clubs && initialData.target_clubs.length > 0) ? 'SPECIFIC' : 'ALL'
    );

    // --- 2. Basic Info ---
    const [title, setTitle] = useState(initialData?.title || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [postType, setPostType] = useState(initialData?.post_type || 'TEXT');
    const [videoUrl, setVideoUrl] = useState(initialData?.video_url || '');
    const [existingImages, setExistingImages] = useState<PostImage[]>(initialData?.images || []);
    const [newImages, setNewImages] = useState<File[]>([]);
    const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);

    // --- 3. Status & Scheduling ---
    const [status, setStatus] = useState(initialData?.status || 'DRAFT');
    const [publishedAt, setPublishedAt] = useState(initialData?.published_at ? initialData.published_at.slice(0, 16) : '');
    const [visibilityEndDate, setVisibilityEndDate] = useState(initialData?.visibility_end_date ? initialData.visibility_end_date.slice(0, 16) : '');
    const [isPinned, setIsPinned] = useState(initialData?.is_pinned || false);

    // --- 4. Targeting (Audience) ---
    const [targetMode, setTargetMode] = useState<'GROUPS' | 'ATTRIBUTES'>(
        (initialData?.target_groups && initialData.target_groups.length > 0) ? 'GROUPS' : 'ATTRIBUTES'
    );
    const [selectedGroups, setSelectedGroups] = useState<number[]>(initialData?.target_groups || []);
    const [memberType, setMemberType] = useState(initialData?.target_member_type || 'BOTH');
    const [minAge, setMinAge] = useState(initialData?.target_min_age?.toString() || '');
    const [maxAge, setMaxAge] = useState(initialData?.target_max_age?.toString() || '');
    const [selectedGrades, setSelectedGrades] = useState<number[]>(initialData?.target_grades || []);
    const [selectedGenders, setSelectedGenders] = useState<string[]>(initialData?.target_genders || []);
    const [selectedInterests, setSelectedInterests] = useState<number[]>(initialData?.target_interests || []);
    const [customFieldRules, setCustomFieldRules] = useState<Record<string, any>>(initialData?.target_custom_fields || {});

    // --- 5. Settings ---
    const [allowComments, setAllowComments] = useState(initialData?.allow_comments ?? true);
    const [requireModeration, setRequireModeration] = useState(initialData?.require_moderation ?? false);
    const [allowReplies, setAllowReplies] = useState(initialData?.allow_replies ?? true);
    const [limitComments, setLimitComments] = useState(initialData?.limit_comments_per_user || 0);
    const [sendPush, setSendPush] = useState(initialData?.send_push_notification || false);
    const [pushTitle, setPushTitle] = useState(initialData?.push_title || '');
    const [pushMessage, setPushMessage] = useState(initialData?.push_message || '');

    // --- Data Fetching ---
    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Basic Lists
                const groupsRes = await api.get('/groups/');
                setAvailableGroups(Array.isArray(groupsRes.data) ? groupsRes.data : groupsRes.data.results || []);

                const interestsRes = await api.get('/interests/');
                setAvailableInterests(Array.isArray(interestsRes.data) ? interestsRes.data : interestsRes.data.results || []);

                const fieldsRes = await api.get('/custom-fields/');
                const allFields = Array.isArray(fieldsRes.data) ? fieldsRes.data : fieldsRes.data.results || [];
                setAvailableCustomFields(allFields.filter((f: any) => 
                    ['BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT'].includes(f.field_type)
                ));

                // 2. Admin Specific Lists
                if (role === 'super') {
                    const muniRes = await api.get('/municipalities/');
                    setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
                    
                    const clubRes = await api.get('/clubs/?page_size=1000');
                    setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
                } 
                else if (role === 'municipality') {
                    // Municipality Admins only need the clubs in their muni (API handles filtering)
                    const clubRes = await api.get('/clubs/?page_size=1000');
                    setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
                }
                // Club admins don't need to fetch external clubs or munis

            } catch (err) {
                console.error("Failed to load form data", err);
            }
        };
        loadData();
    }, [role]);

    // --- Helpers ---
    const toggleSelection = (id: any, list: any[], setList: (l: any[]) => void) => {
        if (list.includes(id)) setList(list.filter(item => item !== id));
        else setList([...list, id]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const formData = new FormData();

        // 1. Basic
        formData.append('title', title);
        formData.append('content', content);
        formData.append('post_type', postType);
        if (videoUrl) formData.append('video_url', videoUrl);

        // 2. Distribution Logic
        let isGlobal = false;
        let targetMunis: number[] = [];
        let targetClubs: number[] = [];

        if (role === 'super') {
            if (distributionMode === 'GLOBAL') isGlobal = true;
            else if (distributionMode === 'MUNICIPALITY') targetMunis = selectedMunis;
            else targetClubs = selectedClubs;
        } 
        else if (role === 'municipality') {
            // Municipality admins CANNOT create global posts - force false
            isGlobal = false;
            // Also prevent GLOBAL mode from being set
            if (distributionMode === 'GLOBAL') {
                setError('Municipality admins cannot create global posts.');
                setLoading(false);
                return;
            }
            if (muniScope === 'ALL') {
                 // If targeting entire municipality, we pass the municipality ID but NO specific clubs
                 const muniId = currentUser?.assigned_municipality 
                    ? (typeof currentUser.assigned_municipality === 'object' ? currentUser.assigned_municipality.id : currentUser.assigned_municipality)
                    : null;
                 if (muniId) targetMunis = [muniId];
            } else {
                // Specific clubs
                targetClubs = selectedClubs;
            }
        } 
        else if (role === 'club') {
            isGlobal = false;
            // The backend automatically assigns the club, but passing it here helps validity
            const clubId = currentUser?.assigned_club
                ? (typeof currentUser.assigned_club === 'object' ? currentUser.assigned_club.id : currentUser.assigned_club)
                : null;
            if (clubId) targetClubs = [clubId];
        }

        formData.append('is_global', isGlobal.toString());
        
        // Only append IDs if we have them (avoids sending empty strings)
        targetMunis.forEach(id => formData.append('target_municipalities', id.toString()));
        targetClubs.forEach(id => formData.append('target_clubs', id.toString()));

        // 3. Status
        formData.append('status', status);
        if (status === 'SCHEDULED' && publishedAt) formData.append('published_at', new Date(publishedAt).toISOString());
        if (visibilityEndDate) formData.append('visibility_end_date', new Date(visibilityEndDate).toISOString());
        formData.append('is_pinned', isPinned ? 'true' : 'false');

        // 4. Targeting
        formData.append('target_member_type', memberType);
        if (targetMode === 'GROUPS') {
            selectedGroups.forEach(id => formData.append('target_groups', id.toString()));
            formData.append('target_grades', '[]');
            formData.append('target_genders', '[]');
            formData.append('target_custom_fields', '{}');
        } else {
            // Important: Don't append empty strings for ManyToMany logic in Django Rest Framework
            if (selectedGroups.length > 0) {
                 selectedGroups.forEach(id => formData.append('target_groups', id.toString()));
            }
            
            if (minAge) formData.append('target_min_age', minAge.toString());
            if (maxAge) formData.append('target_max_age', maxAge.toString());
            formData.append('target_grades', JSON.stringify(selectedGrades));
            formData.append('target_genders', JSON.stringify(selectedGenders));
            
            selectedInterests.forEach(id => formData.append('target_interests', id.toString()));
            formData.append('target_custom_fields', JSON.stringify(customFieldRules));
        }

        // 5. Settings
        formData.append('allow_comments', allowComments ? 'true' : 'false');
        formData.append('require_moderation', requireModeration ? 'true' : 'false');
        formData.append('allow_replies', allowReplies ? 'true' : 'false');
        formData.append('limit_comments_per_user', limitComments.toString());
        formData.append('send_push_notification', sendPush ? 'true' : 'false');
        if (sendPush) {
            formData.append('push_title', pushTitle);
            formData.append('push_message', pushMessage);
        }

        // 6. Files
        newImages.forEach((file) => formData.append('uploaded_images', file));
        if (initialData && imagesToDelete.length > 0) {
            imagesToDelete.forEach((id) => formData.append('images_to_delete', id.toString()));
        }

        try {
            if (initialData) {
                await api.patch(`/posts/${initialData.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                setToast({ message: 'Updated successfully', type: 'success', isVisible: true });
            } else {
                await api.post('/posts/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                setToast({ message: 'Created successfully', type: 'success', isVisible: true });
            }
            setTimeout(() => onSuccess(), 1000);
        } catch (err: any) {
            console.error(err);
            // Extract error message safely
            let msg = 'Failed to save post.';
            if (err.response?.data) {
               if (typeof err.response.data === 'string') msg = err.response.data;
               else if (err.response.data.detail) msg = err.response.data.detail;
               else msg = JSON.stringify(err.response.data);
            }
            setError(msg);
            setToast({ message: msg, type: 'error', isVisible: true });
        } finally {
            setLoading(false);
        }
    };

    // Prevent municipality and club admins from editing global posts
    if (initialData?.is_global && role !== 'super') {
        return (
            <div className="space-y-8 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Edit Post</h2>
                    <p className="text-red-600 bg-red-50 p-4 rounded text-sm border border-red-200">
                        <strong>Access Denied:</strong> You do not have permission to edit global posts. Only super admins can create and edit global posts.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">{initialData ? 'Edit Post' : 'Create New Post'}</h2>
                {error && <p className="text-red-600 bg-red-50 p-2 rounded text-sm">{error}</p>}
            </div>

            {/* --- DISTRIBUTION SECTION --- */}
            <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 space-y-4">
                <h3 className="text-lg font-bold text-blue-900">Distribution Scope</h3>
                
                {/* SUPER ADMIN UI */}
                {role === 'super' && (
                    <>
                        <div className="flex gap-4 mb-4">
                            <label className="flex items-center cursor-pointer bg-white px-3 py-2 rounded border hover:border-blue-300">
                                <input type="radio" checked={distributionMode === 'GLOBAL'} onChange={() => setDistributionMode('GLOBAL')} className="mr-2" />
                                <span className="font-medium">Global (All Users)</span>
                            </label>
                            <label className="flex items-center cursor-pointer bg-white px-3 py-2 rounded border hover:border-blue-300">
                                <input type="radio" checked={distributionMode === 'MUNICIPALITY'} onChange={() => setDistributionMode('MUNICIPALITY')} className="mr-2" />
                                <span className="font-medium">Specific Municipalities</span>
                            </label>
                            <label className="flex items-center cursor-pointer bg-white px-3 py-2 rounded border hover:border-blue-300">
                                <input type="radio" checked={distributionMode === 'CLUB'} onChange={() => setDistributionMode('CLUB')} className="mr-2" />
                                <span className="font-medium">Specific Clubs</span>
                            </label>
                        </div>

                        {distributionMode === 'MUNICIPALITY' && (
                            <div className="bg-white p-3 rounded border max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
                                {municipalities.map(m => (
                                    <label key={m.id} className="flex items-center space-x-2 text-sm">
                                        <input type="checkbox" checked={selectedMunis.includes(m.id)} onChange={() => toggleSelection(m.id, selectedMunis, setSelectedMunis)} />
                                        <span>{m.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        {distributionMode === 'CLUB' && (
                            <div className="bg-white p-3 rounded border max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
                                {clubs.map(c => (
                                    <label key={c.id} className="flex items-center space-x-2 text-sm">
                                        <input type="checkbox" checked={selectedClubs.includes(c.id)} onChange={() => toggleSelection(c.id, selectedClubs, setSelectedClubs)} />
                                        <span>{c.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* MUNICIPALITY ADMIN UI */}
                {role === 'municipality' && (
                    <>
                        <div className="flex gap-4 mb-4">
                            <label className="flex items-center cursor-pointer bg-white px-3 py-2 rounded border hover:border-blue-300">
                                <input type="radio" checked={muniScope === 'ALL'} onChange={() => setMuniScope('ALL')} className="mr-2" />
                                <span className="font-medium">Entire Municipality</span>
                            </label>
                            <label className="flex items-center cursor-pointer bg-white px-3 py-2 rounded border hover:border-blue-300">
                                <input type="radio" checked={muniScope === 'SPECIFIC'} onChange={() => setMuniScope('SPECIFIC')} className="mr-2" />
                                <span className="font-medium">Specific Clubs</span>
                            </label>
                        </div>

                        {muniScope === 'SPECIFIC' && (
                            <div className="bg-white p-3 rounded border max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
                                {clubs.map(c => (
                                    <label key={c.id} className="flex items-center space-x-2 text-sm">
                                        <input type="checkbox" checked={selectedClubs.includes(c.id)} onChange={() => toggleSelection(c.id, selectedClubs, setSelectedClubs)} />
                                        <span>{c.name}</span>
                                    </label>
                                ))}
                                {clubs.length === 0 && <p className="text-sm text-gray-500">No clubs found.</p>}
                            </div>
                        )}
                    </>
                )}

                {/* CLUB ADMIN UI */}
                {role === 'club' && (
                    <div className="bg-white p-4 rounded border border-blue-200">
                         <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                            <span className="text-lg">📢</span>
                            This post will be visible to members of your assigned club.
                        </p>
                    </div>
                )}
            </div>

            {/* --- CONTENT --- */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <RichTextEditor value={content} onChange={setContent} />
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Media</label>
                    <div className="flex gap-4 mb-2">
                        {['TEXT', 'IMAGE', 'VIDEO'].map((type) => (
                            <button key={type} type="button" onClick={() => setPostType(type as any)} 
                                className={`px-4 py-2 rounded text-sm font-medium border ${postType === type ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}>
                                {type}
                            </button>
                        ))}
                    </div>
                    
                    {postType === 'IMAGE' && (
                        <div className="space-y-3">
                            {existingImages.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                    {existingImages.map(img => (
                                        <div key={img.id} className="relative w-24 h-24">
                                            <img src={getMediaUrl(img.image) || ''} className={`w-full h-full object-cover rounded ${imagesToDelete.includes(img.id) ? 'opacity-50' : ''}`} alt={`Post image ${img.id}`} />
                                            <button type="button" onClick={() => toggleSelection(img.id, imagesToDelete, setImagesToDelete)} 
                                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <input type="file" multiple accept="image/*" onChange={e => e.target.files && setNewImages(Array.from(e.target.files))} className="block w-full text-sm text-gray-500" />
                        </div>
                    )}
                    
                    {postType === 'VIDEO' && (
                        <input type="url" placeholder="YouTube URL" className="w-full border p-2 rounded" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
                    )}
                </div>
            </div>

            <hr />

            {/* --- TARGETING (AUDIENCE) --- */}
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Target Audience Filters</h3>
                <div className="flex items-center gap-6 mb-4">
                    <label className="flex items-center cursor-pointer">
                        <input type="radio" checked={targetMode === 'ATTRIBUTES'} onChange={() => setTargetMode('ATTRIBUTES')} className="mr-2" />
                        Attributes (Age, Interests)
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input type="radio" checked={targetMode === 'GROUPS'} onChange={() => setTargetMode('GROUPS')} className="mr-2" />
                        Specific Groups
                    </label>
                </div>

                {targetMode === 'GROUPS' ? (
                    <div className="bg-gray-50 p-4 rounded border max-h-48 overflow-y-auto">
                        {availableGroups.map(g => (
                            <label key={g.id} className="flex items-center p-1 cursor-pointer">
                                <input type="checkbox" checked={selectedGroups.includes(g.id)} onChange={() => toggleSelection(g.id, selectedGroups, setSelectedGroups)} className="mr-2" />
                                {g.name}
                            </label>
                        ))}
                        {availableGroups.length === 0 && <p className="text-sm text-gray-500">No groups available.</p>}
                    </div>
                ) : (
                    <div className="space-y-4 bg-gray-50 p-4 rounded border">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Member Type</label>
                            <div className="flex gap-4">
                                {['BOTH', 'YOUTH', 'GUARDIAN'].map(t => (
                                    <label key={t} className="flex items-center"><input type="radio" checked={memberType === t} onChange={() => setMemberType(t as any)} className="mr-1" /> {t}</label>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" placeholder="Min Age" className="border p-2 rounded" value={minAge} onChange={e => setMinAge(e.target.value)} />
                            <input type="number" placeholder="Max Age" className="border p-2 rounded" value={maxAge} onChange={e => setMaxAge(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Grades</label>
                            <div className="flex flex-wrap gap-2">
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                                    <button key={g} type="button" onClick={() => toggleSelection(g, selectedGrades, setSelectedGrades)} 
                                        className={`w-8 h-8 rounded border ${selectedGrades.includes(g) ? 'bg-blue-600 text-white' : 'bg-white'}`}>{g}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Gender</label>
                            <div className="flex gap-3">
                                {['MALE', 'FEMALE', 'OTHER'].map(g => (
                                    <label key={g} className="inline-flex items-center bg-white px-3 py-1 rounded border shadow-sm cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedGenders.includes(g)}
                                            onChange={() => toggleSelection(g, selectedGenders, setSelectedGenders)}
                                            className="mr-2 text-blue-600"
                                        />
                                        <span className="text-sm capitalize">{g.toLowerCase()}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Interests</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                                {availableInterests.map(interest => (
                                    <label key={interest.id} className="flex items-center text-sm cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedInterests.includes(interest.id)}
                                            onChange={() => toggleSelection(interest.id, selectedInterests, setSelectedInterests)}
                                            className="mr-2 rounded text-blue-600 h-4 w-4 border-gray-300"
                                        />
                                        {interest.name}
                                    </label>
                                ))}
                                {availableInterests.length === 0 && <span className="text-sm text-gray-400">No interests available.</span>}
                            </div>
                        </div>
                        {availableCustomFields.length > 0 && (
                            <div className="border-t pt-2 mt-2">
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Custom Fields</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {availableCustomFields.map(f => (
                                        <div key={f.id}>
                                            <label className="text-xs block mb-1">{f.name}</label>
                                            {f.field_type === 'BOOLEAN' ? (
                                                <select className="w-full border p-1 rounded text-sm" value={customFieldRules[f.id] || ''} onChange={e => handleCustomFieldChange(f.id, e.target.value)}>
                                                    <option value="">Any</option><option value="true">Yes</option><option value="false">No</option>
                                                </select>
                                            ) : (
                                                <select className="w-full border p-1 rounded text-sm" value={customFieldRules[f.id] || ''} onChange={e => handleCustomFieldChange(f.id, e.target.value)}>
                                                    <option value="">Any</option>
                                                    {f.options?.map((o:string) => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- PUBLISH SETTINGS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border p-2 rounded">
                            <option value="DRAFT">Draft</option>
                            <option value="PUBLISHED">Publish Now</option>
                            <option value="SCHEDULED">Schedule</option>
                        </select>
                    </div>
                    {status === 'SCHEDULED' && <input type="datetime-local" className="w-full border p-2 rounded" value={publishedAt} onChange={e => setPublishedAt(e.target.value)} />}
                    
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} />
                        Pin to top
                    </label>
                </div>
                <div className="bg-gray-50 p-4 rounded border">
                    <label className="flex items-center gap-2 mb-2 font-bold"><input type="checkbox" checked={allowComments} onChange={e => setAllowComments(e.target.checked)} /> Allow Comments</label>
                    {allowComments && (
                        <div className="pl-6 space-y-2 text-sm">
                            <label className="flex items-center gap-2"><input type="checkbox" checked={requireModeration} onChange={e => setRequireModeration(e.target.checked)} /> Moderation</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={allowReplies} onChange={e => setAllowReplies(e.target.checked)} /> Replies</label>
                        </div>
                    )}
                    <label className="flex items-center gap-2 mt-4 font-bold"><input type="checkbox" checked={sendPush} onChange={e => setSendPush(e.target.checked)} /> Send Push Notification</label>
                    {sendPush && (
                        <div className="pl-6 mt-2 space-y-2">
                            <input type="text" placeholder="Notif Title" className="w-full border p-1 rounded text-sm" value={pushTitle} onChange={e => setPushTitle(e.target.value)} />
                            <input type="text" placeholder="Notif Message" className="w-full border p-1 rounded text-sm" value={pushMessage} onChange={e => setPushMessage(e.target.value)} />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t">
                <button type="button" onClick={() => router.back()} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                    {loading ? 'Saving...' : (initialData ? 'Update' : 'Create')}
                </button>
            </div>

            <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast({...toast, isVisible: false})} />
        </form>
    );
}