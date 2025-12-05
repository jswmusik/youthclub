'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Event, EventStatus, TargetAudience } from '@/types/event';
import { useAuth } from '@/context/AuthContext';
import { getMediaUrl } from '@/app/utils';

interface EventFormProps {
    initialData?: Event;
    scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function EventForm({ initialData, scope }: EventFormProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    
    // Dropdown Data
    const [groups, setGroups] = useState<any[]>([]);
    const [interests, setInterests] = useState<any[]>([]);
    const [coverPreview, setCoverPreview] = useState<string | null>(
        initialData?.cover_image ? getMediaUrl(initialData.cover_image) : null
    );
    const [coverFile, setCoverFile] = useState<File | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Event>>({
        title: '',
        description: '',
        status: EventStatus.DRAFT,
        target_audience: TargetAudience.YOUTH,
        cost: '',
        start_date: '',
        end_date: '',
        location_name: '',
        address: '',
        max_seats: 0,
        max_waitlist: 0,
        allow_registration: true,
        requires_guardian_approval: false,
        requires_admin_approval: false,
        enable_tickets: true,
        send_reminders: true,
        target_groups: [],
        target_interests: [],
        target_genders: [],
        target_grades: [],
        ...initialData
    });

    // Update form data when initialData changes
    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                description: initialData.description || '',
                status: initialData.status || EventStatus.DRAFT,
                target_audience: initialData.target_audience || TargetAudience.YOUTH,
                cost: initialData.cost || '',
                start_date: initialData.start_date || '',
                end_date: initialData.end_date || '',
                location_name: initialData.location_name || '',
                address: initialData.address || '',
                max_seats: initialData.max_seats || 0,
                max_waitlist: initialData.max_waitlist || 0,
                allow_registration: initialData.allow_registration ?? true,
                requires_guardian_approval: initialData.requires_guardian_approval || false,
                requires_admin_approval: initialData.requires_admin_approval || false,
                enable_tickets: initialData.enable_tickets ?? true,
                send_reminders: initialData.send_reminders ?? true,
                target_groups: initialData.target_groups || [],
                target_interests: initialData.target_interests || [],
                target_genders: initialData.target_genders || [],
                target_grades: initialData.target_grades || [],
            });
            setCoverPreview(initialData.cover_image ? getMediaUrl(initialData.cover_image) : null);
        }
    }, [initialData]);

    // Clean up object URLs to prevent memory leaks
    useEffect(() => {
        return () => {
            if (coverPreview && coverPreview.startsWith('blob:')) {
                URL.revokeObjectURL(coverPreview);
            }
        };
    }, [coverPreview]);

    // Fetch dependencies
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                // Adjust endpoints based on your structure
                const [groupsRes, interestsRes] = await Promise.all([
                    api.get('/groups/'), 
                    api.get('/interests/')
                ]);
                setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : groupsRes.data.results || []);
                setInterests(Array.isArray(interestsRes.data) ? interestsRes.data : interestsRes.data.results || []);
            } catch (err) {
                console.error("Failed to load options", err);
            }
        };
        fetchOptions();
    }, []);

    const handleChange = (field: keyof Event, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Revoke previous object URL if it exists
            if (coverPreview && coverPreview.startsWith('blob:')) {
                URL.revokeObjectURL(coverPreview);
            }
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const data = new FormData();
            
            // Append all simple fields
            Object.keys(formData).forEach(key => {
                const value = formData[key as keyof Event];
                if (value !== undefined && value !== null && key !== 'cover_image') {
                    // Skip arrays and JSON fields - handle separately
                    if (['target_groups', 'target_interests', 'target_genders', 'target_grades'].includes(key)) {
                        return;
                    }
                    // Handle boolean values
                    if (typeof value === 'boolean') {
                        data.append(key, value.toString());
                    } else {
                        data.append(key, value.toString());
                    }
                }
            });

            // Handle Arrays (ManyToMany fields)
            formData.target_groups?.forEach(id => data.append('target_groups', id.toString()));
            formData.target_interests?.forEach(id => data.append('target_interests', id.toString()));
            
            // JSON Fields - Send as JSON strings
            data.append('target_genders', JSON.stringify(formData.target_genders || []));
            data.append('target_grades', JSON.stringify(formData.target_grades || []));

            // Handle File
            if (coverFile) {
                data.append('cover_image', coverFile);
            }

            // Organization Context (If creating new)
            if (!initialData) {
                if (scope === 'CLUB' && user?.assigned_club) {
                    const clubId = typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club;
                    data.append('club', clubId.toString());
                }
                if (scope === 'MUNICIPALITY' && user?.assigned_municipality) {
                    const muniId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
                    data.append('municipality', muniId.toString());
                }
            }

            const config = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (initialData?.id) {
                await api.patch(`/events/${initialData.id}/`, data, config);
            } else {
                await api.post('/events/', data, config);
            }

            // Redirect back to list
            router.push(`/admin/${scope.toLowerCase()}/events`);
            
        } catch (error) {
            console.error(error);
            alert("Something went wrong. Please check your inputs.");
        } finally {
            setLoading(false);
        }
    };

    // Helper for Multi-Selects
    const toggleSelection = (field: 'target_groups' | 'target_interests', id: number) => {
        const current = (formData[field] as number[]) || [];
        if (current.includes(id)) {
            handleChange(field, current.filter(x => x !== id));
        } else {
            handleChange(field, [...current, id]);
        }
    };

    // Format date for datetime-local input
    const formatDateForInput = (dateString?: string) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toISOString().slice(0, 16);
        } catch {
            return '';
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-20">
            
            {/* Section 1: Basic Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                        <input 
                            required 
                            type="text" 
                            className="w-full border border-gray-300 p-2 rounded" 
                            value={formData.title} 
                            onChange={e => handleChange('title', e.target.value)}
                        />
                    </div>
                    
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea 
                            required 
                            className="w-full border border-gray-300 p-2 rounded h-32" 
                            value={formData.description} 
                            onChange={e => handleChange('description', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost (Leave empty for Free)</label>
                        <input 
                            type="text" 
                            placeholder="e.g. 50" 
                            className="w-full border border-gray-300 p-2 rounded" 
                            value={formData.cost || ''} 
                            onChange={e => handleChange('cost', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select 
                            className="w-full border border-gray-300 p-2 rounded"
                            value={formData.status}
                            onChange={e => handleChange('status', e.target.value)}
                        >
                            <option value={EventStatus.DRAFT}>Draft</option>
                            <option value={EventStatus.PUBLISHED}>Published</option>
                            <option value={EventStatus.SCHEDULED}>Scheduled</option>
                            <option value={EventStatus.CANCELLED}>Cancelled</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
                        <input type="file" onChange={handleFileChange} className="block mt-1" accept="image/*" />
                        {coverPreview && (
                            <img src={coverPreview} alt="Preview" className="mt-4 h-48 w-full object-cover rounded-lg" />
                        )}
                    </div>
                </div>
            </div>

            {/* Section 2: Date & Location */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4">When & Where</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
                        <input 
                            required 
                            type="datetime-local" 
                            className="w-full border border-gray-300 p-2 rounded"
                            value={formatDateForInput(formData.start_date)}
                            onChange={e => handleChange('start_date', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                        <input 
                            required 
                            type="datetime-local" 
                            className="w-full border border-gray-300 p-2 rounded"
                            value={formatDateForInput(formData.end_date)}
                            onChange={e => handleChange('end_date', e.target.value)}
                        />
                    </div>
                    
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                        <input 
                            required 
                            type="text" 
                            placeholder="e.g. Main Hall or Central Park"
                            className="w-full border border-gray-300 p-2 rounded"
                            value={formData.location_name}
                            onChange={e => handleChange('location_name', e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address (Optional)</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 p-2 rounded"
                            value={formData.address}
                            onChange={e => handleChange('address', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Section 3: Targeting (The Logic Engine) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4">Target Audience</h3>
                
                {/* Target Audience Type */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Who is this event for?</label>
                    <div className="flex gap-4">
                        {Object.values(TargetAudience).map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => handleChange('target_audience', type)}
                                className={`px-4 py-2 rounded border ${
                                    formData.target_audience === type 
                                    ? 'bg-blue-600 text-white border-blue-600' 
                                    : 'bg-white text-gray-700 border-gray-300'
                                }`}
                            >
                                {type === 'BOTH' ? 'Youth & Guardians' : type.charAt(0) + type.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <hr className="my-6" />

                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 font-bold">Limit to specific Groups?</label>
                    <p className="text-sm text-gray-500 mb-2">If you select a group, demographic filters below will be ignored.</p>
                    <div className="flex flex-wrap gap-2">
                        {groups.map(group => (
                            <button
                                key={group.id}
                                type="button"
                                onClick={() => toggleSelection('target_groups', group.id)}
                                className={`px-3 py-1 rounded-full text-sm border ${
                                    formData.target_groups?.includes(group.id) 
                                    ? 'bg-blue-100 border-blue-500 text-blue-700' 
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                            >
                                {group.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Hide demographics if groups are selected */}
                {(!formData.target_groups || formData.target_groups.length === 0) && (
                    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-bold text-gray-700 mb-4">Or Filter by Demographics</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Age Range</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        placeholder="Min" 
                                        className="w-20 border border-gray-300 p-2 rounded" 
                                        value={formData.target_min_age || ''} 
                                        onChange={e => handleChange('target_min_age', e.target.value ? parseInt(e.target.value) : undefined)} 
                                    />
                                    <span>to</span>
                                    <input 
                                        type="number" 
                                        placeholder="Max" 
                                        className="w-20 border border-gray-300 p-2 rounded" 
                                        value={formData.target_max_age || ''} 
                                        onChange={e => handleChange('target_max_age', e.target.value ? parseInt(e.target.value) : undefined)} 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Genders</label>
                                <div className="flex gap-2 mt-2">
                                    {['MALE', 'FEMALE', 'OTHER'].map(g => (
                                        <label key={g} className="flex items-center gap-1 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={formData.target_genders?.includes(g) || false}
                                                onChange={(e) => {
                                                    const current = formData.target_genders || [];
                                                    if(e.target.checked) {
                                                        handleChange('target_genders', [...current, g]);
                                                    } else {
                                                        handleChange('target_genders', current.filter(x => x !== g));
                                                    }
                                                }}
                                            />
                                            <span className="text-sm capitalize">{g.toLowerCase()}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Interests</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {interests.map(interest => (
                                    <button
                                        key={interest.id}
                                        type="button"
                                        onClick={() => toggleSelection('target_interests', interest.id)}
                                        className={`px-2 py-1 rounded text-xs border ${
                                            formData.target_interests?.includes(interest.id)
                                            ? 'bg-green-100 border-green-500 text-green-700'
                                            : 'bg-white border-gray-300'
                                        }`}
                                    >
                                        {interest.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Section 4: Registration & Capacity */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4">Registration & Capacity</h3>
                
                <div className="flex items-center gap-2 mb-6">
                    <input 
                        type="checkbox" 
                        id="allowReg"
                        className="w-5 h-5"
                        checked={formData.allow_registration}
                        onChange={e => handleChange('allow_registration', e.target.checked)}
                    />
                    <label htmlFor="allowReg" className="font-bold cursor-pointer">Enable Registration</label>
                </div>

                {formData.allow_registration && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Regular Seats</label>
                                <input 
                                    type="number" 
                                    className="w-full border border-gray-300 p-2 rounded"
                                    value={formData.max_seats}
                                    onChange={e => handleChange('max_seats', parseInt(e.target.value) || 0)}
                                />
                                <p className="text-xs text-gray-500 mt-1">0 = Unlimited</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Waitlist Spots</label>
                                <input 
                                    type="number" 
                                    className="w-full border border-gray-300 p-2 rounded"
                                    value={formData.max_waitlist}
                                    onChange={e => handleChange('max_waitlist', parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div className="space-y-3 p-4 bg-gray-50 rounded">
                            <h4 className="font-bold text-sm">Approval Rules</h4>
                            <label className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    checked={formData.requires_guardian_approval} 
                                    onChange={e => handleChange('requires_guardian_approval', e.target.checked)} 
                                />
                                <span className="text-sm">Requires Guardian Approval</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    checked={formData.requires_admin_approval} 
                                    onChange={e => handleChange('requires_admin_approval', e.target.checked)} 
                                />
                                <span className="text-sm">Requires Admin Approval (Manual review)</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    checked={formData.enable_tickets} 
                                    onChange={e => handleChange('enable_tickets', e.target.checked)} 
                                />
                                <span className="text-sm">Generate Tickets (QR Codes)</span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-4">
                <button 
                    type="button" 
                    onClick={() => router.back()} 
                    className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    disabled={loading} 
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Saving...' : 'Save Event'}
                </button>
            </div>

        </form>
    );
}

