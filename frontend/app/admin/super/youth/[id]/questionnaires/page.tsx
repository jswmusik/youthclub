'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import IndividualHistory from '@/app/components/questionnaires/IndividualHistory';
import { ArrowLeft, BarChart3, ChevronUp, Search, X, FileText, Gift } from 'lucide-react';
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
        <Card className="border-0 shadow-sm bg-gray-900">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-white drop-shadow-[0_0_8px_rgba(77,77,164,0.6)]" style={{ textShadow: '0 0 8px rgba(255, 84, 133, 0.4), 0 0 12px rgba(77, 77, 164, 0.3)' }}>
                Analytics Dashboard
              </h3>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0 h-8 text-gray-400 hover:text-white hover:bg-gray-800">
                <ChevronUp className={cn(
                  "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                  analyticsExpanded ? "rotate-0" : "rotate-180"
                )} />
                <span className="sr-only">Toggle Analytics</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="transition-all duration-500 ease-in-out">
            <CardContent className="p-4 sm:p-6 pt-3 transition-opacity duration-500 ease-in-out">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
                {/* Card 1: Total Questionnaires */}
                <Card className="bg-white/5 backdrop-blur-sm border border-[#4D4DA4]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                  style={{
                    boxShadow: '0 4px 20px rgba(77, 77, 164, 0.3), 0 0 20px rgba(255, 84, 133, 0.2)',
                  }}>
                  <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4D4DA4] to-[#FF5485] flex items-center justify-center shadow-lg"
                        style={{
                          boxShadow: '0 4px 15px rgba(77, 77, 164, 0.5), 0 0 20px rgba(255, 84, 133, 0.3)',
                        }}>
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-sm font-medium text-white/90">Total Questionnaires</CardTitle>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.total_questionnaires}</div>
                  </div>
                </Card>

                {/* Card 2: Total Rewards Earned */}
                <Card className="bg-white/5 backdrop-blur-sm border border-[#FF5485]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                  style={{
                    boxShadow: '0 4px 20px rgba(255, 84, 133, 0.3), 0 0 20px rgba(255, 84, 133, 0.2)',
                  }}>
                  <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5485] to-[#FF8FA3] flex items-center justify-center shadow-lg"
                        style={{
                          boxShadow: '0 4px 15px rgba(255, 84, 133, 0.5), 0 0 20px rgba(255, 143, 163, 0.3)',
                        }}>
                        <Gift className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-sm font-medium text-white/90">Rewards Earned</CardTitle>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.total_rewards_earned}</div>
                  </div>
                </Card>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="px-6 py-4 space-y-4">
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

