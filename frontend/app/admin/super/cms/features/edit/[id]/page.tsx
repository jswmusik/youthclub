'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import FeatureForm from '../../components/FeatureForm';
import { cmsApi } from '@/lib/cms-api';
import { FeatureShowcase } from '@/types/cms';

export default function EditFeaturePage() {
  const { id } = useParams();
  const [feature, setFeature] = useState<FeatureShowcase | null>(null);

  useEffect(() => {
    if (id) {
       // We fetch all and find one because we didn't make a single fetch endpoint for feature by ID 
       // (Optimization: You can add a retrieve detail endpoint in backend if list gets long)
       cmsApi.getFeatures().then(list => {
         const idStr = Array.isArray(id) ? id[0] : id;
         const found = list.find((f) => f.id.toString() === idStr);
         setFeature(found || null);
       });
    }
  }, [id]);

  if (!feature) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Feature</h1>
      <FeatureForm initialData={feature} isEditing={true} />
    </div>
  );
}

