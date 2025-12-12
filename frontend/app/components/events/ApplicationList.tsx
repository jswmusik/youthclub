'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, CheckCircle, XCircle, Calendar, MapPin, User, Clock } from 'lucide-react';
import api from '@/lib/api';
import Toast from '../Toast';
import { getMediaUrl, getInitials } from '@/app/utils';

// Shadcn
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ApplicationListProps {
    scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function ApplicationList({ scope }: ApplicationListProps) {
    const router = useRouter();
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('PENDING'); // Default to showing tasks
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

    const fetchRegistrations = useCallback(async () => {
        setLoading(true);
        try {
            // Build Query
            let url = `/registrations/?ordering=-created_at`;
            
            // Filter logic
            if (filterStatus !== 'ALL') {
                if (filterStatus === 'PENDING') {
                    // Custom logic often needed here, or backend support for multiple values
                    // For MVP, we fetch all and filter client side if backend doesn't support "OR" easily
                    // OR we assume 'PENDING' means strictly PENDING_ADMIN for this view
                    // Let's filter client-side for complex "Pending Guardian OR Admin" logic to save backend work
                } else {
                    url += `&status=${filterStatus}`;
                }
            }
            
            const res = await api.get(url);
            let data = Array.isArray(res.data) ? res.data : res.data.results || [];

            // Client-side search/filter refinement if needed
            if (filterStatus === 'PENDING') {
                data = data.filter((r: any) => 
                    r.status === 'PENDING_ADMIN' || r.status === 'PENDING_GUARDIAN'
                );
            }

            setRegistrations(data);
        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to load applications", type: 'error', isVisible: true });
        } finally {
            setLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => {
        fetchRegistrations();
    }, [fetchRegistrations]);

    const handleAction = async (id: number, action: 'APPROVED' | 'REJECTED') => {
        try {
            await api.patch(`/registrations/${id}/`, { status: action });
            setToast({ message: `Application ${action.toLowerCase()}`, type: 'success', isVisible: true });
            
            // Optimistic Update
            setRegistrations(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error(error);
            setToast({ message: "Action failed", type: 'error', isVisible: true });
        }
    };

    // Filter by search
    const filteredList = registrations.filter(r => 
        searchTerm === '' || 
        r.user_detail?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user_detail?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user_detail?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.event_detail?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            {/* Filters */}
            <Card className="border border-gray-100 shadow-sm bg-white">
                <div className="p-4 space-y-4">
                    {/* Main Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        {/* Search */}
                        <div className="relative md:col-span-4 lg:col-span-3">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                                placeholder="Search user or event..." 
                                className="pl-9 bg-gray-50 border-0"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Status Filter Buttons */}
                        <div className="md:col-span-8 lg:col-span-9 flex flex-wrap gap-2">
                            {['PENDING', 'WAITLIST', 'APPROVED', 'ALL'].map(status => (
                                <Button
                                    key={status}
                                    variant={filterStatus === status ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFilterStatus(status)}
                                    className={filterStatus === status ? 'bg-[#4D4DA4] hover:bg-[#FF5485] text-white' : ''}
                                >
                                    {status === 'PENDING' ? 'Needs Action' : status}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
                    {filteredList.map((reg) => (
                        <Card 
                            key={reg.id} 
                            className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => router.push(`/admin/${scope.toLowerCase()}/events/${reg.event}`)}
                        >
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Avatar className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50 flex-shrink-0">
                                        <AvatarImage src={getMediaUrl(reg.user_detail?.avatar) || undefined} className="object-cover" />
                                        <AvatarFallback className="rounded-full font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                                            {getInitials(reg.user_detail?.first_name, reg.user_detail?.last_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-base font-semibold text-[#121213] truncate">
                                            {reg.user_detail?.first_name} {reg.user_detail?.last_name}
                                        </CardTitle>
                                        <CardDescription className="text-xs truncate">
                                            {reg.user_detail?.email}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-xs text-muted-foreground uppercase font-semibold">Event</span>
                                        <Link 
                                            href={`/admin/${scope.toLowerCase()}/events/${reg.event}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="font-medium text-[#4D4DA4] hover:text-[#FF5485] truncate max-w-[200px]"
                                        >
                                            {reg.event_detail?.title || `Event #${reg.event}`}
                                        </Link>
                                    </div>
                                    {reg.event_detail?.location_name && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-xs text-muted-foreground uppercase font-semibold">Location</span>
                                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{reg.event_detail.location_name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-xs text-muted-foreground uppercase font-semibold">Applied</span>
                                        <span className="text-xs text-muted-foreground">{new Date(reg.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-xs text-muted-foreground uppercase font-semibold">Status</span>
                                        <Badge variant="outline" className={cn(
                                            reg.status.includes('PENDING') && 'bg-yellow-50 text-yellow-700 border-yellow-200',
                                            reg.status === 'APPROVED' && 'bg-green-50 text-green-700 border-green-200',
                                            reg.status === 'WAITLIST' && 'bg-orange-50 text-orange-700 border-orange-200',
                                            reg.status === 'REJECTED' && 'bg-red-50 text-red-700 border-red-200',
                                            'bg-gray-50 text-gray-700 border-gray-200'
                                        )}>
                                            {reg.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex gap-2 pt-2">
                                    <Button 
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 gap-2 text-green-700 hover:text-green-800 hover:bg-green-50"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAction(reg.id, 'APPROVED');
                                        }}
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        Approve
                                    </Button>
                                    <Button 
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 gap-2 text-red-700 hover:text-red-800 hover:bg-red-50"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAction(reg.id, 'REJECTED');
                                        }}
                                    >
                                        <XCircle className="h-4 w-4" />
                                        Reject
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {filteredList.length === 0 && (
                        <Card>
                            <CardContent className="py-20 text-center">
                                <p className="text-muted-foreground">
                                    {loading ? 'Loading...' : 'No applications found matching criteria.'}
                                </p>
                            </CardContent>
                        </Card>
                    )}
            </div>

            {/* Desktop Table View */}
            <Card className="hidden md:block border border-gray-100 shadow-sm bg-white overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-gray-100 hover:bg-transparent">
                                <TableHead className="h-12 text-gray-600 font-semibold">Applicant</TableHead>
                                <TableHead className="h-12 text-gray-600 font-semibold">Event</TableHead>
                                <TableHead className="h-12 text-gray-600 font-semibold">Applied</TableHead>
                                <TableHead className="h-12 text-gray-600 font-semibold">Status</TableHead>
                                <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredList.map((reg) => (
                                <TableRow 
                                    key={reg.id} 
                                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/admin/${scope.toLowerCase()}/events/${reg.event}`)}
                                >
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 rounded-full border border-gray-200 bg-gray-50">
                                                <AvatarImage src={getMediaUrl(reg.user_detail?.avatar) || undefined} className="object-cover" />
                                                <AvatarFallback className="rounded-full font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                                                    {getInitials(reg.user_detail?.first_name, reg.user_detail?.last_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-semibold text-[#121213]">
                                                    {reg.user_detail?.first_name} {reg.user_detail?.last_name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">{reg.user_detail?.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <Link 
                                            href={`/admin/${scope.toLowerCase()}/events/${reg.event}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="font-medium text-[#4D4DA4] hover:text-[#FF5485] block"
                                        >
                                            {reg.event_detail?.title || `Event #${reg.event}`}
                                        </Link>
                                        {reg.event_detail?.location_name && (
                                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                <MapPin className="h-3 w-3" />
                                                {reg.event_detail.location_name}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(reg.created_at).toLocaleDateString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <Badge variant="outline" className={cn(
                                            reg.status.includes('PENDING') && 'bg-yellow-50 text-yellow-700 border-yellow-200',
                                            reg.status === 'APPROVED' && 'bg-green-50 text-green-700 border-green-200',
                                            reg.status === 'WAITLIST' && 'bg-orange-50 text-orange-700 border-orange-200',
                                            reg.status === 'REJECTED' && 'bg-red-50 text-red-700 border-red-200',
                                            'bg-gray-50 text-gray-700 border-gray-200'
                                        )}>
                                            {reg.status.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-4 text-right">
                                        <div 
                                            className="flex items-center justify-end gap-1"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button 
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleAction(reg.id, 'APPROVED')}
                                                className="h-8 w-8 p-0 text-gray-500 hover:text-green-600 hover:bg-green-50"
                                                title="Approve"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleAction(reg.id, 'REJECTED')}
                                                className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                                title="Reject"
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredList.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-20 text-center">
                                        <p className="text-muted-foreground">
                                            {loading ? 'Loading...' : 'No applications found matching criteria.'}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
            </Card>

            <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
        </>
    );
}

