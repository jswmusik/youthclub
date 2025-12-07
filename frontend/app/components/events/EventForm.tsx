'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Event, EventStatus, TargetAudience } from '@/types/event';
import { useAuth } from '@/context/AuthContext';
import { X, Upload, FileText, Search } from 'lucide-react'; // Icons
import { getMediaUrl } from '@/app/utils';
import RichTextEditor from '@/app/components/RichTextEditor';
import Toast from '@/app/components/Toast';

interface EventFormProps {
    initialData?: any; // Using any to accommodate nested images/docs
    scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function EventForm({ initialData, scope }: EventFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
    const [clubDetails, setClubDetails] = useState<any>(null); // Store club details to get municipality
    
    // Super Admin & Municipality Admin Organization Selection States
    const [municipalities, setMunicipalities] = useState<any[]>([]);
    const [allClubs, setAllClubs] = useState<any[]>([]);
    const [eventScope, setEventScope] = useState<'global' | 'municipality' | 'clubs'>('municipality'); // Default to municipality for MUNICIPALITY scope
    const [selectedMunicipality, setSelectedMunicipality] = useState<number | null>(null);
    const [selectedClubs, setSelectedClubs] = useState<number[]>([]); // Only one club should be selected
    const [clubSearch, setClubSearch] = useState('');
    const [showClubDropdown, setShowClubDropdown] = useState(false);
    
    // Search States for Groups
    const [groupSearch, setGroupSearch] = useState('');
    const [groupsList, setGroupsList] = useState<any[]>([]); // Store all groups
    const [selectedGroups, setSelectedGroups] = useState<any[]>([]); // Store full objects
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    
    // Search States for Interests
    const [interestSearch, setInterestSearch] = useState('');
    const [interestsList, setInterestsList] = useState<any[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<any[]>([]); // Store full objects
    const [showInterestDropdown, setShowInterestDropdown] = useState(false);

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
    
    // SEO Media States
    const [ogImageFile, setOgImageFile] = useState<File | null>(null);
    const [ogImagePreview, setOgImagePreview] = useState<string | null>(
        initialData?.og_image ? getMediaUrl(initialData.og_image) : null
    );
    const [twitterImageFile, setTwitterImageFile] = useState<File | null>(null);
    const [twitterImagePreview, setTwitterImagePreview] = useState<string | null>(
        initialData?.twitter_image ? getMediaUrl(initialData.twitter_image) : null
    );
    
    // Track if slug was manually edited
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    
    // SEO section collapsed state (default collapsed)
    const [seoExpanded, setSeoExpanded] = useState(false);

    const [formData, setFormData] = useState<Partial<Event>>({
        title: '',
        description: '',
        status: EventStatus.DRAFT,
        scheduled_publish_date: '',
        target_audience: TargetAudience.YOUTH,
        cost: '',
        start_date: '',
        end_date: '',
        location_name: '',
        address: '',
        latitude: undefined,
        longitude: undefined,
        is_map_visible: true, // Default true
        max_seats: 0,
        max_waitlist: 0,
        allow_registration: true,
        requires_guardian_approval: false,
        requires_admin_approval: false,
        registration_close_date: '',
        enable_tickets: true,
        send_reminders: true,
        target_groups: [],
        target_interests: [],
        target_genders: [],
        target_grades: [],
        is_recurring: false,
        recurrence_pattern: 'NONE',
        recurrence_end_date: '',
        is_global: false,
        slug: '',
        meta_description: '',
        meta_tags: '',
        page_title: '',
        og_title: '',
        og_description: '',
        twitter_card_type: 'summary_large_image',
        twitter_title: '',
        twitter_description: '',
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

    // Fetch all groups list
    useEffect(() => {
        api.get('/groups/')
            .then(res => {
                const groups = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setGroupsList(groups);
            })
            .catch(err => {
                console.error('Failed to fetch groups:', err);
            });
    }, []);

    // Fetch municipalities and clubs for super admin
    useEffect(() => {
        if (scope === 'SUPER') {
            Promise.all([
                api.get('/municipalities/'),
                api.get('/clubs/?page_size=1000')
            ])
                .then(([muniRes, clubsRes]) => {
                    const muniData = Array.isArray(muniRes.data) ? muniRes.data : (muniRes.data.results || []);
                    const clubsData = Array.isArray(clubsRes.data) ? clubsRes.data : (clubsRes.data.results || []);
                    setMunicipalities(muniData);
                    setAllClubs(clubsData);
                })
                .catch(err => {
                    console.error('Failed to fetch municipalities/clubs:', err);
                });
        } else if (scope === 'MUNICIPALITY' && user?.assigned_municipality) {
            // Fetch clubs for municipality admin (filtered by their municipality)
            const muniId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
            api.get(`/clubs/?municipality=${muniId}&page_size=1000`)
                .then(clubsRes => {
                    const clubsData = Array.isArray(clubsRes.data) ? clubsRes.data : (clubsRes.data.results || []);
                    setAllClubs(clubsData);
                    // Set the municipality ID for municipality admins
                    setSelectedMunicipality(muniId);
                })
                .catch(err => {
                    console.error('Failed to fetch clubs:', err);
                });
        }
    }, [scope, user]);

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

    // Initialize event scope and selections when editing
    useEffect(() => {
        if (initialData && (scope === 'SUPER' || scope === 'MUNICIPALITY') && allClubs.length > 0) {
            // Check municipality_detail first (from serializer), then municipality
            const muniId = initialData.municipality_detail?.id 
                || (initialData.municipality && typeof initialData.municipality === 'object' && initialData.municipality !== null 
                    ? initialData.municipality.id 
                    : initialData.municipality);
            const clubId = initialData.club_detail?.id 
                || (initialData.club && typeof initialData.club === 'object' && initialData.club !== null 
                    ? initialData.club.id 
                    : initialData.club);
            
            if (scope === 'SUPER') {
                // Check if it's a global event first
                if (initialData.is_global) {
                    setEventScope('global');
                    if (muniId) {
                        setSelectedMunicipality(muniId);
                    }
                } else if (clubId) {
                    setEventScope('clubs');
                    setSelectedClubs([clubId]);
                    // Set municipality from club or event data
                    if (muniId) {
                        setSelectedMunicipality(muniId);
                    } else {
                        const club = allClubs.find(c => c.id === clubId);
                        if (club?.municipality) {
                            const clubMuniId = (club.municipality && typeof club.municipality === 'object' && club.municipality !== null)
                                ? club.municipality.id 
                                : club.municipality;
                            setSelectedMunicipality(clubMuniId);
                        }
                    }
                } else if (muniId && !clubId) {
                    setEventScope('municipality');
                    setSelectedMunicipality(muniId);
                }
            } else if (scope === 'MUNICIPALITY') {
                // For municipality admins, if club is set, it's a club-specific event
                if (clubId) {
                    setEventScope('clubs');
                    setSelectedClubs([clubId]);
                    if (muniId) {
                        setSelectedMunicipality(muniId);
                    }
                } else {
                    // No club means it's municipality-wide
                    setEventScope('municipality');
                    if (muniId) {
                        setSelectedMunicipality(muniId);
                    }
                }
            }
        }
    }, [initialData, scope, allClubs]);

    // Auto-generate slug on initial load if not present
    useEffect(() => {
        if (!formData.slug && formData.title && !initialData?.slug) {
            setFormData(prev => ({
                ...prev,
                slug: generateSlug(prev.title || '')
            }));
        }
    }, []); // Only run on mount

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
        
        // If editing, load selected interests
        if (initialData?.target_interests) {
            if (Array.isArray(initialData.target_interests) && initialData.target_interests.length > 0) {
                if (typeof initialData.target_interests[0] === 'object') {
                    // API returned full objects
                    setSelectedInterests(initialData.target_interests);
                } else {
                    // API returned IDs, fetch full interest objects
                    const interestIds = initialData.target_interests;
                    Promise.all(interestIds.map((id: number) => 
                        api.get(`/interests/${id}/`).then(res => res.data).catch(() => null)
                    )).then(interests => {
                        setSelectedInterests(interests.filter(Boolean));
                    }).catch(err => {
                        console.error('Failed to fetch interest details:', err);
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
            if (ogImagePreview && ogImagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(ogImagePreview);
            }
            if (twitterImagePreview && twitterImagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(twitterImagePreview);
            }
            galleryFiles.forEach(file => {
                const url = URL.createObjectURL(file);
                URL.revokeObjectURL(url);
            });
        };
    }, [coverPreview, ogImagePreview, twitterImagePreview, galleryFiles]);

    // No need for search effect - we'll filter from groupsList directly

    const handleAddGroup = (group: any) => {
        if (!selectedGroups.find(g => g.id === group.id)) {
            setSelectedGroups([...selectedGroups, group]);
            setFormData(prev => ({
                ...prev,
                target_groups: [...(prev.target_groups || []), group.id]
            }));
        }
        setGroupSearch('');
        setShowGroupDropdown(false);
    };

    const handleRemoveGroup = (id: number) => {
        setSelectedGroups(selectedGroups.filter(g => g.id !== id));
        setFormData(prev => ({
            ...prev,
            target_groups: prev.target_groups?.filter(gid => gid !== id) || []
        }));
    };
    
    // Get filtered groups for dropdown - show all groups, filtered by search term
    const getFilteredGroups = () => {
        // Filter out already selected groups
        const availableGroups = groupsList.filter((g: any) => 
            !selectedGroups.find(sg => sg.id === g.id)
        );
        
        // If there's a search term, filter by it
        if (groupSearch) {
            const searchLower = groupSearch.toLowerCase();
            return availableGroups.filter((group: any) => 
                group.name.toLowerCase().includes(searchLower)
            );
        }
        
        // Return all available groups if no search term
        return availableGroups;
    };

    // --- Search Logic for Interests ---
    useEffect(() => {
        const searchInterests = async () => {
            if (interestSearch.length < 1) {
                return;
            }
            try {
                const res = await api.get(`/interests/?search=${encodeURIComponent(interestSearch)}`);
                const allInterests = res.data.results || res.data || interestsList || [];
                // Filter out already selected interests
                const availableInterests = allInterests.filter((i: any) => 
                    !selectedInterests.find(si => si.id === i.id)
                );
                // Update interests list if needed
                if (interestsList.length === 0) {
                    setInterestsList(allInterests);
                }
            } catch (err) {
                console.error(err);
            }
        };
        const timeoutId = setTimeout(searchInterests, 300);
        return () => clearTimeout(timeoutId);
    }, [interestSearch, selectedInterests]);

    const handleAddInterest = (interest: any) => {
        if (!selectedInterests.find(i => i.id === interest.id)) {
            setSelectedInterests([...selectedInterests, interest]);
            setFormData(prev => ({
                ...prev,
                target_interests: [...(prev.target_interests || []), interest.id]
            }));
        }
        setInterestSearch('');
        setShowInterestDropdown(false);
    };

    const handleRemoveInterest = (id: number) => {
        setSelectedInterests(selectedInterests.filter(i => i.id !== id));
        setFormData(prev => ({
            ...prev,
            target_interests: prev.target_interests?.filter(iid => iid !== id) || []
        }));
    };
    
    // Get filtered interests for dropdown
    const getFilteredInterests = () => {
        if (!interestSearch) {
            // Return all interests that aren't selected
            return interestsList.filter((i: any) => !selectedInterests.find(si => si.id === i.id));
        }
        const searchLower = interestSearch.toLowerCase();
        return interestsList.filter((interest: any) => {
            const matches = interest.name.toLowerCase().includes(searchLower);
            const notSelected = !selectedInterests.find(si => si.id === interest.id);
            return matches && notSelected;
        });
    };

    // Generate slug from title
    const generateSlug = (text: string): string => {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    };

    // --- Generic Change Handler ---
    const handleChange = (field: keyof Event, value: any) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            
            // Auto-generate slug from title if title changes and slug hasn't been manually edited
            if (field === 'title' && !slugManuallyEdited) {
                updated.slug = generateSlug(value);
            }
            
            // When is_recurring is checked, ensure recurrence_pattern is set to a valid value
            if (field === 'is_recurring' && value === true && (!prev.recurrence_pattern || prev.recurrence_pattern === 'NONE')) {
                updated.recurrence_pattern = 'DAILY'; // Default to DAILY when enabling recurrence
            }
            
            // When is_recurring is unchecked, reset recurrence fields
            if (field === 'is_recurring' && value === false) {
                updated.recurrence_pattern = 'NONE';
                updated.recurrence_end_date = '';
            }
            
            return updated;
        });
    };
    
    // Handle slug change (mark as manually edited)
    const handleSlugChange = (value: string) => {
        setSlugManuallyEdited(true);
        handleChange('slug', value);
    };

    // Format date for datetime-local input
    // Converts UTC/ISO datetime from backend to local timezone for display
    const formatDateForInput = (dateString?: string) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            // Get local date components (not UTC)
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            // Return in datetime-local format (YYYY-MM-DDTHH:mm) in local timezone
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch {
            return '';
        }
    };

    // Format date for date input (YYYY-MM-DD)
    const formatDateOnlyForInput = (dateString?: string) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toISOString().slice(0, 10);
        } catch {
            return '';
        }
    };

