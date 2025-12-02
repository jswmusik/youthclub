'use client';

import { format } from 'date-fns';

interface LendingSession {
    id: number;
    item_title: string;
    user_name: string;
    borrowed_at: string;
    returned_at: string | null;
    status: string;
    is_guest: boolean;
}

export default function LendingHistoryTable({ sessions }: { sessions: LendingSession[] }) {
    // Safety check: ensure sessions is always an array
    const sessionsArray = Array.isArray(sessions) ? sessions : [];
    
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Borrower</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Time Out</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Time In</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {sessionsArray.map((session) => (
                        <tr 
                            key={session.id} 
                            // HIGHLIGHT GUESTS IN ORANGE
                            className={session.is_guest ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-slate-50'}
                        >
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                {session.item_title}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-700">
                                {session.user_name}
                                {session.is_guest && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-200 text-orange-800">
                                        Guest
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                                {format(new Date(session.borrowed_at), 'MMM d, HH:mm')}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                                {session.returned_at ? format(new Date(session.returned_at), 'HH:mm') : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm">
                                {session.status === 'ACTIVE' && (
                                    <span className="text-green-600 font-bold">Active</span>
                                )}
                                {session.status === 'RETURNED_USER' && (
                                    <span className="text-slate-500">Returned</span>
                                )}
                                {session.status === 'RETURNED_SYSTEM' && (
                                    <span className="text-red-600 font-bold" title="User forgot to return, system auto-closed">
                                        System Auto-Return
                                    </span>
                                )}
                                {session.status === 'RETURNED_ADMIN' && (
                                    <span className="text-indigo-600">Admin Force-Return</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {sessionsArray.length === 0 && (
                <div className="p-8 text-center text-slate-500">No history found.</div>
            )}
        </div>
    );
}

