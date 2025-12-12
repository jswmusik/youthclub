'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Tag } from 'lucide-react';
import api from '../../lib/api';
import Toast from './Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface TagFormProps {
  initialData?: any;
  redirectPath: string;
}

export default function TagForm({ initialData, redirectPath }: TagFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({
        ...prev,
        name: val,
        // Auto-slugify if creating new
        slug: !initialData ? val.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') : prev.slug
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData) {
        await api.patch(`/news_tags/${initialData.id}/`, formData);
        setToast({ message: 'Tag updated!', type: 'success', isVisible: true });
      } else {
        await api.post('/news_tags/', formData);
        setToast({ message: 'Tag created!', type: 'success', isVisible: true });
      }
      const currentSearchParams = searchParams.toString();
      const finalRedirectPath = currentSearchParams ? `${redirectPath}?${currentSearchParams}` : redirectPath;
      setTimeout(() => router.push(finalRedirectPath), 1000);
    } catch (err: any) {
      console.error(err);
      setToast({ message: 'Failed to save tag.', type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={redirectPath}>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {initialData ? 'Edit Tag' : 'Create New Tag'}
          </h1>
          <p className="text-sm text-muted-foreground">Manage tag details and information.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Tag Information */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-[#4D4DA4]" />
              Tag Information
            </CardTitle>
            <CardDescription>Enter the tag name and slug for categorization.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label>Tag Name <span className="text-red-500">*</span></Label>
              <Input 
                required 
                type="text" 
                placeholder="e.g. Summer Events"
                value={formData.name} 
                onChange={handleNameChange} 
              />
            </div>
            <div className="space-y-2">
              <Label>Slug <span className="text-red-500">*</span></Label>
              <Input 
                required 
                type="text" 
                className="bg-gray-50 font-mono text-sm" 
                placeholder="e.g. summer-events"
                value={formData.slug} 
                onChange={e => setFormData({...formData, slug: e.target.value})} 
              />
              <p className="text-xs text-muted-foreground">Used in the URL. Auto-generated from tag name, but editable.</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex justify-end gap-4 pt-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => {
              const currentSearchParams = searchParams.toString();
              const finalRedirectPath = currentSearchParams ? `${redirectPath}?${currentSearchParams}` : redirectPath;
              router.push(finalRedirectPath);
            }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading} 
            className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white"
          >
            {loading ? 'Saving...' : initialData ? 'Update Tag' : 'Create Tag'}
          </Button>
        </div>

      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}