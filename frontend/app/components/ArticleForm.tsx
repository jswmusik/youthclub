'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, X, FileText } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';
import RichTextEditor from './RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface Tag { id: number; name: string; }

interface ArticleFormProps {
  initialData?: any;
  redirectPath: string;
}

const ROLES = [
  { id: 'SUPER_ADMIN', label: 'Super Admin' },
  { id: 'MUNICIPALITY_ADMIN', label: 'Municipality Admin' },
  { id: 'CLUB_ADMIN', label: 'Club Admin' },
  { id: 'YOUTH_MEMBER', label: 'Youth Member' },
  { id: 'GUARDIAN', label: 'Guardian' },
];

export default function ArticleForm({ initialData, redirectPath }: ArticleFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [tagsList, setTagsList] = useState<Tag[]>([]);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Form State
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    excerpt: initialData?.excerpt || '',
    content: initialData?.content || '',
    is_published: initialData?.is_published || false,
    is_hero: initialData?.is_hero || false,
    tags: initialData?.tags || [], // Array of IDs
    target_roles: initialData?.target_roles || ['ALL'],
  });

  // Files
  const heroRef = useRef<HTMLInputElement>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(
    initialData?.hero_image ? getMediaUrl(initialData.hero_image) : null
  );

  useEffect(() => {
    // Fetch Tags for selection
    api.get('/news_tags/').then(res => {
      setTagsList(Array.isArray(res.data) ? res.data : res.data.results || []);
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setHeroFile(e.target.files[0]);
      setHeroPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleRemoveImage = () => {
    setHeroFile(null);
    setHeroPreview(null);
    if (heroRef.current) heroRef.current.value = '';
  };

  const toggleTag = (id: number) => {
    setFormData(prev => {
      const exists = prev.tags.includes(id);
      return { 
        ...prev, 
        tags: exists ? prev.tags.filter((t: number) => t !== id) : [...prev.tags, id] 
      };
    });
  };

  const toggleRole = (role: string) => {
    setFormData(prev => {
      if (role === 'ALL') {
        // Toggle ALL: if on, turn off others. if off, turn on.
        return { ...prev, target_roles: prev.target_roles.includes('ALL') ? [] : ['ALL'] };
      }
      
      // If specific role selected, remove ALL
      let newRoles = prev.target_roles.filter((r: string) => r !== 'ALL');
      if (newRoles.includes(role)) {
        newRoles = newRoles.filter((r: string) => r !== role);
      } else {
        newRoles.push(role);
      }
      
      if (newRoles.length === 0) newRoles = ['ALL']; // Default back to ALL if empty
      
      return { ...prev, target_roles: newRoles };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Ensure at least one role is selected
      const rolesToSubmit = formData.target_roles.length > 0 ? formData.target_roles : ['ALL'];
      
      const data = new FormData();
      data.append('title', formData.title);
      data.append('excerpt', formData.excerpt);
      data.append('content', formData.content);
      data.append('target_roles_data', JSON.stringify(rolesToSubmit));
      data.append('is_published', formData.is_published.toString());
      data.append('is_hero', formData.is_hero.toString());
      
      // Arrays
      formData.tags.forEach((id: number) => data.append('tags', id.toString()));

      if (heroFile) data.append('hero_image', heroFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/news/${initialData.id}/`, data, config);
        setToast({ message: 'Article updated!', type: 'success', isVisible: true });
      } else {
        await api.post('/news/', data, config);
        setToast({ message: 'Article created!', type: 'success', isVisible: true });
      }

      // Preserve page parameter when redirecting
      const page = searchParams.get('page');
      const search = searchParams.get('search');
      const params = new URLSearchParams();
      if (page && page !== '1') params.set('page', page);
      if (search) params.set('search', search);
      const queryString = params.toString();
      const finalPath = queryString ? `${redirectPath}?${queryString}` : redirectPath;
      
      setTimeout(() => router.push(finalPath), 1000);

    } catch (err) {
      console.error(err);
      setToast({ message: 'Operation failed.', type: 'error', isVisible: true });
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
            {initialData ? 'Edit Article' : 'Create New Article'}
          </h1>
          <p className="text-sm text-muted-foreground">Manage article details and content.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. Article Content */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Article Content</CardTitle>
            <CardDescription>Enter the article title, excerpt, and body content.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input 
                required 
                type="text" 
                className="text-lg font-semibold" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Excerpt (Summary) <span className="text-red-500">*</span></Label>
              <textarea 
                required 
                rows={3} 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.excerpt} 
                onChange={e => setFormData({...formData, excerpt: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Body Content</Label>
              <RichTextEditor value={formData.content} onChange={(val) => setFormData({...formData, content: val})} />
            </div>
          </CardContent>
        </Card>

        {/* 2. Hero Image */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Hero Image</CardTitle>
            <CardDescription>Upload a hero image for this article.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                <div className="relative group h-32 w-full max-w-md rounded-lg border-2 border-dashed border-input bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 hover:border-[#4D4DA4]/50 transition-colors cursor-pointer" onClick={() => heroRef.current?.click()}>
                  {heroPreview ? (
                    <>
                      <img src={heroPreview} className="h-full w-full object-cover rounded-lg" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <span className="text-sm text-muted-foreground">Click to upload</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => heroRef.current?.click()}>Choose File</Button>
                    {heroPreview && (
                      <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleRemoveImage}>
                        <X className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Recommended: 1200x400px</p>
                </div>
                <input ref={heroRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Publication Settings */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Publication Settings</CardTitle>
            <CardDescription>Configure publication and hero status for this article.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="is_published"
                checked={formData.is_published} 
                onChange={e => setFormData({...formData, is_published: e.target.checked})} 
                className="h-4 w-4 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded border-gray-300"
              />
              <Label htmlFor="is_published" className="font-medium cursor-pointer">Publish Article</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="is_hero"
                checked={formData.is_hero} 
                onChange={e => setFormData({...formData, is_hero: e.target.checked})} 
                className="h-4 w-4 text-[#FF5485] focus:ring-[#FF5485] rounded border-gray-300"
              />
              <Label htmlFor="is_hero" className="font-medium cursor-pointer">Set as Main Hero</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">Setting this will remove Hero status from any other article.</p>
          </CardContent>
        </Card>

        {/* 4. Tags */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>Select tags to categorize this article.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {tagsList.map(tag => (
                <Badge
                  key={tag.id}
                  variant={formData.tags.includes(tag.id) ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    formData.tags.includes(tag.id) 
                      ? 'bg-[#4D4DA4] hover:bg-[#FF5485] text-white border-[#4D4DA4]' 
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#4D4DA4]'
                  }`}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
              {tagsList.length === 0 && (
                <p className="text-sm text-muted-foreground">No tags available. Create tags first.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 5. Target Audience */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Target Audience</CardTitle>
            <CardDescription>Select which user roles should see this article.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="target_all"
                  checked={formData.target_roles.includes('ALL')} 
                  onChange={() => toggleRole('ALL')} 
                  className="h-4 w-4 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded border-gray-300"
                />
                <Label htmlFor="target_all" className="font-medium cursor-pointer">Everyone</Label>
              </div>
              {!formData.target_roles.includes('ALL') && (
                <div className="space-y-2 pl-6 border-l-2 border-gray-200">
                  {ROLES.map(role => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id={`target_${role.id}`}
                        checked={formData.target_roles.includes(role.id)} 
                        onChange={() => toggleRole(role.id)}
                        className="h-4 w-4 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded border-gray-300"
                      />
                      <Label htmlFor={`target_${role.id}`} className="cursor-pointer">{role.label}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex justify-end gap-4 pt-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => {
              const page = searchParams.get('page');
              const search = searchParams.get('search');
              const params = new URLSearchParams();
              if (page && page !== '1') params.set('page', page);
              if (search) params.set('search', search);
              const queryString = params.toString();
              const finalPath = queryString ? `${redirectPath}?${queryString}` : redirectPath;
              router.push(finalPath);
            }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading} 
            className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white"
          >
            {loading ? 'Saving...' : initialData ? 'Update Article' : 'Create Article'}
          </Button>
        </div>

      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}