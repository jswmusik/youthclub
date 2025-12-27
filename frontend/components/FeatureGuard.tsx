'use client';

import React from 'react';
import { useLicense } from '../hooks/useLicense';

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function FeatureGuard({ feature, children, fallback = null }: FeatureGuardProps) {
  const { hasFeature } = useLicense();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

