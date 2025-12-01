'use client';
import GroupForm from '../../../../components/GroupForm';
export default function Page() { 
  return <div className="p-8"><h1 className="text-2xl font-bold mb-6">New Club Group</h1><GroupForm redirectPath="/admin/club/groups" /></div>; 
}