'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { inventoryApi, Item } from '@/lib/inventory-api';
import { getMediaUrl } from '@/app/utils';
import { Package, Clock, Users, Calendar, Tag } from 'lucide-react';

interface ItemDetailViewProps {
  itemId: string;
  basePath: string;
}

export default function ItemDetailView({ itemId, basePath }: ItemDetailViewProps) {
  const searchParams = useSearchParams();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryApi.getItem(itemId)
      .then(data => {
        setItem(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [itemId]);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const club = searchParams.get('club');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (status) params.set('status', status);
    if (club) params.set('club', club);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'AVAILABLE':
        return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">Available</span>;
      case 'BORROWED':
        return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">Borrowed</span>;
      case 'MAINTENANCE':
        return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">In Maintenance</span>;
      case 'MISSING':
        return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold">Missing</span>;
      case 'HIDDEN':
        return <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-xs font-bold">Hidden</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Loading item details...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">Item not found.</p>
        </div>
        <Link href={buildUrlWithParams(basePath)} className="text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Inventory
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <Link href={buildUrlWithParams(basePath)} className="text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Inventory
        </Link>
        <div className="flex gap-4">
          <Link 
            href={`${basePath}/view/${item.id}/history?${searchParams.toString()}`}
            className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm font-medium"
          >
            View History
          </Link>
          <Link 
            href={`${basePath}/edit/${item.id}?${searchParams.toString()}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow font-medium"
          >
            Edit Item
          </Link>
        </div>
      </div>

      {/* ITEM HEADER CARD */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="relative">
        {item.image && (
            <div className="w-full h-64 bg-gray-100 flex items-center justify-center overflow-hidden">
            <img 
              src={getMediaUrl(item.image) || item.image} 
              alt={item.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
          </div>
        )}
          <div className={`p-8 ${item.image ? '' : ''}`}>
            <div className="flex items-start gap-6">
              {!item.image && (
                <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                  <Package className="w-12 h-12" />
                </div>
              )}
            <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">{item.title}</h1>
                    <div className="flex items-center gap-4 text-gray-600">
                      <span className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {item.club_name}
                      </span>
                {item.category_details && (
                  <span className="flex items-center gap-1">
                    {item.category_details.icon} {item.category_details.name}
                  </span>
                )}
              </div>
            </div>
                  <div className="flex flex-col items-end gap-3">
              {getStatusBadge(item.status)}
              {item.active_loan && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-1">Currently Borrowed By</div>
                        <div className="font-semibold text-gray-900">{item.active_loan.user_name}</div>
                  {item.active_loan.is_guest && (
                          <span className="inline-block mt-1 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold">Guest</span>
                  )}
                        <div className="text-xs text-gray-500 mt-2">
                          Due: {new Date(item.active_loan.due_at).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
            </div>
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN CONTENT */}
        <div className="lg:col-span-2 space-y-6">
          {/* DESCRIPTION */}
          {item.description && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* BORROWING INFORMATION */}
          {item.active_loan && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Current Loan</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-semibold text-gray-700">Borrower:</span>
                  <span className="font-medium text-gray-900">{item.active_loan.user_name}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-semibold text-gray-700">Due Date:</span>
                  <span className="font-medium text-gray-900">{new Date(item.active_loan.due_at).toLocaleString()}</span>
                </div>
                {item.active_loan.is_guest && (
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-sm font-semibold text-orange-800">⚠️ Guest User</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          {/* DETAILS CARD */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Borrow Duration</label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-900 font-medium">{item.max_borrow_duration} minutes</p>
              </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Queue</label>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-900 font-medium">
                    {item.queue_count > 0 ? (
                      <span className="text-purple-600 font-semibold">{item.queue_count} waiting</span>
                    ) : (
                      <span className="text-gray-500">No queue</span>
                    )}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Created</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-900 font-medium">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
              </div>

              {item.internal_note && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Internal Note</label>
                  <p className="text-gray-900 font-medium">{item.internal_note}</p>
                </div>
              )}
            </div>
          </div>

          {/* TAGS CARD */}
          {item.tags_details && item.tags_details.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-gray-600" />
                <h2 className="text-xl font-bold text-gray-800">Tags</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.tags_details.map(tag => (
                  <span 
                    key={tag.id}
                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium border border-purple-200"
                  >
                    {tag.icon} {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

