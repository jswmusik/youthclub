'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ScheduleEditor from '../../../../../../components/bookings/ScheduleEditor';
import { Button } from '@/components/ui/button';

export default function SuperResourceSchedulePage() {
  const { id } = useParams();
  const router = useRouter();

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/admin/super/bookings/resources`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#121213]">Manage Schedule</h1>
          <p className="text-xs text-gray-500 mt-0.5">Define when this resource is available for booking.</p>
        </div>
      </div>
      <ScheduleEditor resourceId={Number(id)} />
    </div>
  );
}

