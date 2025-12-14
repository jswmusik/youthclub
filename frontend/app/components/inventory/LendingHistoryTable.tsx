'use client';

import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface LendingSession {
    id: number;
    item: number; // Item ID
    item_title: string;
    user_name: string;
    borrowed_at: string;
    due_at?: string;
    returned_at: string | null;
    status: string;
    is_guest: boolean;
}

interface LendingHistoryTableProps {
    sessions: LendingSession[];
    showReturnButton?: boolean;
    onReturnItem?: (itemId: number) => void;
}

export default function LendingHistoryTable({ sessions, showReturnButton = false, onReturnItem }: LendingHistoryTableProps) {
    // Safety check: ensure sessions is always an array
    const sessionsArray = Array.isArray(sessions) ? sessions : [];
    
    const isOverdue = (dueAt?: string) => {
        if (!dueAt) return false;
        return new Date(dueAt) < new Date();
    };
    
    if (sessionsArray.length === 0) {
        return (
            <Card className="border border-gray-100 shadow-sm bg-white">
                <CardContent className="p-12 text-center text-gray-500">
                    No history found.
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-0">
                {/* Mobile: Cards */}
                <div className="block md:hidden divide-y divide-gray-100">
                    {sessionsArray.map((session) => {
                        const overdue = session.status === 'ACTIVE' && isOverdue(session.due_at);
                        return (
                            <div key={session.id} className={`p-4 space-y-2 ${overdue ? 'bg-red-50' : session.is_guest ? 'bg-orange-50' : ''}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-[#121213] truncate">{session.item_title}</p>
                                        <p className="text-xs text-gray-500 truncate">{session.user_name}</p>
                                    </div>
                                    {session.is_guest && (
                                        <Badge className="bg-pink-50 text-[#FF5485] border-[#FF5485]/30 text-xs">Guest</Badge>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500">Time Out:</span>
                                        <span className="ml-1 text-[#121213]">{format(new Date(session.borrowed_at), 'MMM d, HH:mm')}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Due:</span>
                                        <span className={`ml-1 ${overdue ? 'text-[#EF4444] font-bold' : 'text-[#121213]'}`}>
                                            {session.due_at ? format(new Date(session.due_at), 'MMM d, HH:mm') : '-'}
                                            {overdue && ' ⚠️'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Time In:</span>
                                        <span className="ml-1 text-[#121213]">{session.returned_at ? format(new Date(session.returned_at), 'HH:mm') : '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Status:</span>
                                        <span className="ml-1">
                                            {session.status === 'ACTIVE' && (
                                                <Badge variant="outline" className={`text-xs ${
                                                    overdue 
                                                        ? 'bg-red-50 text-[#EF4444] border-[#EF4444]/30' 
                                                        : 'bg-green-50 text-[#10B981] border-[#10B981]/30'
                                                }`}>
                                                    {overdue ? 'Overdue' : 'Active'}
                                                </Badge>
                                            )}
                                            {session.status === 'RETURNED_USER' && (
                                                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">Returned</Badge>
                                            )}
                                            {session.status === 'RETURNED_SYSTEM' && (
                                                <Badge variant="outline" className="text-xs bg-red-50 text-[#EF4444] border-[#EF4444]/30">System Auto-Return</Badge>
                                            )}
                                            {session.status === 'RETURNED_ADMIN' && (
                                                <Badge variant="outline" className="text-xs bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/30">Admin Force-Return</Badge>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Desktop: Table */}
                <Table className="hidden md:table">
                    <TableHeader>
                        <TableRow className="border-b border-gray-100 bg-white hover:bg-white">
                            <TableHead className="h-12 px-6 text-gray-600 font-semibold">Item</TableHead>
                            <TableHead className="h-12 px-6 text-gray-600 font-semibold">Borrower</TableHead>
                            <TableHead className="h-12 px-6 text-gray-600 font-semibold">Time Out</TableHead>
                            <TableHead className="h-12 px-6 text-gray-600 font-semibold">Due Date</TableHead>
                            <TableHead className="h-12 px-6 text-gray-600 font-semibold">Time In</TableHead>
                            <TableHead className="h-12 px-6 text-gray-600 font-semibold">Status</TableHead>
                            {showReturnButton && (
                                <TableHead className="h-12 px-6 text-gray-600 font-semibold">Actions</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sessionsArray.map((session) => {
                            const overdue = session.status === 'ACTIVE' && isOverdue(session.due_at);
                            return (
                                <TableRow 
                                    key={session.id} 
                                    className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                                        overdue 
                                            ? 'bg-red-50/50' 
                                            : session.is_guest 
                                                ? 'bg-orange-50/50' 
                                                : ''
                                    }`}
                                >
                                    <TableCell className="py-4 px-6">
                                        <div className="text-sm font-semibold text-[#121213]">{session.item_title}</div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm text-[#121213]">{session.user_name}</div>
                                            {session.is_guest && (
                                                <Badge className="bg-pink-50 text-[#FF5485] border-[#FF5485]/30 text-xs">Guest</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="text-sm text-gray-500">{format(new Date(session.borrowed_at), 'MMM d, HH:mm')}</div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        {session.due_at ? (
                                            <div className={`text-sm font-semibold ${overdue ? 'text-[#EF4444]' : 'text-[#121213]'}`}>
                                                {format(new Date(session.due_at), 'MMM d, HH:mm')}
                                                {overdue && ' ⚠️'}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-400">-</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="text-sm text-gray-500">
                                            {session.returned_at ? format(new Date(session.returned_at), 'HH:mm') : '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        {session.status === 'ACTIVE' && (
                                            <Badge variant="outline" className={`text-xs font-semibold ${
                                                overdue 
                                                    ? 'bg-red-50 text-[#EF4444] border-[#EF4444]/30' 
                                                    : 'bg-green-50 text-[#10B981] border-[#10B981]/30'
                                            }`}>
                                                {overdue ? 'Overdue' : 'Active'}
                                            </Badge>
                                        )}
                                        {session.status === 'RETURNED_USER' && (
                                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">Returned</Badge>
                                        )}
                                        {session.status === 'RETURNED_SYSTEM' && (
                                            <Badge variant="outline" className="text-xs bg-red-50 text-[#EF4444] border-[#EF4444]/30" title="User forgot to return, system auto-closed">
                                                System Auto-Return
                                            </Badge>
                                        )}
                                        {session.status === 'RETURNED_ADMIN' && (
                                            <Badge variant="outline" className="text-xs bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/30">Admin Force-Return</Badge>
                                        )}
                                    </TableCell>
                                    {showReturnButton && (
                                        <TableCell className="py-4 px-6">
                                            {session.status === 'ACTIVE' && onReturnItem && (
                                                <Button
                                                    onClick={() => onReturnItem(session.item)}
                                                    size="sm"
                                                    className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white text-xs font-semibold rounded-full"
                                                >
                                                    Return Item
                                                </Button>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

