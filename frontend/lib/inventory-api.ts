import api from './api';

// Types based on our Django Serializers

export interface InventoryTag {
  id: number;
  name: string;
  icon: string;
  club?: number;
}

export interface ItemCategory {
  id: number;
  name: string;
  icon: string;
}

export interface Item {
  id: number;
  title: string;
  description: string;
  image: string | null;
  status: 'AVAILABLE' | 'BORROWED' | 'MAINTENANCE' | 'MISSING' | 'HIDDEN';
  max_borrow_duration: number;
  internal_note: string;
  club: number;
  club_name: string;
  category: number | null;
  category_details: ItemCategory | null;
  tags: number[];
  tags_details: InventoryTag[];
  active_loan?: {
    user_id: number;
    user_name: string;
    due_at: string;
    is_guest: boolean;
  } | null;
  queue_count: number;
  user_in_queue?: boolean;
  created_at: string;
}

// Params for Batch Creation
export interface CreateItemData {
  title: string;
  quantity: number; // Important for Batch Create
  category?: number;
  description?: string;
  image?: File | null;
  max_borrow_duration: number;
  tags?: number[];
  internal_note?: string;
  club?: number; // Optional if admin has one assigned
}

export interface ClubOption {
  id: number;
  name: string;
}

export const inventoryApi = {
  // --- Items ---
  getItems: async (clubId?: string | number, search?: string, categoryId?: number, page?: number, pageSize?: number) => {
    const params = new URLSearchParams();
    if (clubId) params.append('club', String(clubId));
    if (search) params.append('search', search);
    if (categoryId) params.append('category', String(categoryId));
    if (page) params.append('page', String(page));
    if (pageSize) params.append('page_size', String(pageSize));
    
    const response = await api.get(`/inventory/items/?${params.toString()}`);
    return response.data;
  },

  getItem: async (id: number | string) => {
    const response = await api.get(`/inventory/items/${id}/`);
    return response.data;
  },

  // We use the special 'batch-create' endpoint we made
  createItems: async (data: CreateItemData) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('quantity', String(data.quantity));
    formData.append('max_borrow_duration', String(data.max_borrow_duration));
    
    if (data.description) formData.append('description', data.description);
    if (data.category) formData.append('category', String(data.category));
    if (data.internal_note) formData.append('internal_note', data.internal_note);
    if (data.image) formData.append('image', data.image);
    if (data.club) formData.append('club', String(data.club));

    // Handle Tags (Many-to-Many)
    if (data.tags && data.tags.length > 0) {
      data.tags.forEach(tagId => formData.append('tags', String(tagId)));
    }

    const response = await api.post('/inventory/items/batch-create/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateItem: async (id: number | string, data: Partial<CreateItemData>) => {
    // Similar to create but logic for single update
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        // @ts-ignore
        const value = data[key];
        if (key === 'tags' && Array.isArray(value)) {
            value.forEach(v => formData.append('tags', String(v)));
        } else if (value !== undefined && value !== null) {
            formData.append(key, value);
        }
    });

    const response = await api.patch(`/inventory/items/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteItem: async (id: number | string) => {
    await api.delete(`/inventory/items/${id}/`);
  },

  // --- Aux ---
  getCategories: async () => {
    const response = await api.get('/inventory/categories/');
    return response.data;
  },

  getTags: async () => {
    const response = await api.get('/inventory/tags/');
    return response.data;
  },

  // --- NEW: Helper to get clubs for the dropdown ---
  // If Super Admin: Returns all. If Muni Admin: Returns clubs in municipality.
  getSelectableClubs: async () => {
    const response = await api.get('/clubs/?page_size=1000');
    const data = response.data;
    // Handle paginated response (results) or direct array
    const clubs = Array.isArray(data) ? data : (data.results || []);
    // Transform to ClubOption format (id, name)
    return clubs.map((club: any) => ({
      id: club.id,
      name: club.name,
    }));
  },

  // --- NEW: Category Management (Super Admin) ---
  createCategory: async (data: {name: string, icon: string}) => {
    return (await api.post('/inventory/categories/', data)).data;
  },

  updateCategory: async (id: number, data: {name: string, icon: string}) => {
    return (await api.patch(`/inventory/categories/${id}/`, data)).data;
  },

  deleteCategory: async (id: number) => {
    await api.delete(`/inventory/categories/${id}/`);
  },

  // --- NEW: Tag Management ---
  createTag: async (data: {name: string, icon: string, club?: number}) => {
    return (await api.post('/inventory/tags/', data)).data;
  },

  deleteTag: async (id: number) => {
    await api.delete(`/inventory/tags/${id}/`);
  },

  // --- Youth Methods ---
  
  // Get items for a specific club (Essential for Guest logic)
  getClubItems: async (clubId: number, search?: string, categoryId?: number) => {
    const params = new URLSearchParams();
    params.append('club', String(clubId)); // This triggers our new backend filter
    if (search) params.append('search', search);
    if (categoryId) params.append('category', String(categoryId));
    
    const response = await api.get(`/inventory/items/?${params.toString()}`);
    return response.data;
  },

  borrowItem: async (itemId: number) => {
    return (await api.post(`/inventory/items/${itemId}/borrow/`)).data;
  },

  returnItem: async (itemId: number) => {
    return (await api.post(`/inventory/items/${itemId}/return_item/`)).data;
  },

  joinQueue: async (itemId: number) => {
    return (await api.post(`/inventory/items/${itemId}/join-queue/`)).data;
  },

  leaveQueue: async (itemId: number) => {
    return (await api.post(`/inventory/items/${itemId}/leave-queue/`)).data;
  },

  getMySessions: async (page: number = 1) => {
    // This uses LendingSessionViewSet which automatically filters by request.user
    return (await api.get(`/inventory/history/?page=${page}`)).data;
  },

  // Analytics endpoint for club admins
  getAnalytics: async (clubId?: number) => {
    const params = clubId ? `?club_id=${clubId}` : '';
    return (await api.get(`/inventory/items/analytics/${params}`)).data;
  },

  // History Analytics
  getHistoryAnalytics: async () => {
    return (await api.get('/inventory/history/analytics/')).data;
  }
};