    // Convert datetime-local format to ISO string
    // datetime-local inputs are in the user's local timezone
    // We need to preserve the exact time the user selected
    const convertToISO = (dateTimeLocal: string): string => {
        if (!dateTimeLocal) return '';
        // datetime-local format: "2024-01-01T10:00" (no timezone info)
        // Parse the datetime-local string
        const [datePart, timePart] = dateTimeLocal.split('T');
        if (!datePart || !timePart) return '';
        
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        // Create a date object in local timezone using the constructor
        // This creates a date representing the exact local time the user selected
        const localDate = new Date(year, month - 1, day, hours, minutes || 0, 0, 0);
        
        // Convert to ISO string (UTC) - this correctly converts local time to UTC
        // The backend (Django with USE_TZ=True) will store this as UTC and convert back to local time when needed
        return localDate.toISOString();
    };

    // --- Submit Logic ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            // Validate recurrence settings
            if (formData.is_recurring) {
                if (!formData.recurrence_pattern || formData.recurrence_pattern === 'NONE') {
                    alert('Please select a recurrence pattern (Daily, Weekly, or Monthly) when creating a recurring event.');
                    setLoading(false);
                    return;
                }
                if (!formData.recurrence_end_date) {
                    alert('Please set an end date for the recurring event series.');
                    setLoading(false);
                    return;
                }
            }

