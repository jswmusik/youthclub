'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import IndividualHistory from '@/app/components/questionnaires/IndividualHistory';
import { ArrowLeft, BarChart3, ChevronUp, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

function QuestionnairesPageContent() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [analytics, setAnalytics] = useState({ total_questionnaires: 0, total_rewards_earned: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  // Sync searchQuery with URL params
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    setSearchQuery(urlSearch);
  }, [searchParams]);

  const updateSearch = (value: string) => {
    setSearchQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.set('page', '1'); // Reset to page 1 when searching
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    router.push(pathname);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link 
          href={`/admin/super/youth/${id}`}
          className="text-sm text-gray-500 hover:text-[#4D4DA4] flex items-center gap-1 w-fit transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Questionnaires</h1>
          <p className="text-gray-500 mt-1">View all questionnaires answered by this user</p>
        </div>
      </div>

      {/* Analytics */}
      <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-500">Analytics</h3>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0 h-8">
              <ChevronUp className={cn(
                "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                analyticsExpanded ? "rotate-0" : "rotate-180"
              )} />
              <span className="sr-only">Toggle Analytics</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 pt-2">
            {/* Card 1: Total Questionnaires */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Questionnaires</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total_questionnaires}</div>
              </CardContent>
            </Card>

            {/* Card 2: Total Rewards Earned */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Rewards Earned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total_rewards_earned}</div>
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Search */}
            <div className="relative md:col-span-10 lg:col-span-10">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search by questionnaire title..." 
                className="pl-9 bg-gray-50 border-0"
                value={searchQuery}
                onChange={e => updateSearch(e.target.value)}
              />
            </div>
            
            {/* Clear Button */}
            <div className="md:col-span-2 lg:col-span-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
              >
                <X className="h-4 w-4" /> Clear
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Questionnaires List */}
      <IndividualHistory userId={id} onAnalyticsUpdate={setAnalytics} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <div className="p-8">
        <QuestionnairesPageContent />
      </div>
    </Suspense>
  );
}

