'use client';

import { Toaster as HotToaster } from 'react-hot-toast';

export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'transparent',
          boxShadow: 'none',
          padding: 0,
        },
      }}
    />
  );
}

