'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, X, Tag as TagIcon } from 'lucide-react';
import { inventoryApi, ItemCategory, InventoryTag, ClubOption } from '@/lib/inventory-api';
import { useAuth } from '@/context/AuthContext';
import { getMediaUrl } from '@/app/utils';
import Toast from '@/app/components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface ItemFormProps {
  initialData?: any;
  clubId?: number; // If we are in club admin view
}

export default function ItemForm({ initialData, clubId }: ItemFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [tags, setTags] = useState<InventoryTag[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false });

  // Form State
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    quantity: 1, // Default to 1, but user can set 20 to batch create
    max_borrow_duration: initialData?.max_borrow_duration || 60,
    category: initialData?.category ? (typeof initialData.category === 'object' ? initialData.category.id : initialData.category) : '',
    tags: initialData?.tags ? initialData.tags.map((t: any) => typeof t === 'object' ? t.id : t) : [],
    internal_note: initialData?.internal_note || '',
    status: initialData?.status || 'AVAILABLE',
    club: initialData?.club ? (typeof initialData.club === 'object' ? initialData.club.id : initialData.club) : '',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.image ? getMediaUrl(initialData.image) : null
  );
  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch Categories & Tags
    Promise.all([inventoryApi.getCategories(), inventoryApi.getTags()])
      .then(([cats, tgs]) => {
        // Handle paginated response (results) or direct array
        setCategories(Array.isArray(cats) ? cats : (cats.results || []));
        setTags(Array.isArray(tgs) ? tgs : (tgs.results || []));
      })
      .catch(err => {
        console.error("Failed to load categories/tags", err);
        setCategories([]);
        setTags([]);
      });

    // NEW: Fetch Clubs if user is Super Admin or Municipality Admin (and no clubId prop passed)
    const isSuperOrMuniAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MUNICIPALITY_ADMIN';
    if (isSuperOrMuniAdmin && !clubId) {
        inventoryApi.getSelectableClubs()
          .then(data => {
            // Handle paginated response (results) or direct array
            setClubs(Array.isArray(data) ? data : (data.results || []));
          })
          .catch(err => {
            console.error("Failed to load clubs", err);
            setClubs([]);
          });
    }
  }, [user, clubId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        image: imageFile,
        // Use formData.club if set, otherwise fall back to clubId or user's assigned club
        club: formData.club ? Number(formData.club) : (clubId || user?.assigned_club?.id), 
        // Ensure category is number
        category: formData.category ? Number(formData.category) : undefined,
      };

      if (initialData) {
        await inventoryApi.updateItem(initialData.id, payload);
        setToast({ 
          message: 'Item updated successfully!', 
          type: 'success', 
          isVisible: true 
        });
      } else {
        await inventoryApi.createItems(payload); // This handles batch creation
        setToast({ 
          message: `Item${formData.quantity > 1 ? 's' : ''} created successfully!`, 
          type: 'success', 
          isVisible: true 
        });
      }
      
      // Wait a bit to show the toast before navigating
      setTimeout(() => {
      router.back();
      router.refresh();
      }, 1000);
    } catch (error: any) {
      console.error('Error details:', error);
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to save item.';
      setToast({ 
        message: errorMessage, 
        type: 'error', 
        isVisible: true 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImageFile(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageRef.current) imageRef.current.value = '';
  };

  const handleTagToggle = (tagId: number) => {
    const currentTags = formData.tags as number[];
    if (currentTags.includes(tagId)) {
      setFormData({...formData, tags: currentTags.filter(t => t !== tagId)});
    } else {
      setFormData({...formData, tags: [...currentTags, tagId]});
    }
  };

  // Determine redirect path based on user role
  const getRedirectPath = () => {
    if (clubId) return `/admin/club/inventory`;
    if (user?.role === 'MUNICIPALITY_ADMIN') return '/admin/municipality/inventory';
    return '/admin/super/inventory';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={getRedirectPath()}>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#121213]">
            {initialData ? 'Edit Item' : 'Create New Item'}
          </h1>
          <p className="text-sm text-gray-500">Manage item details and information.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. Basic Information */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the basic details for this item.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Item Title <span className="text-red-500">*</span></Label>
                <Input
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. PlayStation 5 Controller"
                  className="bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
                />
              </div>

              {!initialData && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Quantity (Batch Create)</Label>
                  <div className="bg-[#EBEBFE]/30 p-4 rounded-lg border border-[#EBEBFE]">
                    <p className="text-sm text-gray-600 mb-2">Create multiple copies at once (e.g. 10 Rackets).</p>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.quantity}
                      onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                      className="w-24 bg-white border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:ring-offset-2 border-2 border-gray-200"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="">Select Category...</option>
                  {(Array.isArray(categories) ? categories : []).map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              {((user?.role === 'SUPER_ADMIN' || user?.role === 'MUNICIPALITY_ADMIN') && !clubId) && (
                <div className="space-y-2">
                  <Label>Assign to Club <span className="text-red-500">*</span></Label>
                  <select
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:ring-offset-2 border-2 border-gray-200"
                    value={formData.club}
                    onChange={e => setFormData({...formData, club: e.target.value})}
                  >
                    <option value="">Select a Club...</option>
                    {(Array.isArray(clubs) ? clubs : []).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter item description..."
                  className="bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Item Image */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Item Image</CardTitle>
            <CardDescription>Upload an image for this item.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex gap-4 items-center">
                <div 
                  className="relative group h-32 w-48 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 hover:border-[#4D4DA4]/50 transition-colors cursor-pointer"
                  onClick={() => imageRef.current?.click()}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} className="h-full w-full object-cover" alt="Item preview" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <Upload className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                      <span className="text-xs text-gray-500">Click to upload</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => imageRef.current?.click()}>
                      Choose File
                    </Button>
                    {imagePreview && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50" 
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Recommended: Square image, 800x800px</p>
                </div>
                <input 
                  ref={imageRef} 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageChange} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Settings */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure borrowing settings and internal notes.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Borrow Time (Minutes)</Label>
                <Input
                  type="number"
                  value={formData.max_borrow_duration}
                  onChange={e => setFormData({...formData, max_borrow_duration: parseInt(e.target.value) || 60})}
                  className="bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
                />
                <p className="text-xs text-gray-500">Default is 60 minutes.</p>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:ring-offset-2 border-2 border-gray-200"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="BORROWED">Borrowed</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="MISSING">Missing</option>
                  <option value="HIDDEN">Hidden</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Internal Note</Label>
                <Input
                  type="text"
                  value={formData.internal_note}
                  onChange={e => setFormData({...formData, internal_note: e.target.value})}
                  placeholder="e.g. Purchased 2024"
                  className="bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Tags */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>Assign tags to help categorize and find this item.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>Select Tags</Label>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(tags) ? tags : []).map(tag => {
                  const isSelected = (formData.tags as number[]).includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        isSelected
                          ? 'bg-[#EBEBFE] border-[#4D4DA4] text-[#4D4DA4]'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-[#4D4DA4]'
                      }`}
                    >
                      {tag.icon} {tag.name}
                    </button>
                  );
                })}
                {tags.length === 0 && (
                  <p className="text-sm text-gray-500">No tags available. Create tags in the Tags management page.</p>
                )}
              </div>
              {formData.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-sm font-medium text-gray-700">Selected:</span>
                  {(formData.tags as number[]).map(tagId => {
                    const tag = tags.find(t => t.id === tagId);
                    return tag ? (
                      <Badge key={tagId} variant="secondary" className="bg-[#EBEBFE] text-[#4D4DA4]">
                        {tag.icon} {tag.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors"
          >
            {loading ? 'Saving...' : (initialData ? 'Update Item' : 'Create Items')}
          </Button>
        </div>

        {/* Toast Notification */}
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => setToast({ ...toast, isVisible: false })}
        />
      </form>
    </div>
  );
}

