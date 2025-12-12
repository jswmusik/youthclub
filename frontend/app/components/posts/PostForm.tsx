'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X, Globe, Building, Users } from 'lucide-react';
import Link from 'next/link';
import api from '../../../lib/api';
import { Post, PostImage } from '../../../types/post';
import RichTextEditor from '../RichTextEditor';
import { getMediaUrl } from '../../utils';
import Toast from '../Toast';
import { useAuth } from '../../../context/AuthContext';

// Shadcn
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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

    const handleCustomFieldChange = (fieldId: number, value: string) => {
        setCustomFieldRules(prev => ({
            ...prev,
            [fieldId]: value || undefined
        }));
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
            <div className="max-w-4xl mx-auto space-y-6">
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Edit Post</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-red-600 bg-red-50 p-4 rounded text-sm border border-red-200">
                            <strong>Access Denied:</strong> You do not have permission to edit global posts. Only super admins can create and edit global posts.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        {initialData ? 'Edit Post' : 'Create New Post'}
                    </h1>
                    <p className="text-sm text-muted-foreground">Share updates, news, or media with your members.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* --- DISTRIBUTION SECTION --- */}
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Distribution Scope</CardTitle>
                        <CardDescription>Choose where this post will be visible.</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6 space-y-4">
                        {/* SUPER ADMIN UI */}
                        {role === 'super' && (
                            <>
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center cursor-pointer">
                                        <input 
                                            type="radio" 
                                            checked={distributionMode === 'GLOBAL'} 
                                            onChange={() => setDistributionMode('GLOBAL')} 
                                            className="mr-2 text-[#4D4DA4] focus:ring-[#4D4DA4]" 
                                        />
                                        <span className="font-medium flex items-center gap-2">
                                            <Globe className="h-4 w-4" />
                                            Global (All Users)
                                        </span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input 
                                            type="radio" 
                                            checked={distributionMode === 'MUNICIPALITY'} 
                                            onChange={() => setDistributionMode('MUNICIPALITY')} 
                                            className="mr-2 text-[#4D4DA4] focus:ring-[#4D4DA4]" 
                                        />
                                        <span className="font-medium flex items-center gap-2">
                                            <Building className="h-4 w-4" />
                                            Specific Municipalities
                                        </span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input 
                                            type="radio" 
                                            checked={distributionMode === 'CLUB'} 
                                            onChange={() => setDistributionMode('CLUB')} 
                                            className="mr-2 text-[#4D4DA4] focus:ring-[#4D4DA4]" 
                                        />
                                        <span className="font-medium flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            Specific Clubs
                                        </span>
                                    </label>
                                </div>

                                {distributionMode === 'MUNICIPALITY' && (
                                    <div className="bg-muted/30 p-4 rounded-lg border max-h-48 overflow-y-auto">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {municipalities.map(m => (
                                                <label key={m.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-background p-2 rounded">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedMunis.includes(m.id)} 
                                                        onChange={() => toggleSelection(m.id, selectedMunis, setSelectedMunis)}
                                                        className="text-[#4D4DA4] focus:ring-[#4D4DA4]"
                                                    />
                                                    <span>{m.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {distributionMode === 'CLUB' && (
                                    <div className="bg-muted/30 p-4 rounded-lg border max-h-48 overflow-y-auto">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {clubs.map(c => (
                                                <label key={c.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-background p-2 rounded">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedClubs.includes(c.id)} 
                                                        onChange={() => toggleSelection(c.id, selectedClubs, setSelectedClubs)}
                                                        className="text-[#4D4DA4] focus:ring-[#4D4DA4]"
                                                    />
                                                    <span>{c.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* MUNICIPALITY ADMIN UI */}
                        {role === 'municipality' && (
                            <>
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center cursor-pointer">
                                        <input 
                                            type="radio" 
                                            checked={muniScope === 'ALL'} 
                                            onChange={() => setMuniScope('ALL')} 
                                            className="mr-2 text-[#4D4DA4] focus:ring-[#4D4DA4]" 
                                        />
                                        <span className="font-medium">Entire Municipality</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input 
                                            type="radio" 
                                            checked={muniScope === 'SPECIFIC'} 
                                            onChange={() => setMuniScope('SPECIFIC')} 
                                            className="mr-2 text-[#4D4DA4] focus:ring-[#4D4DA4]" 
                                        />
                                        <span className="font-medium">Specific Clubs</span>
                                    </label>
                                </div>

                                {muniScope === 'SPECIFIC' && (
                                    <div className="bg-muted/30 p-4 rounded-lg border max-h-48 overflow-y-auto">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {clubs.map(c => (
                                                <label key={c.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-background p-2 rounded">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedClubs.includes(c.id)} 
                                                        onChange={() => toggleSelection(c.id, selectedClubs, setSelectedClubs)}
                                                        className="text-[#4D4DA4] focus:ring-[#4D4DA4]"
                                                    />
                                                    <span>{c.name}</span>
                                                </label>
                                            ))}
                                            {clubs.length === 0 && <p className="text-sm text-muted-foreground col-span-2">No clubs found.</p>}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* CLUB ADMIN UI */}
                        {role === 'club' && (
                            <div className="bg-[#EBEBFE]/30 p-4 rounded-lg border border-[#4D4DA4]/20">
                                <p className="text-sm font-medium flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-[#4D4DA4]" />
                                    This post will be visible to members of your assigned club.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* --- CONTENT --- */}
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Post Content</CardTitle>
                        <CardDescription>Enter the title and content for your post.</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <Label>Title <span className="text-red-500">*</span></Label>
                            <Input 
                                type="text" 
                                required 
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Content</Label>
                            <RichTextEditor value={content} onChange={setContent} />
                        </div>
                    </CardContent>
                </Card>

                {/* --- MEDIA TYPE --- */}
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Media Type</CardTitle>
                        <CardDescription>Choose the type of media for this post.</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex flex-wrap gap-3">
                            {['TEXT', 'IMAGE', 'VIDEO'].map((type) => (
                                <Button 
                                    key={type} 
                                    type="button" 
                                    onClick={() => setPostType(type as any)} 
                                    variant={postType === type ? 'default' : 'outline'}
                                    className={postType === type ? 'bg-[#4D4DA4] hover:bg-[#FF5485] text-white' : ''}
                                >
                                    {type}
                                </Button>
                            ))}
                        </div>
                        
                        {postType === 'IMAGE' && (
                            <div className="space-y-3">
                                {existingImages.length > 0 && (
                                    <div className="flex gap-2 flex-wrap">
                                        {existingImages.map(img => (
                                            <div key={img.id} className="relative w-24 h-24 group">
                                                <img 
                                                    src={getMediaUrl(img.image) || ''} 
                                                    className={`w-full h-full object-cover rounded-lg ${imagesToDelete.includes(img.id) ? 'opacity-50' : ''}`} 
                                                    alt={`Post image ${img.id}`} 
                                                />
                                                {!imagesToDelete.includes(img.id) && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => toggleSelection(img.id, imagesToDelete, setImagesToDelete)} 
                                                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>Upload Images</Label>
                                    <Input 
                                        type="file" 
                                        multiple 
                                        accept="image/*" 
                                        onChange={e => e.target.files && setNewImages(Array.from(e.target.files))} 
                                    />
                                </div>
                            </div>
                        )}
                        
                        {postType === 'VIDEO' && (
                            <div className="space-y-2">
                                <Label>YouTube URL</Label>
                                <Input 
                                    type="url" 
                                    placeholder="https://www.youtube.com/watch?v=..." 
                                    value={videoUrl} 
                                    onChange={e => setVideoUrl(e.target.value)} 
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* --- TARGETING (AUDIENCE) --- */}
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Target Audience Filters</CardTitle>
                        <CardDescription>Define who can see this post.</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex flex-wrap items-center gap-6">
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    checked={targetMode === 'ATTRIBUTES'} 
                                    onChange={() => setTargetMode('ATTRIBUTES')} 
                                    className="mr-2 text-[#4D4DA4] focus:ring-[#4D4DA4]" 
                                />
                                <span className="font-medium">Attributes (Age, Interests)</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    checked={targetMode === 'GROUPS'} 
                                    onChange={() => setTargetMode('GROUPS')} 
                                    className="mr-2 text-[#4D4DA4] focus:ring-[#4D4DA4]" 
                                />
                                <span className="font-medium">Specific Groups</span>
                            </label>
                        </div>

                        {targetMode === 'GROUPS' ? (
                            <div className="bg-muted/30 p-4 rounded-lg border max-h-48 overflow-y-auto">
                                {availableGroups.map(g => (
                                    <label key={g.id} className="flex items-center p-2 cursor-pointer hover:bg-background rounded">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedGroups.includes(g.id)} 
                                            onChange={() => toggleSelection(g.id, selectedGroups, setSelectedGroups)} 
                                            className="mr-2 text-[#4D4DA4] focus:ring-[#4D4DA4]"
                                        />
                                        <span className="text-sm">{g.name}</span>
                                    </label>
                                ))}
                                {availableGroups.length === 0 && <p className="text-sm text-muted-foreground">No groups available.</p>}
                            </div>
                        ) : (
                            <div className="space-y-4 bg-muted/30 p-4 rounded-lg border">
                                <div>
                                    <Label className="text-xs font-bold uppercase mb-2">Member Type</Label>
                                    <div className="flex flex-wrap gap-4 mt-2">
                                        {['BOTH', 'YOUTH', 'GUARDIAN'].map(t => (
                                            <label key={t} className="flex items-center cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    checked={memberType === t} 
                                                    onChange={() => setMemberType(t as any)} 
                                                    className="mr-2 text-[#4D4DA4] focus:ring-[#4D4DA4]"
                                                />
                                                <span className="text-sm font-medium">{t}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Min Age</Label>
                                        <Input 
                                            type="number" 
                                            placeholder="Min Age" 
                                            value={minAge} 
                                            onChange={e => setMinAge(e.target.value)} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Max Age</Label>
                                        <Input 
                                            type="number" 
                                            placeholder="Max Age" 
                                            value={maxAge} 
                                            onChange={e => setMaxAge(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs font-bold uppercase mb-2">Grades</Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                                            <Button 
                                                key={g} 
                                                type="button" 
                                                onClick={() => toggleSelection(g, selectedGrades, setSelectedGrades)} 
                                                variant={selectedGrades.includes(g) ? 'default' : 'outline'}
                                                size="sm"
                                                className={selectedGrades.includes(g) ? 'bg-[#4D4DA4] hover:bg-[#FF5485] text-white w-10 h-10' : 'w-10 h-10'}
                                            >
                                                {g}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs font-bold uppercase mb-2">Gender</Label>
                                    <div className="flex flex-wrap gap-3 mt-2">
                                        {['MALE', 'FEMALE', 'OTHER'].map(g => (
                                            <label key={g} className="inline-flex items-center bg-background px-3 py-2 rounded-lg border shadow-sm cursor-pointer hover:bg-muted/50">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedGenders.includes(g)}
                                                    onChange={() => toggleSelection(g, selectedGenders, setSelectedGenders)}
                                                    className="mr-2 text-[#4D4DA4] focus:ring-[#4D4DA4]"
                                                />
                                                <span className="text-sm capitalize">{g.toLowerCase()}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs font-bold uppercase mb-2">Interests</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto mt-2">
                                        {availableInterests.map(interest => (
                                            <label key={interest.id} className="flex items-center text-sm cursor-pointer hover:bg-background p-2 rounded">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedInterests.includes(interest.id)}
                                                    onChange={() => toggleSelection(interest.id, selectedInterests, setSelectedInterests)}
                                                    className="mr-2 text-[#4D4DA4] focus:ring-[#4D4DA4]"
                                                />
                                                {interest.name}
                                            </label>
                                        ))}
                                        {availableInterests.length === 0 && <span className="text-sm text-muted-foreground col-span-full">No interests available.</span>}
                                    </div>
                                </div>
                                {availableCustomFields.length > 0 && (
                                    <div className="border-t pt-4 mt-4">
                                        <Label className="text-xs font-bold uppercase mb-3 block">Custom Fields</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {availableCustomFields.map(f => (
                                                <div key={f.id} className="space-y-2">
                                                    <Label className="text-sm">{f.name}</Label>
                                                    <select 
                                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:ring-offset-2" 
                                                        value={customFieldRules[f.id] || ''} 
                                                        onChange={e => handleCustomFieldChange(f.id, e.target.value)}
                                                    >
                                                        <option value="">Any</option>
                                                        {f.field_type === 'BOOLEAN' ? (
                                                            <>
                                                                <option value="true">Yes</option>
                                                                <option value="false">No</option>
                                                            </>
                                                        ) : (
                                                            f.options?.map((o:string) => <option key={o} value={o}>{o}</option>)
                                                        )}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* --- PUBLISH SETTINGS --- */}
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Publication Settings</CardTitle>
                        <CardDescription>Configure when and how this post will be published.</CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <select 
                                        value={status} 
                                        onChange={e => setStatus(e.target.value as any)} 
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:ring-offset-2"
                                    >
                                        <option value="DRAFT">Draft</option>
                                        <option value="PUBLISHED">Publish Now</option>
                                        <option value="SCHEDULED">Schedule</option>
                                    </select>
                                </div>
                                {status === 'SCHEDULED' && (
                                    <div className="space-y-2">
                                        <Label>Schedule Date & Time</Label>
                                        <Input 
                                            type="datetime-local" 
                                            value={publishedAt} 
                                            onChange={e => setPublishedAt(e.target.value)} 
                                        />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>Visibility End Date (Optional)</Label>
                                    <Input 
                                        type="datetime-local" 
                                        value={visibilityEndDate} 
                                        onChange={e => setVisibilityEndDate(e.target.value)} 
                                    />
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={isPinned} 
                                        onChange={e => setIsPinned(e.target.checked)}
                                        className="text-[#4D4DA4] focus:ring-[#4D4DA4]"
                                    />
                                    <span className="text-sm font-medium">Pin to top</span>
                                </label>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={allowComments} 
                                            onChange={e => setAllowComments(e.target.checked)}
                                            className="text-[#4D4DA4] focus:ring-[#4D4DA4]"
                                        />
                                        <span className="text-sm font-bold">Allow Comments</span>
                                    </label>
                                    {allowComments && (
                                        <div className="pl-6 space-y-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={requireModeration} 
                                                    onChange={e => setRequireModeration(e.target.checked)}
                                                    className="text-[#4D4DA4] focus:ring-[#4D4DA4]"
                                                />
                                                <span className="text-sm">Require Moderation</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={allowReplies} 
                                                    onChange={e => setAllowReplies(e.target.checked)}
                                                    className="text-[#4D4DA4] focus:ring-[#4D4DA4]"
                                                />
                                                <span className="text-sm">Allow Replies</span>
                                            </label>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Comment Limit Per User (0 = unlimited)</Label>
                                                <Input 
                                                    type="number" 
                                                    min="0"
                                                    value={limitComments} 
                                                    onChange={e => setLimitComments(parseInt(e.target.value) || 0)} 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3 border-t pt-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={sendPush} 
                                            onChange={e => setSendPush(e.target.checked)}
                                            className="text-[#4D4DA4] focus:ring-[#4D4DA4]"
                                        />
                                        <span className="text-sm font-bold">Send Push Notification</span>
                                    </label>
                                    {sendPush && (
                                        <div className="pl-6 space-y-2">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Notification Title</Label>
                                                <Input 
                                                    type="text" 
                                                    placeholder="Notification title" 
                                                    value={pushTitle} 
                                                    onChange={e => setPushTitle(e.target.value)} 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Notification Message</Label>
                                                <Input 
                                                    type="text" 
                                                    placeholder="Notification message" 
                                                    value={pushMessage} 
                                                    onChange={e => setPushMessage(e.target.value)} 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-3 pb-10">
                    <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={loading} className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white min-w-[150px]">
                        {loading ? 'Saving...' : (initialData ? 'Update Post' : 'Create Post')}
                    </Button>
                </div>
            </form>

            <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast({...toast, isVisible: false})} />
        </div>
    );
}