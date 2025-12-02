'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { inventoryApi, Item } from '@/lib/inventory-api';
import { getMediaUrl } from '@/app/utils';

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
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'AVAILABLE':
        return <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-medium">Available</span>;
      case 'BORROWED':
        return <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium">Borrowed</span>;
      case 'MAINTENANCE':
        return <span className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-medium">In Maintenance</span>;
      case 'MISSING':
        return <span className="bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full font-medium">Missing</span>;
      case 'HIDDEN':
        return <span className="bg-slate-100 text-slate-800 text-xs px-3 py-1 rounded-full font-medium">Hidden</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-xs px-3 py-1 rounded-full font-medium">{status}</span>;
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading item details...</div>;
  if (!item) return <div className="p-12 text-center text-red-500">Item not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Link href={buildUrlWithParams(basePath)} className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-2">
          <span>←</span> Back to Inventory
        </Link>
        <div className="flex gap-2">
          <Link 
            href={`${basePath}/edit/${item.id}`} 
            className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700"
          >
            Edit Item
          </Link>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Image Section */}
        {item.image && (
          <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
            <img 
              src={getMediaUrl(item.image) || item.image} 
              alt={item.title}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}

        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{item.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Club: {item.club_name}</span>
                {item.category_details && (
                  <span className="flex items-center gap-1">
                    {item.category_details.icon} {item.category_details.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(item.status)}
              {item.active_loan && (
                <div className="text-xs text-gray-500 text-right">
                  <div>Borrowed by: {item.active_loan.user_name}</div>
                  {item.active_loan.is_guest && (
                    <span className="text-orange-600 font-bold">(Guest)</span>
                  )}
                  <div>Due: {new Date(item.active_loan.due_at).toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Description</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{item.description}</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Borrowing Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Borrow Duration:</span>
                  <span className="font-medium">{item.max_borrow_duration} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Queue Count:</span>
                  <span className="font-medium text-purple-600">{item.queue_count} waiting</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Metadata</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Created:</span>
                  <span className="font-medium">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                {item.internal_note && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Internal Note:</span>
                    <span className="font-medium">{item.internal_note}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          {item.tags_details && item.tags_details.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {item.tags_details.map(tag => (
                  <span 
                    key={tag.id}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
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

