'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Item, inventoryApi } from '@/lib/inventory-api';
import Link from 'next/link';
import ConfirmationModal from '@/app/components/ConfirmationModal';

interface ItemTableProps {
  items: Item[];
  basePath: string; // e.g. '/admin/club/inventory'
  onDelete?: () => void; // Optional callback to refresh the list after successful delete
  onDeleteError?: (error: string) => void; // Optional callback for delete errors
  buildUrlWithParams?: (path: string) => string; // Function to build URLs with query params
}

export default function ItemTable({ items, basePath, onDelete, onDeleteError, buildUrlWithParams }: ItemTableProps) {
  const router = useRouter();
  const [itemToDelete, setItemToDelete] = useState<{ id: number; title: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Safety check: ensure items is always an array
  const itemsArray = Array.isArray(items) ? items : [];

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setDeletingId(itemToDelete.id);
    try {
      await inventoryApi.deleteItem(itemToDelete.id);
      // Refresh the page or call the callback
      if (onDelete) {
        onDelete();
      } else {
        router.refresh();
      }
      setItemToDelete(null);
    } catch (error: any) {
      console.error('Delete error:', error);
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to delete item.';
      if (onDeleteError) {
        onDeleteError(errorMessage);
      }
      setItemToDelete(null);
    } finally {
      setDeletingId(null);
    }
  };
  
  const getStatusBadge = (status: string, activeLoan: any) => {
    switch(status) {
        case 'AVAILABLE':
            return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Available</span>;
        case 'BORROWED':
            return (
                <div className="flex flex-col items-start">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Borrowed</span>
                    {activeLoan && (
                        <span className="text-xs text-slate-500 mt-1">
                            by {activeLoan.user_name} 
                            {activeLoan.is_guest && <span className="text-orange-600 font-bold ml-1">(Guest)</span>}
                        </span>
                    )}
                </div>
            );
        case 'MAINTENANCE':
            return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Broken</span>;
        case 'MISSING':
            return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">Missing</span>;
        default:
            return <span className="bg-slate-100 text-slate-800 text-xs px-2 py-1 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Item</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Queue</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {itemsArray.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="px-6 py-4">
                <div className="flex items-center">
                    {item.image ? (
                        <img src={item.image} alt="" className="h-10 w-10 rounded object-cover mr-3" />
                    ) : (
                        <div className="h-10 w-10 rounded bg-slate-200 flex items-center justify-center mr-3 text-slate-400">
                            IMG
                        </div>
                    )}
                    <div>
                        <div className="text-sm font-medium text-slate-900">{item.title}</div>
                        <div className="text-xs text-slate-500">{item.internal_note}</div>
                    </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-slate-500">
                {item.category_details ? (
                    <span className="flex items-center gap-1">
                        {item.category_details.icon} {item.category_details.name}
                    </span>
                ) : '-'}
              </td>
              <td className="px-6 py-4">
                {getStatusBadge(item.status, item.active_loan)}
              </td>
              <td className="px-6 py-4 text-sm text-slate-500">
                 {item.queue_count > 0 ? (
                    <span className="text-purple-600 font-medium">{item.queue_count} waiting</span>
                 ) : (
                    <span className="text-slate-400">Empty</span>
                 )}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  <Link 
                    href={buildUrlWithParams ? buildUrlWithParams(`${basePath}/view/${item.id}`) : `${basePath}/view/${item.id}`} 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-900 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </Link>
                  <Link 
                    href={buildUrlWithParams ? buildUrlWithParams(`${basePath}/edit/${item.id}`) : `${basePath}/edit/${item.id}`} 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-900 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Link>
                  <button
                    onClick={() => setItemToDelete({ id: item.id, title: item.title })}
                    disabled={deletingId === item.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-md hover:bg-red-100 hover:text-red-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {itemsArray.length === 0 && (
        <div className="p-8 text-center text-slate-500">
            No items found. Click "Create Item" to add some!
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isVisible={!!itemToDelete}
        onClose={() => {
          if (!deletingId) {
            setItemToDelete(null);
          }
        }}
        onConfirm={handleDelete}
        title="Confirm Deletion"
        message={itemToDelete ? `Are you sure you want to delete "${itemToDelete.title}"? This action cannot be undone.` : ''}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        isLoading={!!deletingId}
        variant="danger"
      />
    </div>
  );
}

