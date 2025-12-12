'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { inventoryApi, ItemCategory } from '@/lib/inventory-api';
import { ChevronLeft, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import Toast from '@/app/components/Toast';

export default function CategoryManagerPage() {
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [loading, setLoading] = useState(true);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false });

  useEffect(() => {
    loadCats();
  }, []);

  const loadCats = async () => {
    try {
      setLoading(true);
      const data = await inventoryApi.getCategories();
      // Handle paginated response (results) or direct array
      setCategories(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("Failed to load categories", err);
      setCategories([]);
      setToast({ message: 'Failed to load categories', type: 'error', isVisible: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryApi.createCategory({ name: newName, icon: newIcon });
      setNewName('');
      setNewIcon('');
      setToast({ message: 'Category created successfully', type: 'success', isVisible: true });
      loadCats();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || 'Failed to create category';
      setToast({ message: errorMsg, type: 'error', isVisible: true });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    
    try {
      await inventoryApi.deleteCategory(categoryToDelete);
      setToast({ message: 'Category deleted successfully', type: 'success', isVisible: true });
      setCategoryToDelete(null);
      loadCats();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || 'Failed to delete category';
      setToast({ message: errorMsg, type: 'error', isVisible: true });
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/admin/super/inventory">
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-4 w-4" />
            Back to Inventory
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Global Item Categories</h1>
          <p className="text-gray-500 mt-1">Define broad categories like 'Gaming', 'Sports'.</p>
        </div>
      </div>

      {/* Create Form */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl font-bold text-[#121213]">Create New Category</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 min-w-0">
              <Label className="text-sm sm:text-base font-semibold text-[#121213] mb-2 block">
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Board Games"
                className="h-11 sm:h-12 text-sm sm:text-base bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl"
                required
              />
            </div>
            <div className="w-full sm:w-32">
              <Label className="text-sm sm:text-base font-semibold text-[#121213] mb-2 block">
                Icon (Emoji)
              </Label>
              <Input
                type="text"
                value={newIcon}
                onChange={e => setNewIcon(e.target.value)}
                placeholder="🎲"
                className="h-11 sm:h-12 text-sm sm:text-base bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl text-center text-xl"
                maxLength={2}
              />
            </div>
            <Button
              type="submit"
              className="w-full sm:w-auto h-11 sm:h-12 text-sm sm:text-base font-semibold bg-[#4D4DA4] hover:bg-[#FF5485] text-white gap-2 rounded-full transition-colors shadow-lg hover:shadow-xl"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Categories List */}
      {loading ? (
        <Card className="border border-gray-100 shadow-sm bg-white">
          <CardContent className="p-12 text-center text-gray-500">
            Loading categories...
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm bg-white">
          <CardContent className="p-12 text-center text-gray-500">
            No categories found. Create your first category above.
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-0">
            {/* Mobile: Cards */}
            <div className="block md:hidden divide-y divide-gray-100">
              {categories.map(cat => (
                <div key={cat.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="text-2xl flex-shrink-0">{cat.icon || '📦'}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#121213] truncate">{cat.name}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCategoryToDelete(cat.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead className="h-12 text-gray-600 font-semibold w-20">Icon</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Name</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map(cat => (
                  <TableRow key={cat.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="text-2xl">{cat.icon || '📦'}</div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm font-semibold text-[#121213]">{cat.name}</div>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCategoryToDelete(cat.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isVisible={categoryToDelete !== null}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message={`Are you sure you want to delete "${categories.find(c => c.id === categoryToDelete)?.name}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        variant="danger"
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

