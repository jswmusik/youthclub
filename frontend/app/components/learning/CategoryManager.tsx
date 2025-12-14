'use client';

import { useState, useEffect } from 'react';
import { learningApi } from '@/lib/learning-api';
import { LearningCategory } from '@/types/learning';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CategoryManager() {
    const [categories, setCategories] = useState<LearningCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const res = await learningApi.getCategories();
            // Handle pagination or list response
            const data = Array.isArray(res.data) ? res.data : (res.data as any).results;
            setCategories(data || []);
        } catch (error) {
            console.error("Failed to load categories");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newCategoryName.trim()) return;
        try {
            await learningApi.createCategory(newCategoryName);
            setNewCategoryName('');
            setIsCreating(false);
            loadCategories();
            toast.success('Category created');
        } catch (error) {
            toast.error('Failed to create category');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure? This might affect courses using this category.')) return;
        try {
            await learningApi.deleteCategory(id);
            setCategories(prev => prev.filter(c => c.id !== id));
            toast.success('Category deleted');
        } catch (error) {
            toast.error('Failed to delete category');
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Categories</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setIsCreating(!isCreating)}>
                    {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 mr-2" />}
                    {isCreating ? 'Cancel' : 'Add Category'}
                </Button>
            </CardHeader>
            <CardContent>
                {isCreating && (
                    <div className="flex gap-2 mb-4 p-4 bg-slate-50 rounded-md border">
                        <Input 
                            placeholder="Category Name" 
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <Button size="sm" onClick={handleCreate}>Save</Button>
                    </div>
                )}

                {loading ? (
                    <div className="text-center text-sm text-gray-500 py-4">Loading...</div>
                ) : categories.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 py-4">No categories defined.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell className="font-medium">{cat.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDelete(cat.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

