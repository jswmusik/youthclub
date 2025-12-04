'use client';

import { useParams, useRouter } from 'next/navigation';
import ScheduleEditor from '../../../../../../components/bookings/ScheduleEditor';

export default function MuniResourceSchedulePage() {
  const { id } = useParams();
  const router = useRouter();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800">← Back</button>
        <h1 className="text-2xl font-bold">Manage Schedule</h1>
      </div>
      <ScheduleEditor resourceId={Number(id)} />
    </div>
  );
}

