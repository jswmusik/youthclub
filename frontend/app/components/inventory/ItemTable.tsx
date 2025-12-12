'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Item, inventoryApi } from '@/lib/inventory-api';
import Link from 'next/link';
import { Eye, Edit, Trash2, Package } from 'lucide-react';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
            return <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Available</Badge>;
        case 'BORROWED':
            return (
                <div className="flex flex-col items-start gap-1">
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Borrowed</Badge>
                    {activeLoan && (
                        <span className="text-xs text-gray-500">
                            by {activeLoan.user_name} 
                            {activeLoan.is_guest && <span className="text-orange-600 font-bold ml-1">(Guest)</span>}
                        </span>
                    )}
                </div>
            );
        case 'MAINTENANCE':
            return <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">Broken</Badge>;
        case 'MISSING':
            return <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">Missing</Badge>;
        default:
            return <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">{status}</Badge>;
    }
  };

  if (itemsArray.length === 0) {
    return (
      <Card className="border border-gray-100 shadow-sm">
        <div className="py-20 text-center">
          <p className="text-gray-500">No items found. Click "Add Item" to add some!</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* MOBILE: Cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {itemsArray.map(item => (
          <Card key={item.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 flex-shrink-0">
                  <AvatarImage src={item.image || undefined} className="object-cover" />
                  <AvatarFallback className="rounded-lg font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                    <Package className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base font-semibold text-[#121213] truncate">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500 truncate">
                    {item.internal_note || 'No description'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs text-gray-500 uppercase font-semibold">Category</span>
                  {item.category_details ? (
                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                      {item.category_details.icon} {item.category_details.name}
                    </Badge>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs text-gray-500 uppercase font-semibold">Status</span>
                  {getStatusBadge(item.status, item.active_loan)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs text-gray-500 uppercase font-semibold">Queue</span>
                  {item.queue_count > 0 ? (
                    <span className="text-sm font-medium text-purple-600">{item.queue_count} waiting</span>
                  ) : (
                    <span className="text-sm text-gray-400">Empty</span>
                  )}
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <Link href={buildUrlWithParams ? buildUrlWithParams(`${basePath}/view/${item.id}`) : `${basePath}/view/${item.id}`} className="flex-1">
                  <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                </Link>
                <Link href={buildUrlWithParams ? buildUrlWithParams(`${basePath}/edit/${item.id}`) : `${basePath}/edit/${item.id}`} className="flex-1">
                  <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setItemToDelete({ id: item.id, title: item.title })}
                  disabled={deletingId === item.id}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* DESKTOP: Table */}
      <Card className="hidden md:block border border-gray-100 shadow-sm bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 hover:bg-transparent">
              <TableHead className="h-12 text-gray-600 font-semibold">Item</TableHead>
              <TableHead className="h-12 text-gray-600 font-semibold">Category</TableHead>
              <TableHead className="h-12 text-gray-600 font-semibold">Status</TableHead>
              <TableHead className="h-12 text-gray-600 font-semibold">Queue</TableHead>
              <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsArray.map(item => (
              <TableRow key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 rounded-lg border border-gray-200 bg-gray-50">
                      <AvatarImage src={item.image || undefined} className="object-cover" />
                      <AvatarFallback className="rounded-lg font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                        <Package className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-[#121213]">{item.title}</div>
                      <div className="text-xs text-gray-500">{item.internal_note || 'No description'}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  {item.category_details ? (
                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                      {item.category_details.icon} {item.category_details.name}
                    </Badge>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="py-4">
                  {getStatusBadge(item.status, item.active_loan)}
                </TableCell>
                <TableCell className="py-4">
                  {item.queue_count > 0 ? (
                    <span className="text-sm font-medium text-purple-600">{item.queue_count} waiting</span>
                  ) : (
                    <span className="text-sm text-gray-400">Empty</span>
                  )}
                </TableCell>
                <TableCell className="py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={buildUrlWithParams ? buildUrlWithParams(`${basePath}/view/${item.id}`) : `${basePath}/view/${item.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={buildUrlWithParams ? buildUrlWithParams(`${basePath}/edit/${item.id}`) : `${basePath}/edit/${item.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setItemToDelete({ id: item.id, title: item.title })}
                      disabled={deletingId === item.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

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
    </>
  );
}

