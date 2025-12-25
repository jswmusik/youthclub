'use client';
import { useEffect, useState } from 'react';
import FeatureShowcase from '@/app/components/cms/FeatureShowcase';
import { cmsApi } from '@/lib/cms-api';
import { FeatureShowcase as FeatureType } from '@/types/cms';

export default function ClientFeaturesPage() {
  const [features, setFeatures] = useState<FeatureType[]>([]);

  useEffect(() => {
    cmsApi.getFeatures().then(setFeatures);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <div className="py-20 text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter">What makes us special</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover the tools that power the next generation of youth communities.
        </p>
      </div>
      <FeatureShowcase features={features} />
    </main>
  );
}