            // Validate super admin and municipality admin organization selection
            if (scope === 'SUPER' || scope === 'MUNICIPALITY') {
                if (scope === 'SUPER' && (eventScope === 'municipality' || eventScope === 'global') && !selectedMunicipality) {
                    alert(`Please select a municipality for the ${eventScope === 'global' ? 'global' : 'municipality'} event`);
                    setLoading(false);
                    return;
                }
                if (eventScope === 'clubs' && selectedClubs.length === 0) {
                    alert('Please select a club for the club event');
                    setLoading(false);
                    return;
                }
                if (eventScope === 'clubs' && selectedClubs.length > 1) {
                    alert('Please select only one club. For multiple clubs, use Municipality-Wide Event instead.');
                    setLoading(false);
                    return;
                }
            }
            
            // Validate registration_close_date
            if (formData.registration_close_date && formData.start_date) {
                const closeDate = new Date(convertToISO(formData.registration_close_date));
                const startDate = new Date(convertToISO(formData.start_date));
                if (closeDate >= startDate) {
                    alert('Registration close date must be before the event start date.');
                    setLoading(false);
                    return;
                }
            }
            
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
            
            // Helper function to safely extract value from potential array
            const extractValue = (val: any): any => {
                if (Array.isArray(val)) {
                    if (val.length === 1) {
                        return val[0];
                    } else if (val.length === 0) {
                        return null;
                    } else {
                        console.warn('Multiple values in array, taking first:', val);
                        return val[0];
                    }
                }
                return val;
            };
            
