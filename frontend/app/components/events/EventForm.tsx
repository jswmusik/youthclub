'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Event, EventStatus, TargetAudience } from '@/types/event';
import { useAuth } from '@/context/AuthContext';
import { X, Upload, FileText, Search } from 'lucide-react'; // Icons
import { getMediaUrl } from '@/app/utils';

interface EventFormProps {
    initialData?: any; // Using any to accommodate nested images/docs
    scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function EventForm({ initialData, scope }: EventFormProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [clubDetails, setClubDetails] = useState<any>(null); // Store club details to get municipality
    
    // Search States
    const [groupSearch, setGroupSearch] = useState('');
    const [foundGroups, setFoundGroups] = useState<any[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<any[]>([]); // Store full objects
    
    // Interests list
    const [interestsList, setInterestsList] = useState<any[]>([]);

    // Media States
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(
        initialData?.cover_image ? getMediaUrl(initialData.cover_image) : null
    );
    
    // Gallery State (For new uploads)
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    // Existing images from API (when editing)
    const [existingImages, setExistingImages] = useState<any[]>([]);
    // Documents State
    const [docFiles, setDocFiles] = useState<File[]>([]);
    // Existing documents from API (when editing)
    const [existingDocuments, setExistingDocuments] = useState<any[]>([]);

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
        latitude: undefined,
        longitude: undefined,
        is_map_visible: true, // Default true
        video_url: '',
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

    // Fetch interests list
    useEffect(() => {
        api.get('/interests/')
            .then(res => {
                const interests = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setInterestsList(interests);
            })
            .catch(err => {
                console.error('Failed to fetch interests:', err);
            });
    }, []);

    // Fetch club details for club admins to get municipality
    useEffect(() => {
        if (scope === 'CLUB' && user?.assigned_club && !initialData) {
            const clubId = typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club;
            api.get(`/clubs/${clubId}/`)
                .then(res => {
                    setClubDetails(res.data);
                })
                .catch(err => {
                    console.error('Failed to fetch club details:', err);
                });
        }
    }, [scope, user, initialData]);

    useEffect(() => {
        // If editing, fetch existing images and documents
        if (initialData?.id) {
            // Fetch existing images
            api.get(`/event-images/?event=${initialData.id}`)
                .then(res => {
                    const images = Array.isArray(res.data) ? res.data : (res.data.results || []);
                    setExistingImages(images);
                })
                .catch(err => {
                    console.error('Failed to fetch existing images:', err);
                });
            
            // Fetch existing documents
            api.get(`/event-documents/?event=${initialData.id}`)
                .then(res => {
                    const docs = Array.isArray(res.data) ? res.data : (res.data.results || []);
                    console.log('Fetched existing documents:', docs);
                    setExistingDocuments(docs);
                })
                .catch(err => {
                    console.error('Failed to fetch existing documents:', err);
                    console.error('Error details:', err.response?.data);
                });
        }
        
        // If editing, load selected groups
        if (initialData?.target_groups) {
            if (Array.isArray(initialData.target_groups) && initialData.target_groups.length > 0) {
                if (typeof initialData.target_groups[0] === 'object') {
                    // API returned full objects
                    setSelectedGroups(initialData.target_groups);
                } else {
                    // API returned IDs, fetch full group objects
                    const groupIds = initialData.target_groups;
                    Promise.all(groupIds.map((id: number) => 
                        api.get(`/groups/${id}/`).then(res => res.data).catch(() => null)
                    )).then(groups => {
                        setSelectedGroups(groups.filter(Boolean));
                    }).catch(err => {
                        console.error('Failed to fetch group details:', err);
                    });
                }
            }
        }
    }, [initialData]);

    // Clean up object URLs to prevent memory leaks
    useEffect(() => {
        return () => {
            if (coverPreview && coverPreview.startsWith('blob:')) {
                URL.revokeObjectURL(coverPreview);
            }
            galleryFiles.forEach(file => {
                const url = URL.createObjectURL(file);
                URL.revokeObjectURL(url);
            });
        };
    }, [coverPreview, galleryFiles]);

    // --- Search Logic ---
    useEffect(() => {
        const searchGroups = async () => {
            if (groupSearch.length < 2) {
                setFoundGroups([]);
                return;
            }
            try {
                const res = await api.get(`/groups/?search=${encodeURIComponent(groupSearch)}`);
                setFoundGroups(res.data.results || res.data || []);
            } catch (err) {
                console.error(err);
            }
        };
        const timeoutId = setTimeout(searchGroups, 300);
        return () => clearTimeout(timeoutId);
    }, [groupSearch]);

    const handleAddGroup = (group: any) => {
        if (!selectedGroups.find(g => g.id === group.id)) {
            setSelectedGroups([...selectedGroups, group]);
            setFormData(prev => ({
                ...prev,
                target_groups: [...(prev.target_groups || []), group.id]
            }));
        }
        setGroupSearch('');
        setFoundGroups([]);
    };

    const handleRemoveGroup = (id: number) => {
        setSelectedGroups(selectedGroups.filter(g => g.id !== id));
        setFormData(prev => ({
            ...prev,
            target_groups: prev.target_groups?.filter(gid => gid !== id) || []
        }));
    };

    // --- Generic Change Handler ---
    const handleChange = (field: keyof Event, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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

    // Convert datetime-local format to ISO string
    const convertToISO = (dateTimeLocal: string): string => {
        if (!dateTimeLocal) return '';
        // datetime-local format: "2024-01-01T10:00"
        // Convert to ISO: "2024-01-01T10:00:00Z" or with timezone
        const date = new Date(dateTimeLocal);
        return date.toISOString();
    };

    // --- Submit Logic ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            // For club admins creating new events, ensure we have club details
            let currentClubDetails = clubDetails;
            if (!initialData && scope === 'CLUB' && user?.assigned_club && !currentClubDetails) {
                const clubId = typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club;
                try {
                    const res = await api.get(`/clubs/${clubId}/`);
                    currentClubDetails = res.data;
                    setClubDetails(res.data);
                } catch (err) {
                    throw new Error('Failed to load club details. Please refresh and try again.');
                }
            }
            
            const data = new FormData();
            
            // Fields to exclude (read-only or handled separately)
            const excludeFields = [
                'cover_image', 'images', 'documents', 'id', 
                'confirmed_participants_count', 'waitlist_count',
                'municipality_detail', 'club_detail', 'user_registration_status', 'is_full'
            ];
            
            // 1. Basic Fields
            Object.keys(formData).forEach(key => {
                if (excludeFields.includes(key)) return;
                
                const value = formData[key as keyof Event];
                
                // Skip undefined, null, and empty strings for optional fields
                if (value === undefined || value === null) return;
                
                // Handle dates - convert to ISO format
                if (key === 'start_date' || key === 'end_date') {
                    if (value) {
                        const isoDate = convertToISO(value as string);
                        if (isoDate) data.append(key, isoDate);
                    }
                    return;
                }
                
                // Handle arrays (for ManyToMany fields)
                if (Array.isArray(value)) {
                    if (key === 'target_genders' || key === 'target_grades') {
                        // JSON fields - send as JSON string
                        data.append(key, JSON.stringify(value));
                    } else {
                        // ManyToMany fields - send multiple entries
                        value.forEach(item => {
                            if (item !== null && item !== undefined) {
                                data.append(key, item.toString());
                            }
                        });
                    }
                    return;
                }
                
                // Handle booleans
                if (typeof value === 'boolean') {
                    data.append(key, value.toString());
                    return;
                }
                
                // Handle numbers
                if (typeof value === 'number') {
                    data.append(key, value.toString());
                    return;
                }
                
                // Handle strings (skip empty strings for optional fields)
                if (typeof value === 'string') {
                    // Skip empty strings for optional fields
                    const optionalFields = ['address', 'video_url', 'organizer_name', 'custom_welcome_message'];
                    if (value === '' && optionalFields.includes(key)) {
                        return;
                    }
                    // Handle cost - convert empty string to not send it (so it stays null)
                    if (key === 'cost') {
                        if (value === '' || value === '0') {
                            return; // Don't send empty cost
                        }
                        // Validate it's a number
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                            data.append(key, numValue.toString());
                        }
                        return;
                    }
                    data.append(key, value);
                }
            });

            // 2. Cover Image
            if (coverFile) {
                data.append('cover_image', coverFile);
            }

            // 3. Organization Scope (only for new events)
            if (!initialData) {
                if (scope === 'CLUB' && user?.assigned_club) {
                    const clubId = typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club;
                    data.append('club', clubId.toString());
                    
                    // Get municipality from club details (fetched above if needed)
                    let municipalityId: number | null = null;
                    if (currentClubDetails?.municipality) {
                        municipalityId = typeof currentClubDetails.municipality === 'object' 
                            ? currentClubDetails.municipality.id 
                            : currentClubDetails.municipality;
                    } else if ((user.assigned_club as any)?.municipality) {
                        const clubMuni = (user.assigned_club as any).municipality;
                        municipalityId = typeof clubMuni === 'object' ? clubMuni.id : clubMuni;
                    }
                    
                    if (municipalityId) {
                        data.append('municipality', municipalityId.toString());
                    } else {
                        throw new Error('Unable to determine municipality for club. Please refresh and try again.');
                    }
                }
                if (scope === 'MUNICIPALITY' && user?.assigned_municipality) {
                    const muniId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
                    data.append('municipality', muniId.toString());
                }
                // For SUPER_ADMIN, municipality should be set manually or via formData if editing
                // If creating new and no municipality set, this will cause a 400 error
            } else {
                // When editing, preserve existing municipality/club if not in formData
                if (!data.has('municipality') && initialData.municipality) {
                    const muniId = typeof initialData.municipality === 'object' ? initialData.municipality.id : initialData.municipality;
                    data.append('municipality', muniId.toString());
                }
            }

            // 4. Create/Update Event
            let eventId = initialData?.id;
            const config = { headers: { 'Content-Type': 'multipart/form-data' } };
            
            if (eventId) {
                await api.patch(`/events/${eventId}/`, data, config);
            } else {
                const res = await api.post('/events/', data, config);
                eventId = res.data.id;
            }

            // 5. Handle Gallery & Docs (Separate Endpoints)
            // We do this concurrently for speed
            const uploads = [];

            // Upload gallery images
            for (const file of galleryFiles) {
                const fd = new FormData();
                fd.append('image', file);
                fd.append('event', eventId.toString()); // Link to event
                uploads.push(api.post('/event-images/', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                }).catch(e => {
                    console.error("Image upload failed", e);
                    return null;
                }));
            }

            // Upload documents
            for (const file of docFiles) {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('title', file.name);
                fd.append('event', eventId.toString());
                console.log('Uploading document:', file.name, 'for event:', eventId);
                uploads.push(api.post('/event-documents/', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                }).then(res => {
                    console.log('Document uploaded successfully:', res.data);
                    return res;
                }).catch(e => {
                    console.error("Document upload failed", e);
                    console.error("Error details:", e.response?.data);
                    return null;
                }));
            }

