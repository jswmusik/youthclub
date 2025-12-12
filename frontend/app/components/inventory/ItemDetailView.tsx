'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { inventoryApi, Item } from '@/lib/inventory-api';
import { getMediaUrl } from '@/app/utils';
import { Package, Clock, Users, Calendar, Tag, ChevronLeft, Edit, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
        return <Badge className="bg-green-50 text-green-700 border-green-200">Available</Badge>;
      case 'BORROWED':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Borrowed</Badge>;
      case 'MAINTENANCE':
        return <Badge className="bg-red-50 text-red-700 border-red-200">In Maintenance</Badge>;
      case 'MISSING':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Missing</Badge>;
      case 'HIDDEN':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Hidden</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-400">Loading item details...</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href={buildUrlWithParams(basePath)}>
            <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
              <ChevronLeft className="h-4 w-4" />
              Back to Inventory
            </Button>
          </Link>
        </div>
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-800 font-medium">Item not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Back Button and Action Buttons */}
      <div className="flex items-center justify-between">
        <Link href={buildUrlWithParams(basePath)}>
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-4 w-4" />
            Back to Inventory
          </Button>
        </Link>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Link href={`${basePath}/view/${item.id}/history?${searchParams.toString()}`}>
            <Button variant="outline" size="sm" className="gap-2 text-gray-700 hover:text-[#4D4DA4] hover:border-[#4D4DA4]">
              <History className="h-4 w-4" />
              View History
            </Button>
          </Link>
          <Link href={`${basePath}/edit/${item.id}?${searchParams.toString()}`}>
            <Button size="sm" className="gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white">
              <Edit className="h-4 w-4" />
              Edit Item
            </Button>
          </Link>
        </div>
      </div>

      {/* ITEM HEADER CARD */}
      <Card className="border border-gray-100 shadow-sm overflow-hidden bg-gradient-to-br from-[#EBEBFE] via-[#EBEBFE]/50 to-white !py-0 !gap-0">
        {/* Cover Image */}
        {item.image && (
          <div className="h-48 md:h-64 bg-gradient-to-r from-[#4D4DA4] via-[#4D4DA4]/80 to-[#FF5485] relative w-full overflow-hidden">
            <img 
              src={getMediaUrl(item.image) || item.image} 
              alt={item.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-black/10"></div>
          </div>
        )}

        <CardContent className={`p-6 sm:p-10 ${item.image ? 'pt-6 sm:pt-10' : ''} bg-gradient-to-br from-[#EBEBFE] via-[#EBEBFE]/50 to-white`}>
          <div className={`flex flex-col sm:flex-row items-start sm:items-end gap-6 ${item.image ? '-mt-20 sm:-mt-24' : ''}`}>
            {!item.image && (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-white shadow-lg bg-gradient-to-br from-[#4D4DA4] to-[#FF5485] flex items-center justify-center text-white flex-shrink-0">
                <Package className="w-12 h-12 sm:w-16 sm:h-16" />
              </div>
            )}
            
            <div className="text-center sm:text-left flex-1 space-y-3 pt-4 sm:pt-0">
              <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg inline-block">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#121213]">
                  {item.title}
                </h1>
                <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4 text-gray-600 mt-2 flex-wrap">
                  {item.club_name && (
                    <span className="flex items-center gap-1.5 text-sm sm:text-base">
                      <Package className="w-4 h-4 text-[#4D4DA4]" />
                      <span className="font-medium text-[#121213]">{item.club_name}</span>
                    </span>
                  )}
                  {item.category_details && (
                    <span className="flex items-center gap-1.5 text-sm sm:text-base">
                      <span>{item.category_details.icon}</span>
                      <span className="font-medium text-[#121213]">{item.category_details.name}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center sm:items-end gap-3">
              {getStatusBadge(item.status)}
              {item.active_loan && (
                <div className="bg-white/80 backdrop-blur-sm px-4 py-3 rounded-lg text-right min-w-[200px]">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Currently Borrowed By</div>
                  <div className="font-semibold text-[#121213] text-sm sm:text-base">{item.active_loan.user_name}</div>
                  {item.active_loan.is_guest && (
                    <Badge className="mt-1 bg-orange-50 text-orange-700 border-orange-200 text-xs">Guest</Badge>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    Due: {new Date(item.active_loan.due_at).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* MAIN CONTENT */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* DESCRIPTION */}
          {item.description && (
            <Card className="border border-gray-100 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl font-bold text-[#121213]">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm sm:text-base text-[#121213] whitespace-pre-wrap leading-relaxed">{item.description}</p>
              </CardContent>
            </Card>
          )}

          {/* BORROWING INFORMATION */}
          {item.active_loan && (
            <Card className="border border-gray-100 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl font-bold text-[#121213]">Current Loan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#EBEBFE]/30 rounded-lg border border-[#EBEBFE]">
                  <span className="text-sm font-semibold text-gray-600">Borrower:</span>
                  <span className="font-medium text-[#121213]">{item.active_loan.user_name}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#EBEBFE]/30 rounded-lg border border-[#EBEBFE]">
                  <span className="text-sm font-semibold text-gray-600">Due Date:</span>
                  <span className="font-medium text-[#121213]">{new Date(item.active_loan.due_at).toLocaleString()}</span>
                </div>
                {item.active_loan.is_guest && (
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-sm font-semibold text-orange-800">⚠️ Guest User</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="space-y-4 sm:space-y-6">
          {/* DETAILS CARD */}
          <Card className="border border-gray-100 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl font-bold text-[#121213]">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Max Borrow Duration</label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#4D4DA4]" />
                  <p className="text-sm sm:text-base text-[#121213] font-medium">{item.max_borrow_duration} minutes</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Queue</label>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#4D4DA4]" />
                  <p className="text-sm sm:text-base font-medium">
                    {item.queue_count > 0 ? (
                      <span className="text-[#4D4DA4] font-semibold">{item.queue_count} waiting</span>
                    ) : (
                      <span className="text-gray-500">No queue</span>
                    )}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Created</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#4D4DA4]" />
                  <p className="text-sm sm:text-base text-[#121213] font-medium">{new Date(item.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {item.internal_note && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Internal Note</label>
                  <p className="text-sm sm:text-base text-[#121213] font-medium">{item.internal_note}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* TAGS CARD */}
          {item.tags_details && item.tags_details.length > 0 && (
            <Card className="border border-gray-100 shadow-sm bg-white">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[#4D4DA4]" />
                  <CardTitle className="text-lg sm:text-xl font-bold text-[#121213]">Tags</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {item.tags_details.map(tag => (
                    <Badge 
                      key={tag.id}
                      variant="outline"
                      className="bg-[#EBEBFE] text-[#4D4DA4] border-[#EBEBFE] text-sm font-semibold"
                    >
                      {tag.icon} {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