            // Helper function to safely append to FormData (never append arrays)
            const safeAppend = (formData: FormData, key: string, val: any): void => {
                // First check: if value is an array, extract it BEFORE any string conversion
                if (Array.isArray(val)) {
                    console.error(`CRITICAL ERROR: safeAppend received array for ${key}:`, val);
                    if (val.length === 1) {
                        val = val[0];
                        console.log(`Extracted ${val} from array for ${key}`);
                    } else if (val.length === 0) {
                        return; // Skip empty arrays
                    } else {
                        console.error(`ERROR: Multiple values in array for ${key}:`, val);
                        val = val[0]; // Take first as fallback
                    }
                }
                
                // Second check: if value is a stringified array, extract it
                // This handles cases where arrays were already converted to strings
                if (typeof val === 'string') {
                    const trimmed = val.trim();
                    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                        console.warn(`WARNING: Stringified array detected for ${key}:`, trimmed);
                        try {
                            // Try JSON parsing first (handles '["SCHEDULED"]')
                            const parsed = JSON.parse(trimmed);
                            if (Array.isArray(parsed) && parsed.length === 1) {
                                val = parsed[0];
                                console.log(`Extracted ${val} from JSON stringified array for ${key}`);
                            }
                        } catch (e) {
                            // Not valid JSON, try Python-style parsing
                            try {
                                // Handle Python-style like "['SCHEDULED']"
                                // Remove brackets and quotes
                                const cleaned = trimmed.slice(1, -1).trim();
                                if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
                                    val = cleaned.slice(1, -1);
                                } else if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                                    val = cleaned.slice(1, -1);
                                } else {
                                    val = cleaned;
                                }
                                console.log(`Extracted ${val} from Python-style stringified array for ${key}`);
                            } catch (e2) {
                                console.error(`Failed to parse stringified array for ${key}:`, trimmed);
                            }
                        }
                    }
                }
                
                // Now append the value (guaranteed to not be an array or stringified array)
                if (val !== null && val !== undefined) {
                    const stringValue = typeof val === 'boolean' || typeof val === 'number' 
                        ? val.toString() 
                        : String(val);
                    
                    // Final safety check - ensure we're not appending an array string representation
                    if (stringValue.trim().startsWith('[') && stringValue.trim().endsWith(']')) {
                        console.error(`CRITICAL: About to append array string for ${key}:`, stringValue);
                        // This should never happen, but if it does, try one more extraction
                        const cleaned = stringValue.trim().slice(1, -1).trim();
                        if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
                            formData.append(key, cleaned.slice(1, -1));
                        } else if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                            formData.append(key, cleaned.slice(1, -1));
                        } else {
                            formData.append(key, cleaned);
                        }
                        return;
                    }
                    
                    formData.append(key, stringValue);
                }
            };
            
            // Ensure slug is generated if missing (synchronously, before building FormData)
            const currentFormData: any = { ...formData };
            
            // Clean up any array values that should be strings (fix for incorrectly wrapped values)
            // This handles cases where values are incorrectly stored as arrays
            const arrayFields = ['target_groups', 'target_interests', 'target_genders', 'target_grades'];
            Object.keys(currentFormData).forEach(key => {
                const val = currentFormData[key];
                if (!arrayFields.includes(key)) {
                    // Extract value from potential array for non-array fields
                    if (Array.isArray(val)) {
                        if (val.length === 1) {
                            currentFormData[key] = val[0];
                            console.log(`Cleaned up ${key}: extracted ${val[0]} from array`);
                        } else if (val.length === 0) {
                            // Set to appropriate default based on field type
                            if (key === 'target_audience') {
                                currentFormData[key] = TargetAudience.YOUTH;
                            } else if (key === 'status') {
                                currentFormData[key] = EventStatus.DRAFT;
                            } else if (key === 'recurrence_pattern') {
                                currentFormData[key] = 'NONE';
                            } else {
                                currentFormData[key] = '';
                            }
                        } else {
                            // Multiple values - take first
                            currentFormData[key] = val[0];
                            console.warn(`Multiple values in array for ${key}, taking first:`, val[0]);
                        }
                    } else if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
                        // Handle stringified arrays (e.g., "['SCHEDULED']")
                        try {
                            const parsed = JSON.parse(val);
                            if (Array.isArray(parsed) && parsed.length === 1) {
                                currentFormData[key] = parsed[0];
                                console.log(`Cleaned up ${key}: extracted ${parsed[0]} from stringified array`);
                            }
                        } catch (e) {
                            // Not valid JSON, keep original value
                        }
                    }
                }
            });
            
            // Debug: Log problematic fields after cleanup
            const problematicFields = ['status', 'recurrence_pattern', 'target_audience', 'municipality', 'club', 'title', 'description', 'slug', 'is_recurring', 'is_global', 'allow_registration'];
            console.log('=== FormData Cleanup Debug (AFTER CLEANUP) ===');
            problematicFields.forEach(field => {
                if (currentFormData[field] !== undefined) {
                    const val = currentFormData[field];
                    console.log(`${field}:`, {
                        type: typeof val,
                        value: val,
                        isArray: Array.isArray(val),
                        stringified: String(val)
                    });
                }
            });
            
            // Also log the raw formData to see what we started with
            console.log('=== Raw formData (BEFORE CLEANUP) ===');
            problematicFields.forEach(field => {
                if (formData[field as keyof typeof formData] !== undefined) {
                    const val = formData[field as keyof typeof formData];
                    console.log(`${field}:`, {
                        type: typeof val,
                        value: val,
                        isArray: Array.isArray(val)
                    });
                }
            });
            
            if (!currentFormData.slug && currentFormData.title) {
                currentFormData.slug = generateSlug(currentFormData.title);
                // Update state for UI consistency
                setFormData(prev => ({ ...prev, slug: currentFormData.slug }));
            }
            
            // Ensure recurrence_pattern is set correctly if is_recurring is true
            if (currentFormData.is_recurring && (!currentFormData.recurrence_pattern || currentFormData.recurrence_pattern === 'NONE')) {
                currentFormData.recurrence_pattern = 'DAILY'; // Default to DAILY
            }
            
            // Fields to exclude (read-only or handled separately)
            const excludeFields = [
                'cover_image', 'og_image', 'twitter_image', 'images', 'documents', 'id', 
                'confirmed_participants_count', 'waitlist_count',
                'municipality_detail', 'club_detail', 'user_registration_status', 'is_full'
            ];
            
            // 1. Basic Fields
            Object.keys(currentFormData).forEach(key => {
                if (excludeFields.includes(key)) return;
                
                let value = currentFormData[key as keyof Event];
                
                // Skip undefined, null
                if (value === undefined || value === null) return;
                
                // Final safety check: if value is still an array for non-array fields, extract it
                if (Array.isArray(value) && !['target_groups', 'target_interests', 'target_genders', 'target_grades'].includes(key)) {
                    if (value.length === 1) {
                        value = value[0] as any;
                        console.warn(`Extracted array value for ${key}:`, value);
                    } else if (value.length === 0) {
                        // Skip empty arrays for non-array fields
                        return;
                    } else {
                        console.error(`Multiple values in array for non-array field ${key}:`, value);
                        // Take first value as fallback
                        value = value[0] as any;
                    }
                }
                
                // Handle dates - convert to ISO format
                if (key === 'start_date' || key === 'end_date' || key === 'registration_close_date') {
                    if (value) {
                        const isoDate = convertToISO(value as string);
                        if (isoDate) safeAppend(data, key, isoDate);
                    }
                    return;
                }
                
                // Handle recurrence_end_date (date-only field, not datetime)
                if (key === 'recurrence_end_date') {
                    // Always send recurrence_end_date if is_recurring is true (it's required)
                    const isRecurring = currentFormData.is_recurring || formData.is_recurring;
                    if (isRecurring && value) {
                        // recurrence_end_date is a date-only field, so we need to format it as YYYY-MM-DD
                        // The value from the date input is already in YYYY-MM-DD format
                        safeAppend(data, key, value);
                    } else if (isRecurring && !value) {
                        // If recurring but no end date, this will cause validation error on backend
                        // But we should still try to send it so backend can give proper error
                        console.warn('recurrence_end_date is required for recurring events but was not provided');
                    }
                    return;
                }
                
                // Handle scheduled_publish_date - only send if status is SCHEDULED
                if (key === 'scheduled_publish_date') {
                    // Only send scheduled_publish_date if status is SCHEDULED
                    const formStatus = currentFormData.status || formData.status;
                    if (formStatus === EventStatus.SCHEDULED && value) {
                        const isoDate = convertToISO(value as string);
                        if (isoDate) safeAppend(data, key, isoDate);
                    }
                    // Don't send it if status is not SCHEDULED
                    return;
                }
                
                // Handle arrays (for ManyToMany fields)
                if (Array.isArray(value)) {
                    const arrayFields = ['target_groups', 'target_interests', 'target_genders', 'target_grades'];
                    
                    // If it's NOT supposed to be an array field, extract the value
                    if (!arrayFields.includes(key)) {
                        console.error(`ERROR: ${key} is an array but should not be! Value:`, value);
                        if (value.length === 1) {
                            // Extract single value from array
                            const extracted = value[0];
                            console.warn(`Extracting array value for ${key}:`, extracted);
                            safeAppend(data, key, extracted);
                            return;
                        } else if (value.length === 0) {
                            // Skip empty arrays for non-array fields
                            return;
                        } else {
                            console.error(`Multiple values in array for non-array field ${key}:`, value);
                            // Take first value as fallback
                            safeAppend(data, key, value[0]);
                            return;
                        }
                    }
                    
                    // Handle legitimate array fields
                    if (key === 'target_genders' || key === 'target_grades') {
                        // JSON fields - send as JSON string
                        data.append(key, JSON.stringify(value));
                    } else if (key === 'target_groups' || key === 'target_interests') {
                        // ManyToMany fields - send multiple entries
                        value.forEach(item => {
                            if (item !== null && item !== undefined) {
                                const itemId = typeof item === 'object' && item !== null && 'id' in item ? item.id : item;
                                data.append(key, itemId.toString());
                            }
                        });
                    } else {
                        // For other array fields, send as multiple entries
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
                    safeAppend(data, key, value);
                    return;
                }
                
                // Handle numbers
                if (typeof value === 'number') {
                    safeAppend(data, key, value);
                    return;
                }
                
                // Handle strings (skip empty strings for optional fields)
                if (typeof value === 'string') {
                    // Skip empty strings for optional fields
                    const optionalFields = [
                        'address', 'organizer_name', 'custom_welcome_message',
                        'meta_description', 'meta_tags', 'page_title', 'og_title', 'og_description',
                        'twitter_title', 'twitter_description', 'scheduled_publish_date'
                    ];
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
                            safeAppend(data, key, numValue);
                        }
                        return;
                    }
                    // Slug is required, so always send it
                    if (key === 'slug') {
                        safeAppend(data, key, value);
                        return;
                    }
                    safeAppend(data, key, value);
                    return;
                }
                
                // If we get here and value is not handled, log a warning and try to convert it
                if (value !== undefined && value !== null && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean' && !Array.isArray(value)) {
                    console.warn(`Unhandled value type for field ${key}:`, typeof value, value);
                    // Try to convert to string as fallback
                    safeAppend(data, key, value);
                }
            });

            // 2. Cover Image
            if (coverFile) {
                data.append('cover_image', coverFile);
            }
            
            // 2b. SEO Images
            if (ogImageFile) {
                data.append('og_image', ogImageFile);
            }
            if (twitterImageFile) {
                data.append('twitter_image', twitterImageFile);
            }

            // 3. Organization Scope (for new events and when editing)
            if (!initialData) {
                if (scope === 'CLUB' && user?.assigned_club) {
                    const clubId = typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club;
                    safeAppend(data, 'club', clubId);
                    
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
                        safeAppend(data, 'municipality', municipalityId);
                    } else {
                        throw new Error('Unable to determine municipality for club. Please refresh and try again.');
                    }
                }
                // For MUNICIPALITY_ADMIN, set municipality/club based on user selection
                if (scope === 'MUNICIPALITY' && user?.assigned_municipality) {
                    const muniId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
                    if (eventScope === 'municipality') {
                        // Municipality-wide event
                        safeAppend(data, 'municipality', muniId);
                    } else if (eventScope === 'clubs' && selectedClubs.length > 0) {
                        // Club-specific event(s)
                        // Set municipality
                        safeAppend(data, 'municipality', muniId);
                        // Set the first selected club (if multiple, only first is used)
                        safeAppend(data, 'club', selectedClubs[0]);
                    } else {
                        // Default to municipality-wide if scope not set
                        safeAppend(data, 'municipality', muniId);
                    }
                }
                // For SUPER_ADMIN, set municipality/club based on user selection
                if (scope === 'SUPER') {
                    if (eventScope === 'global' && selectedMunicipality) {
                        // Global events still need a municipality (required by DB), but is_global=True makes it visible to everyone
                        safeAppend(data, 'municipality', selectedMunicipality);
                        safeAppend(data, 'is_global', true);
                    } else if (eventScope === 'municipality' && selectedMunicipality) {
                        safeAppend(data, 'municipality', selectedMunicipality);
                        safeAppend(data, 'is_global', false);
                    } else if (eventScope === 'clubs' && selectedClubs.length > 0) {
                        // For clubs selection, create event for the first selected club
                        // Note: If multiple clubs are selected, only the first one will be used
                        // To create events for multiple clubs, create separate events
                        const firstClub = allClubs.find(c => c.id === selectedClubs[0]);
                        if (firstClub) {
                            const clubMuniId = typeof firstClub.municipality === 'object' 
                                ? firstClub.municipality.id 
                                : firstClub.municipality;
                            if (clubMuniId) {
                                safeAppend(data, 'municipality', clubMuniId);
                            }
                            safeAppend(data, 'club', selectedClubs[0]);
                            safeAppend(data, 'is_global', false);
                        }
                    }
                }
            } else {
                // When editing, allow changing scope for SUPER and MUNICIPALITY admins
                if (scope === 'SUPER' || scope === 'MUNICIPALITY') {
                    // Apply scope changes if user has selected a different scope
                    if (scope === 'MUNICIPALITY' && user?.assigned_municipality) {
                        const muniId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
                        if (eventScope === 'municipality') {
                            // Municipality-wide event - clear club
                            safeAppend(data, 'municipality', muniId);
                            // To clear club, we need to send it explicitly - backend should handle empty string as null
                            // Check if club was previously set and we want to clear it
                            const hadClub = initialData.club && (
                                (typeof initialData.club === 'object' && initialData.club !== null) || 
                                (typeof initialData.club === 'number' && initialData.club !== null)
                            );
                            if (hadClub) {
                                // Send empty string - backend serializer should handle this as null
                                safeAppend(data, 'club', '');
                            }
                        } else if (eventScope === 'clubs' && selectedClubs.length > 0) {
                            // Club-specific event
                            safeAppend(data, 'municipality', muniId);
                            safeAppend(data, 'club', selectedClubs[0]);
                        } else {
                            // Default to municipality-wide if scope not set
                            safeAppend(data, 'municipality', muniId);
                        }
                    } else if (scope === 'SUPER') {
                        if (eventScope === 'global' && selectedMunicipality) {
                            // Global events still need a municipality (required by DB), but is_global=True makes it visible to everyone
                            safeAppend(data, 'municipality', selectedMunicipality);
                            safeAppend(data, 'is_global', true);
                            // Clear club if it was set
                            const hadClub = initialData.club && (
                                (typeof initialData.club === 'object' && initialData.club !== null) || 
                                (typeof initialData.club === 'number' && initialData.club !== null)
                            );
                            if (hadClub) {
                                safeAppend(data, 'club', '');
                            }
                        } else if (eventScope === 'municipality' && selectedMunicipality) {
                            safeAppend(data, 'municipality', selectedMunicipality);
                            safeAppend(data, 'is_global', false);
                            // Clear club if it was set
                            const hadClub = initialData.club && (
                                (typeof initialData.club === 'object' && initialData.club !== null) || 
                                (typeof initialData.club === 'number' && initialData.club !== null)
                            );
                            if (hadClub) {
                                safeAppend(data, 'club', '');
                            }
                        } else if (eventScope === 'clubs' && selectedClubs.length > 0) {
                            const firstClub = allClubs.find(c => c.id === selectedClubs[0]);
                            if (firstClub) {
                                const clubMuniId = typeof firstClub.municipality === 'object' 
                                    ? firstClub.municipality.id 
                                    : firstClub.municipality;
                                if (clubMuniId) {
                                    safeAppend(data, 'municipality', clubMuniId);
                                }
                                safeAppend(data, 'club', selectedClubs[0]);
                                safeAppend(data, 'is_global', false);
                            }
                        }
                    }
                } else {
                    // For CLUB admins, preserve existing municipality/club
                    if (!data.has('municipality') && initialData.municipality) {
                        const muniId = (initialData.municipality && typeof initialData.municipality === 'object' && initialData.municipality !== null)
                            ? initialData.municipality.id 
                            : initialData.municipality;
                        if (muniId) {
                            safeAppend(data, 'municipality', muniId);
                        }
                    }
                    if (!data.has('club') && initialData.club) {
                        const clubId = (initialData.club && typeof initialData.club === 'object' && initialData.club !== null)
                            ? initialData.club.id 
                            : initialData.club;
                        if (clubId) {
                            safeAppend(data, 'club', clubId);
                        }
                    }
                }
            }

            // 4. Final validation - ensure no arrays are being sent
            console.log('=== Final FormData Validation ===');
            const formDataEntries: Array<[string, any]> = [];
            for (const [key, value] of data.entries()) {
                formDataEntries.push([key, value]);
                if (Array.isArray(value)) {
                    console.error(`CRITICAL: FormData contains array for ${key}:`, value);
                } else if (typeof value === 'string' && value.trim().startsWith('[') && value.trim().endsWith(']')) {
                    console.error(`CRITICAL: FormData contains stringified array for ${key}:`, value);
                }
            }
            console.log('FormData entries:', formDataEntries.slice(0, 20)); // Log first 20 entries
            
            // 5. Create/Update Event
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

            // Show success toast
            setToast({ 
                message: initialData ? 'Event updated successfully!' : 'Event created successfully!', 
                type: 'success' 
            });

            // Build URL with preserved query parameters
            const basePath = `/admin/${scope.toLowerCase()}/events`;
            const page = searchParams.get('page');
            const search = searchParams.get('search');
            const status = searchParams.get('status');
            const recurring = searchParams.get('recurring');
            const club = searchParams.get('club');
            
            const params = new URLSearchParams();
            if (page) params.set('page', page);
            if (search) params.set('search', search);
            if (status) params.set('status', status);
            if (recurring) params.set('recurring', recurring);
            if (club) params.set('club', club);
            
            const queryString = params.toString();
            const redirectUrl = queryString ? `${basePath}?${queryString}` : basePath;
            
            // Navigate after a short delay to show the toast
            setTimeout(() => {
                router.push(redirectUrl);
            }, 500);
            
        } catch (error: any) {
            console.error('Event creation error:', error);
            console.error('Error response:', error.response);
            console.error('Error response data:', error.response?.data);
            console.error('Error response status:', error.response?.status);
            
            // Show detailed error message
            let errorMessage = "Something went wrong. Please check your inputs.";
            if (error.response?.data) {
                console.error('Full error data:', JSON.stringify(error.response.data, null, 2));
                
                if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                    if (error.response.data.detail) {
                        errorMessage += `\n${error.response.data.detail}`;
                    }
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
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
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

                {/* Image Gallery */}
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
                        <RichTextEditor
                            value={formData.description || ''}
                            onChange={(content) => handleChange('description', content)}
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
                
                {/* Show scheduled publish date when status is SCHEDULED */}
                {formData.status === EventStatus.SCHEDULED && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Schedule Publish Date & Time <span className="text-red-500">*</span>
                        </label>
                        <input 
                            required={formData.status === EventStatus.SCHEDULED}
                            type="datetime-local" 
                            className="w-full border border-gray-300 p-2 rounded"
                            value={formatDateForInput(formData.scheduled_publish_date)}
                            onChange={e => handleChange('scheduled_publish_date', e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">The event will be automatically published at this date and time</p>
                    </div>
                )}
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

            {/* Section: Recurrence */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Recurring Event</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={formData.is_recurring || false} 
                            onChange={e => handleChange('is_recurring', e.target.checked)} 
                            className="w-5 h-5 text-blue-600 rounded"
                        />
                        <span className="text-sm font-medium">Repeat this event</span>
                    </label>
                </div>

                {formData.is_recurring && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 rounded-lg border border-blue-100 animate-in fade-in">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Pattern</label>
                            <select 
                                className="w-full border border-gray-300 p-2 rounded"
                                value={formData.recurrence_pattern || 'NONE'}
                                onChange={e => handleChange('recurrence_pattern', e.target.value)}
                            >
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Until (End Date)</label>
                            <input 
                                type="date" 
                                required={formData.is_recurring}
                                className="w-full border border-gray-300 p-2 rounded"
                                value={formData.recurrence_end_date ? formatDateOnlyForInput(formData.recurrence_end_date) : ''}
                                onChange={e => handleChange('recurrence_end_date', e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Instances will be created from the start date until this date.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Section 3.5: Organization Scope (Super Admin & Municipality Admin) */}
            {(scope === 'SUPER' || scope === 'MUNICIPALITY') && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold mb-4">Event Scope</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        {scope === 'SUPER' 
                            ? 'Choose where this event will be visible and available'
                            : 'Choose if this event is for all clubs in your municipality or specific clubs'}
                    </p>
                    
                    {/* Scope Type Selection */}
                    <div className="mb-6 flex gap-4">
                        {scope === 'SUPER' && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEventScope('global');
                                    setSelectedClubs([]);
                                    // Don't clear selectedMunicipality - it's still needed for global events
                                }}
                                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                                    eventScope === 'global'
                                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Global Event
                                <div className="text-xs text-gray-500 mt-1 font-normal">All municipalities and clubs</div>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setEventScope('municipality');
                                setSelectedClubs([]);
                            }}
                            className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                                eventScope === 'municipality'
                                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {scope === 'SUPER' ? 'Municipality Event' : 'Municipality-Wide Event'}
                            <div className="text-xs text-gray-500 mt-1 font-normal">
                                {scope === 'SUPER' ? 'Specific municipality' : 'All clubs in your municipality'}
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setEventScope('clubs');
                            }}
                            className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                                eventScope === 'clubs'
                                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Club Event(s)
                            <div className="text-xs text-gray-500 mt-1 font-normal">
                                {scope === 'SUPER' ? 'Specific clubs' : 'Specific clubs in your municipality'}
                            </div>
                        </button>
                    </div>

                    {/* Municipality Selection (Super Admin Only) */}
                    {(eventScope === 'municipality' || eventScope === 'global') && scope === 'SUPER' && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Municipality
                                {eventScope === 'global' && (
                                    <span className="text-xs text-gray-500 font-normal ml-2">(Required for organizational purposes)</span>
                                )}
                            </label>
                            <select
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={selectedMunicipality || ''}
                                onChange={(e) => {
                                    const muniId = e.target.value ? Number(e.target.value) : null;
                                    setSelectedMunicipality(muniId);
                                    setSelectedClubs([]);
                                }}
                                required={eventScope === 'global' || eventScope === 'municipality'}
                            >
                                <option value="">Select a municipality...</option>
                                {municipalities.map((muni) => (
                                    <option key={muni.id} value={muni.id}>
                                        {muni.name}
                                    </option>
                                ))}
                            </select>
                            {eventScope === 'global' && selectedMunicipality && (
                                <p className="text-xs text-blue-600 mt-2">
                                    This event will be visible to all municipalities and clubs, regardless of the selected municipality.
                                </p>
                            )}
                        </div>
                    )}
                    {/* Municipality-wide info for Municipality Admin */}
                    {eventScope === 'municipality' && scope === 'MUNICIPALITY' && selectedMunicipality && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>Municipality-wide:</strong> This event will be visible to all clubs in your municipality.
                            </p>
                        </div>
                    )}

                    {/* Clubs Selection */}
                    {eventScope === 'clubs' && (
                        <div className="mb-4">
                            {/* Municipality filter (Super Admin only) */}
                            {scope === 'SUPER' && (
                                <>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Municipality (to filter clubs)</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg p-2.5 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={selectedMunicipality || ''}
                                        onChange={(e) => {
                                            const muniId = e.target.value ? Number(e.target.value) : null;
                                            setSelectedMunicipality(muniId);
                                            setSelectedClubs([]);
                                        }}
                                    >
                                        <option value="">All municipalities</option>
                                        {municipalities.map((muni) => (
                                            <option key={muni.id} value={muni.id}>
                                                {muni.name}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}

                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Club</label>
                            <p className="text-xs text-gray-500 mb-2">Select one club. For multiple clubs, use Municipality-Wide Event instead.</p>
                            
                            {/* Selected Clubs Display */}
                            {selectedClubs.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    {selectedClubs.map(clubId => {
                                        const club = allClubs.find(c => c.id === clubId);
                                        if (!club) return null;
                                        return (
                                            <span 
                                                key={clubId}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-full font-medium"
                                            >
                                                {club.name}
                                                {club.municipality_detail?.name && (
                                                    <span className="text-xs opacity-75">({club.municipality_detail.name})</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedClubs(prev => prev.filter(id => id !== clubId));
                                                    }}
                                                    className="hover:bg-blue-700 rounded-full p-0.5 transition-colors"
                                                    aria-label={`Remove ${club.name}`}
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Searchable Club Dropdown */}
                            <div className="relative">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search clubs by name..."
                                        value={clubSearch}
                                        onChange={(e) => {
                                            setClubSearch(e.target.value);
                                            setShowClubDropdown(true);
                                        }}
                                        onFocus={() => setShowClubDropdown(true)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <Search 
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                                    />
                                </div>

                                {/* Dropdown List */}
                                {showClubDropdown && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-10" 
                                            onClick={() => setShowClubDropdown(false)}
                                        />
                                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {(() => {
                                                // Filter clubs based on search and municipality
                                                let filteredClubs = allClubs.filter(club => {
                                                    // Filter by municipality if selected
                                                    if (selectedMunicipality) {
                                                        const clubMuniId = typeof club.municipality === 'object' 
                                                            ? club.municipality.id 
                                                            : club.municipality;
                                                        if (clubMuniId !== selectedMunicipality) {
                                                            return false;
                                                        }
                                                    }
                                                    
                                                    // Filter by search term
                                                    if (clubSearch) {
                                                        const searchLower = clubSearch.toLowerCase();
                                                        return club.name.toLowerCase().includes(searchLower);
                                                    }
                                                    
                                                    return true;
                                                });

                                                // Exclude already selected clubs
                                                filteredClubs = filteredClubs.filter(club => !selectedClubs.includes(club.id));

                                                if (filteredClubs.length === 0) {
                                                    return (
                                                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                            {clubSearch 
                                                                ? `No clubs found matching "${clubSearch}"`
                                                                : selectedMunicipality
                                                                    ? 'No clubs available in this municipality'
                                                                    : 'No clubs available'}
                                                        </div>
                                                    );
                                                }

                                                return filteredClubs.map(club => (
                                                    <button
                                                        key={club.id}
                                                        type="button"
                                                        onClick={() => {
                                                            // Only allow selecting one club - replace if one already selected
                                                            setSelectedClubs([club.id]);
                                                            setClubSearch('');
                                                            setShowClubDropdown(false);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                                                    >
                                                        <div className="font-medium text-gray-900">{club.name}</div>
                                                        {club.municipality_detail?.name && (
                                                            <div className="text-xs text-gray-500">{club.municipality_detail.name}</div>
                                                        )}
                                                    </button>
                                                ));
                                            })()}
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            {/* Info about club selection */}
                            {selectedClubs.length > 0 && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        <strong>Note:</strong> This event will only be visible to members of <strong>{allClubs.find(c => c.id === selectedClubs[0])?.name}</strong>. 
                                        If you want members from multiple clubs to join, create a <strong>Municipality-Wide Event</strong> instead.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

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

                {/* Group Search Widget - Matching Guardian Pattern */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Specific Groups</label>
                    
                    {/* Selected Groups Display */}
                    {selectedGroups.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            {selectedGroups.map(group => (
                                <span 
                                    key={group.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-full font-medium"
                                >
                                    {group.name}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveGroup(group.id)}
                                        className="hover:bg-blue-700 rounded-full p-0.5 transition-colors"
                                        aria-label={`Remove ${group.name}`}
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Searchable Dropdown */}
                    <div className="relative">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search groups by name..."
                                value={groupSearch}
                                onChange={(e) => {
                                    setGroupSearch(e.target.value);
                                    setShowGroupDropdown(true);
                                }}
                                onFocus={() => setShowGroupDropdown(true)}
                                className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <Search 
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                            />
                        </div>

                        {/* Dropdown List */}
                        {showGroupDropdown && (
                            <>
                                <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setShowGroupDropdown(false)}
                                ></div>
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {getFilteredGroups().length > 0 ? (
                                        getFilteredGroups().map(group => (
                                            <button
                                                key={group.id}
                                                type="button"
                                                onClick={() => handleAddGroup(group)}
                                                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                                            >
                                                <div className="font-medium text-gray-900">{group.name}</div>
                                                {group.municipality_detail?.name && (
                                                    <div className="text-xs text-gray-500">{group.municipality_detail.name}</div>
                                                )}
                                            </button>
                                        ))
                                    ) : groupSearch ? (
                                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                            No groups found matching "{groupSearch}"
                                        </div>
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                            {selectedGroups.length === 0 
                                                ? groupsList.length === 0
                                                    ? 'No groups available.'
                                                    : 'All groups are shown below. Start typing to filter.'
                                                : 'All groups are already selected.'}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
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
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(grade => (
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
                            
                            {/* Selected Interests Display */}
                            {selectedInterests.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    {selectedInterests.map(interest => (
                                        <span 
                                            key={interest.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-full font-medium"
                                        >
                                            {interest.name}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveInterest(interest.id)}
                                                className="hover:bg-purple-700 rounded-full p-0.5 transition-colors"
                                                aria-label={`Remove ${interest.name}`}
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Searchable Dropdown */}
                            <div className="relative">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search interests by name..."
                                        value={interestSearch}
                                        onChange={(e) => {
                                            setInterestSearch(e.target.value);
                                            setShowInterestDropdown(true);
                                        }}
                                        onFocus={() => setShowInterestDropdown(true)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                    <Search 
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                                    />
                                </div>

                                {/* Dropdown List */}
                                {showInterestDropdown && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-10" 
                                            onClick={() => setShowInterestDropdown(false)}
                                        ></div>
                                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {getFilteredInterests().length > 0 ? (
                                                getFilteredInterests().map(interest => (
                                                    <button
                                                        key={interest.id}
                                                        type="button"
                                                        onClick={() => handleAddInterest(interest)}
                                                        className="w-full text-left px-4 py-2.5 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
                                                    >
                                                        <div className="font-medium text-gray-900">{interest.name}</div>
                                                    </button>
                                                ))
                                            ) : interestSearch ? (
                                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                    No interests found matching "{interestSearch}"
                                                </div>
                                            ) : (
                                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                    {selectedInterests.length === 0 
                                                        ? 'Start typing to search for interests...'
                                                        : 'All matching interests are already selected.'}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Registration Closes</label>
                            <input 
                                type="datetime-local" 
                                className="w-full border border-gray-300 p-2 rounded"
                                value={formatDateForInput(formData.registration_close_date)}
                                onChange={e => handleChange('registration_close_date', e.target.value)}
                                max={formData.start_date ? formatDateForInput(formData.start_date) : undefined}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {formData.registration_close_date 
                                    ? 'Members can apply until this date and time.'
                                    : 'If no date/time is specified, members can apply until the event starts. Registration opens when the event is published.'}
                            </p>
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

            {/* Section: SEO Settings - Collapsible at bottom */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                    type="button"
                    onClick={() => setSeoExpanded(!seoExpanded)}
                    className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="text-lg font-bold">SEO Settings</h3>
                    <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${seoExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                
                {seoExpanded && (
                    <div className="px-6 pb-6 border-t border-gray-100">
                        <div className="space-y-6 pt-6">
                            {/* Slug */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    URL Slug <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    required
                                    type="text" 
                                    className="w-full border border-gray-300 p-2 rounded" 
                                    value={formData.slug || ''} 
                                    onChange={e => handleSlugChange(e.target.value)}
                                    placeholder="Auto-generated from title"
                                />
                                <p className="text-xs text-gray-500 mt-1">URL-friendly version of the title (auto-generated, but editable)</p>
                            </div>

                            {/* Meta Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                                <textarea 
                                    className="w-full border border-gray-300 p-2 rounded h-24" 
                                    value={formData.meta_description || ''} 
                                    onChange={e => handleChange('meta_description', e.target.value)}
                                    placeholder="Brief description for search engines (recommended: 150-160 characters)"
                                    maxLength={500}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {formData.meta_description?.length || 0}/500 characters
                                </p>
                            </div>

                            {/* Meta Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Tags</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-300 p-2 rounded" 
                                    value={formData.meta_tags || ''} 
                                    onChange={e => handleChange('meta_tags', e.target.value)}
                                    placeholder="Comma-separated keywords (e.g., event, youth, activities)"
                                />
                                <p className="text-xs text-gray-500 mt-1">Comma-separated keywords for search engines</p>
                            </div>

                            {/* Page Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-300 p-2 rounded" 
                                    value={formData.page_title || ''} 
                                    onChange={e => handleChange('page_title', e.target.value)}
                                    placeholder="Custom page title (defaults to event title if not set)"
                                    maxLength={255}
                                />
                                <p className="text-xs text-gray-500 mt-1">Custom title for the browser tab (optional)</p>
                            </div>

                            {/* Social Media Section */}
                            <div className="border-t pt-6 mt-6">
                                <h4 className="text-md font-semibold mb-4">Social Media Sharing</h4>
                                
                                {/* Open Graph */}
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                    <h5 className="text-sm font-medium mb-3 text-gray-700">Open Graph (Facebook, LinkedIn, etc.)</h5>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">OG Title</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-gray-300 p-2 rounded" 
                                                value={formData.og_title || ''} 
                                                onChange={e => handleChange('og_title', e.target.value)}
                                                placeholder="Title for social media sharing"
                                                maxLength={255}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">OG Description</label>
                                            <textarea 
                                                className="w-full border border-gray-300 p-2 rounded h-20" 
                                                value={formData.og_description || ''} 
                                                onChange={e => handleChange('og_description', e.target.value)}
                                                placeholder="Description for social media sharing"
                                                maxLength={500}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">OG Image</label>
                                            <div className="flex items-center gap-4">
                                                <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden border">
                                                    {ogImagePreview ? (
                                                        <img src={ogImagePreview} className="w-full h-full object-cover" alt="OG Preview" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-gray-400 text-xs">No Image</div>
                                                    )}
                                                </div>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="text-sm" 
                                                    onChange={e => {
                                                        if(e.target.files?.[0]) {
                                                            const file = e.target.files[0];
                                                            if (ogImagePreview && ogImagePreview.startsWith('blob:')) {
                                                                URL.revokeObjectURL(ogImagePreview);
                                                            }
                                                            setOgImageFile(file);
                                                            setOgImagePreview(URL.createObjectURL(file));
                                                        }
                                                    }} 
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Recommended: 1200x630px</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Twitter Card */}
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <h5 className="text-sm font-medium mb-3 text-gray-700">Twitter Card</h5>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Card Type</label>
                                            <select 
                                                className="w-full border border-gray-300 p-2 rounded"
                                                value={formData.twitter_card_type || 'summary_large_image'}
                                                onChange={e => handleChange('twitter_card_type', e.target.value)}
                                            >
                                                <option value="summary">Summary</option>
                                                <option value="summary_large_image">Summary Large Image</option>
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Twitter Title</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-gray-300 p-2 rounded" 
                                                value={formData.twitter_title || ''} 
                                                onChange={e => handleChange('twitter_title', e.target.value)}
                                                placeholder="Title for Twitter sharing"
                                                maxLength={255}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Twitter Description</label>
                                            <textarea 
                                                className="w-full border border-gray-300 p-2 rounded h-20" 
                                                value={formData.twitter_description || ''} 
                                                onChange={e => handleChange('twitter_description', e.target.value)}
                                                placeholder="Description for Twitter sharing"
                                                maxLength={500}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Twitter Image</label>
                                            <div className="flex items-center gap-4">
                                                <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden border">
                                                    {twitterImagePreview ? (
                                                        <img src={twitterImagePreview} className="w-full h-full object-cover" alt="Twitter Preview" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-gray-400 text-xs">No Image</div>
                                                    )}
                                                </div>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="text-sm" 
                                                    onChange={e => {
                                                        if(e.target.files?.[0]) {
                                                            const file = e.target.files[0];
                                                            if (twitterImagePreview && twitterImagePreview.startsWith('blob:')) {
                                                                URL.revokeObjectURL(twitterImagePreview);
                                                            }
                                                            setTwitterImageFile(file);
                                                            setTwitterImagePreview(URL.createObjectURL(file));
                                                        }
                                                    }} 
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Recommended: 1200x675px</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-4">
                <button 
                    type="button" 
                    onClick={() => {
                        // Build back URL with preserved query parameters
                        const basePath = `/admin/${scope.toLowerCase()}/events`;
                        const page = searchParams.get('page');
                        const search = searchParams.get('search');
                        const status = searchParams.get('status');
                        const recurring = searchParams.get('recurring');
                        const club = searchParams.get('club');
                        
                        const params = new URLSearchParams();
                        if (page) params.set('page', page);
                        if (search) params.set('search', search);
                        if (status) params.set('status', status);
                        if (recurring) params.set('recurring', recurring);
                        if (club) params.set('club', club);
                        
                        const queryString = params.toString();
                        const redirectUrl = queryString ? `${basePath}?${queryString}` : basePath;
                        router.push(redirectUrl);
                    }} 
                    className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50">
                    {loading ? 'Saving...' : 'Save Event'}
                </button>
            </div>

        </form>
        
        {/* Toast Notification */}
        {toast && (
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={!!toast}
                onClose={() => setToast(null)}
            />
        )}
        </>
    );
}
