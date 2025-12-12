'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Info, AlertCircle, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import api from '../../lib/api';
import Toast from './Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface MessageFormProps {
  redirectPath: string;
}

const ROLES = [
  { id: 'SUPER_ADMIN', label: 'Super Admin' },
  { id: 'MUNICIPALITY_ADMIN', label: 'Municipality Admin' },
  { id: 'CLUB_ADMIN', label: 'Club Admin' },
  { id: 'YOUTH_MEMBER', label: 'Youth Member' },
  { id: 'GUARDIAN', label: 'Guardian' },
];

export default function MessageForm({ redirectPath }: MessageFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    message_type: 'INFO',
    target_all: true,
    selected_roles: [] as string[],
    days_active: 7,
    is_sticky: false,
    external_link: ''
  });

  const toggleRole = (role: string) => {
    setFormData(prev => {
      const list = prev.selected_roles.includes(role)
        ? prev.selected_roles.filter(r => r !== role)
        : [...prev.selected_roles, role];
      return { ...prev, selected_roles: list };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate that at least one role is selected if not targeting all
    if (!formData.target_all && formData.selected_roles.length === 0) {
      setToast({ message: 'Please select at least one role or select "All Roles".', type: 'error', isVisible: true });
      setLoading(false);
      return;
    }
    
    // Calculate Expiration
    const expires = new Date();
    expires.setDate(expires.getDate() + parseInt(formData.days_active.toString()));

    const payload: any = {
      title: formData.title.trim(),
      message: formData.message.trim(),
      message_type: formData.message_type,
      target_roles: formData.target_all ? ['ALL'] : formData.selected_roles,
      is_sticky: formData.is_sticky,
      expires_at: expires.toISOString()
    };

    // Only include external_link if it has a value (don't send null or empty string)
    if (formData.external_link && formData.external_link.trim()) {
      payload.external_link = formData.external_link.trim();
    }

    try {
      await api.post('/messages/', payload);
      setToast({ message: 'System message created!', type: 'success', isVisible: true });
      setTimeout(() => router.push(redirectPath), 1000);
    } catch (err: any) {
      console.error('Error creating message:', err);
      console.error('Error response:', err?.response?.data);
      console.error('Payload sent:', payload);
      const errorMessage = err?.response?.data?.message || 
                          err?.response?.data?.detail || 
                          (typeof err?.response?.data === 'object' ? JSON.stringify(err.response.data) : 'Failed to create message.');
      setToast({ message: errorMessage, type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch(type) {
      case 'INFO': return <Info className="h-4 w-4" />;
      case 'IMPORTANT': return <AlertCircle className="h-4 w-4" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch(type) {
      case 'INFO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IMPORTANT': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'WARNING': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={redirectPath}>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create System Message</h1>
          <p className="text-sm text-muted-foreground">Create and send a system-wide message to users.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Message Details */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Message Details</CardTitle>
            <CardDescription>Enter the message title and content.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                required
                type="text"
                placeholder="Enter message title..."
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="focus:ring-[#4D4DA4] focus:border-[#4D4DA4]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">
                Message Body <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="message"
                required
                rows={4}
                placeholder="Enter your message..."
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                className="focus:ring-[#4D4DA4] focus:border-[#4D4DA4]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="external_link">
                External Link (Optional)
              </Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="external_link"
                  type="url"
                  placeholder="https://..."
                  value={formData.external_link}
                  onChange={e => setFormData({...formData, external_link: e.target.value})}
                  className="pl-9 focus:ring-[#4D4DA4] focus:border-[#4D4DA4]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Settings */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Message Settings</CardTitle>
            <CardDescription>Configure message type, duration, and visibility.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="message_type">Message Type</Label>
                <select
                  id="message_type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:ring-offset-2 focus-visible:border-[#4D4DA4] pr-10"
                  value={formData.message_type}
                  onChange={e => setFormData({...formData, message_type: e.target.value})}
                >
                  <option value="INFO">Information (Blue)</option>
                  <option value="IMPORTANT">Important (Orange)</option>
                  <option value="WARNING">Warning (Red)</option>
                </select>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className={getMessageTypeColor(formData.message_type)}>
                    <span className="flex items-center gap-1.5">
                      {getMessageTypeIcon(formData.message_type)}
                      {formData.message_type}
                    </span>
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="days_active">
                  Duration (Days) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="days_active"
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={formData.days_active}
                  onChange={e => setFormData({...formData, days_active: parseInt(e.target.value) || 7})}
                  className="focus:ring-[#4D4DA4] focus:border-[#4D4DA4]"
                />
                <p className="text-xs text-muted-foreground">Message will expire after this many days</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg border border-input bg-muted/30">
              <input
                type="checkbox"
                id="is_sticky"
                checked={formData.is_sticky}
                onChange={e => setFormData({...formData, is_sticky: e.target.checked})}
                className="w-5 h-5 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <Label htmlFor="is_sticky" className="font-semibold text-foreground cursor-pointer block">
                  Sticky Message
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Reappears on refresh even if closed by user.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Target Audience */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Target Audience</CardTitle>
            <CardDescription>Select which user roles should receive this message.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg border border-input bg-muted/30">
              <input
                type="checkbox"
                id="target_all"
                checked={formData.target_all}
                onChange={e => setFormData({...formData, target_all: e.target.checked, selected_roles: e.target.checked ? [] : formData.selected_roles})}
                className="w-5 h-5 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <Label htmlFor="target_all" className="font-semibold text-foreground cursor-pointer block">
                  All Roles
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Send this message to all users regardless of their role.
                </p>
              </div>
            </div>

            {!formData.target_all && (
              <div className="space-y-2">
                <Label>Select Specific Roles</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg border border-input bg-muted/30">
                  {ROLES.map(role => (
                    <label
                      key={role.id}
                      className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-background/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-[#4D4DA4] focus:ring-[#4D4DA4] rounded"
                        checked={formData.selected_roles.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                      />
                      <span className="text-sm font-medium text-foreground">{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(redirectPath)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors"
          >
            {loading ? 'Sending...' : 'Send Message'}
          </Button>
        </div>

      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