            await Promise.all(uploads);

            router.push(`/admin/${scope.toLowerCase()}/events`);
            
        } catch (error: any) {
            console.error('Event creation error:', error);
            
            // Show detailed error message
            let errorMessage = "Something went wrong. Please check your inputs.";
            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (error.response.data.detail) {
                    errorMessage = error.response.data.detail;
                } else if (error.response.data.non_field_errors) {
                    errorMessage = error.response.data.non_field_errors.join(', ');
                } else {
                    // Format field errors
                    const fieldErrors = Object.entries(error.response.data)
                        .map(([field, errors]: [string, any]) => {
                            const errorList = Array.isArray(errors) ? errors.join(', ') : errors;
                            return `${field}: ${errorList}`;
                        })
                        .join('\n');
                    if (fieldErrors) {
                        errorMessage = fieldErrors;
                    }
                }
            }
            
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-20">
            
            {/* Section 1: Basic & Media */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4">Media & Presentation</h3>
                
                {/* Cover Image */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image (Main)</label>
                    <div className="mt-2 flex items-center gap-4">
                        <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden border">
                            {coverPreview ? (
                                <img src={coverPreview} className="w-full h-full object-cover" alt="Cover" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400 text-xs">No Image</div>
                            )}
                        </div>
                        <input type="file" onChange={e => {
                            if(e.target.files?.[0]) {
                                const file = e.target.files[0];
                                // Revoke previous object URL if it exists
                                if (coverPreview && coverPreview.startsWith('blob:')) {
                                    URL.revokeObjectURL(coverPreview);
                                }
                                setCoverFile(file);
                                setCoverPreview(URL.createObjectURL(file));
                            }
                        }} accept="image/*" className="text-sm" />
                    </div>
                </div>

                {/* Video OR Gallery */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">YouTube/Vimeo Link</label>
                        <input 
                            type="url" 
                            placeholder="https://youtube.com/..." 
                            className="w-full border border-gray-300 p-2 rounded"
                            value={formData.video_url || ''}
                            onChange={e => handleChange('video_url', e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">If added, this replaces the gallery.</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Image Gallery (Slideshow)</label>
                        <div className="flex items-center gap-2 mt-1">
                            <label className="cursor-pointer bg-gray-50 border border-dashed border-gray-300 rounded-lg p-2 text-center w-full hover:bg-gray-100">
                                <Upload className="w-5 h-5 mx-auto text-gray-400" />
                                <span className="text-xs text-gray-500">Upload Images</span>
                                <input type="file" multiple accept="image/*" className="hidden" 
                                    onChange={e => {
                                        if (e.target.files) {
                                            const newFiles = Array.from(e.target.files);
                                            setGalleryFiles(prev => [...prev, ...newFiles]);
                                        }
                                    }} 
                                />
                            </label>
                        </div>
                        
                        {/* Existing Images */}
                        {existingImages.length > 0 && (
                            <div className="mt-3 grid grid-cols-4 gap-2">
                                {existingImages.map((img) => (
                                    <div key={img.id} className="relative group">
                                        <img 
                                            src={getMediaUrl(img.image)} 
                                            alt={img.caption || 'Gallery image'} 
                                            className="w-full h-20 object-cover rounded border"
                                        />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    await api.delete(`/event-images/${img.id}/`);
                                                    setExistingImages(prev => prev.filter(i => i.id !== img.id));
                                                } catch (err) {
                                                    console.error('Failed to delete image:', err);
                                                    alert('Failed to delete image');
                                                }
                                            }}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* New Images Preview */}
                        {galleryFiles.length > 0 && (
                            <div className="mt-3">
                                <div className="text-xs text-blue-600 mb-2">{galleryFiles.length} new image(s) selected</div>
                                <div className="grid grid-cols-4 gap-2">
                                    {galleryFiles.map((file, index) => (
                                        <div key={index} className="relative group">
                                            <img 
                                                src={URL.createObjectURL(file)} 
                                                alt={`Preview ${index + 1}`} 
                                                className="w-full h-20 object-cover rounded border"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
                                                }}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Section 2: Basic Info */}
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
                </div>
            </div>

            {/* Section 3: Date & Time */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4">When</h3>
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
                </div>
            </div>

            {/* Section 4: Location & Maps */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                        <input required type="text" className="w-full border border-gray-300 p-2 rounded" 
                            value={formData.location_name} onChange={e => handleChange('location_name', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address (for Map)</label>
                        <input type="text" className="w-full border border-gray-300 p-2 rounded" 
                            value={formData.address} onChange={e => handleChange('address', e.target.value)} />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                        <input type="number" step="any" className="w-full border border-gray-300 p-2 rounded" 
                            value={formData.latitude || ''} onChange={e => handleChange('latitude', e.target.value ? parseFloat(e.target.value) : undefined)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                        <input type="number" step="any" className="w-full border border-gray-300 p-2 rounded" 
                            value={formData.longitude || ''} onChange={e => handleChange('longitude', e.target.value ? parseFloat(e.target.value) : undefined)} />
                    </div>

                    <div className="md:col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.is_map_visible} 
                                onChange={e => handleChange('is_map_visible', e.target.checked)} />
                            <span className="text-sm font-medium">Show Map on Event Page</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Section 5: Targeting (Search & Add) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4">Target Audience</h3>
                
                {/* Target Audience Type */}
                <div className="mb-6 flex gap-4">
                    {Object.values(TargetAudience).map(type => (
                        <button key={type} type="button" onClick={() => handleChange('target_audience', type)}
                            className={`px-4 py-2 rounded border ${formData.target_audience === type ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                            {type === 'BOTH' ? 'Youth & Guardians' : type.charAt(0) + type.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>

                {/* Group Search Widget */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Specific Groups</label>
                    <div className="relative">
                        <div className="flex items-center border border-gray-300 rounded p-2 bg-gray-50">
                            <Search className="text-gray-400 w-4 h-4 mr-2" />
                            <input 
                                type="text" 
                                placeholder="Search for a group..." 
                                className="bg-transparent outline-none w-full text-sm"
                                value={groupSearch}
                                onChange={e => setGroupSearch(e.target.value)}
                            />
                        </div>
                        {/* Search Results Dropdown */}
                        {foundGroups.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 shadow-lg rounded-b z-10 max-h-48 overflow-y-auto mt-1">
                                {foundGroups.map(group => (
                                    <button 
                                        key={group.id} 
                                        type="button"
                                        onClick={() => handleAddGroup(group)}
                                        className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50"
                                    >
                                        {group.name} <span className="text-gray-400 text-xs">({group.municipality_detail?.name || 'Global'})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Groups Chips */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        {selectedGroups.map(group => (
                            <span key={group.id} className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                                {group.name}
                                <button type="button" onClick={() => handleRemoveGroup(group.id)}><X className="w-3 h-3" /></button>
                            </span>
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Grades</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {[7, 8, 9, 10, 11, 12].map(grade => (
                                    <button
                                        key={grade}
                                        type="button"
                                        onClick={() => {
                                            const current = formData.target_grades || [];
                                            if (current.includes(grade)) {
                                                handleChange('target_grades', current.filter(g => g !== grade));
                                            } else {
                                                handleChange('target_grades', [...current, grade]);
                                            }
                                        }}
                                        className={`px-3 py-1 rounded text-sm border ${
                                            formData.target_grades?.includes(grade)
                                                ? 'bg-green-100 border-green-500 text-green-700'
                                                : 'bg-white border-gray-300'
                                        }`}
                                    >
                                        Grade {grade}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Interests</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {interestsList.map(interest => (
                                    <button
                                        key={interest.id}
                                        type="button"
                                        onClick={() => {
                                            const current = formData.target_interests || [];
                                            if (current.includes(interest.id)) {
                                                handleChange('target_interests', current.filter(i => i !== interest.id));
                                            } else {
                                                handleChange('target_interests', [...current, interest.id]);
                                            }
                                        }}
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

            {/* Section 6: Documents */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4">Documents & Attachments</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition">
                    <input type="file" multiple id="doc-upload" className="hidden" 
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                        onChange={e => { 
                            if (e.target.files) {
                                const newFiles = Array.from(e.target.files);
                                setDocFiles(prev => [...prev, ...newFiles]);
                            }
                        }} />
                    <label htmlFor="doc-upload" className="cursor-pointer">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload PDFs, Docs, or Excel files</p>
                    </label>
                </div>
                
                {/* Existing Documents */}
                {existingDocuments.length > 0 && (
                    <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-2">Existing documents:</p>
                        <ul className="space-y-2">
                            {existingDocuments.map((doc) => (
                                <li key={doc.id} className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded border border-gray-200">
                                    <div className="flex items-center gap-2 flex-1">
                                        <FileText className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium">{doc.title}</span>
                                        {doc.description && (
                                            <span className="text-xs text-gray-500">- {doc.description}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {doc.file && (
                                            <a 
                                                href={getMediaUrl(doc.file)} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 text-xs"
                                            >
                                                Download
                                            </a>
                                        )}
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (confirm(`Are you sure you want to delete "${doc.title}"?`)) {
                                                    try {
                                                        await api.delete(`/event-documents/${doc.id}/`);
                                                        setExistingDocuments(prev => prev.filter(d => d.id !== doc.id));
                                                    } catch (err) {
                                                        console.error('Failed to delete document:', err);
                                                        alert('Failed to delete document');
                                                    }
                                                }
                                            }}
                                            className="text-red-500 hover:text-red-700 p-1"
                                            title="Delete document"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                {/* New Documents */}
                {docFiles.length > 0 && (
                    <ul className="mt-4 space-y-2">
                        {docFiles.map((file, i) => (
                            <li key={i} className="flex items-center justify-between text-sm bg-blue-50 p-2 rounded">
                                <span>{file.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDocFiles(prev => prev.filter((_, idx) => idx !== i));
                                        }}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Section 7: Registration & Capacity */}
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
                <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50">
                    {loading ? 'Saving...' : 'Save Event'}
                </button>
            </div>

        </form>
    );
}
