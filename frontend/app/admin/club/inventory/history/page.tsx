'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api'; // We can use raw api or add to inventory-api.ts
import LendingHistoryTable from '@/app/components/inventory/LendingHistoryTable';

export default function InventoryHistoryPage() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch history
        api.get('/inventory/history/')
           .then(res => {
               // Handle paginated response (results) or direct array
               const data = res.data;
               setSessions(Array.isArray(data) ? data : (data.results || []));
               setLoading(false);
           })
           .catch(err => {
               console.error(err);
               setSessions([]);
               setLoading(false);
           });
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Lending History</h1>
            <p className="text-slate-500">See who borrowed items and when.</p>
            
            {loading ? (
                <div>Loading history...</div>
            ) : (
                <LendingHistoryTable sessions={sessions} />
            )}
        </div>
    );
}

