// frontend/app/(public)/events/page.tsx
import { Metadata } from 'next';
import EventsListClient from './EventsListClient';

export const metadata: Metadata = {
  title: 'Alla aktiviteter | Ungdomsappen',
  description: 'Utforska alla kommande aktiviteter och evenemang för unga. Hitta något som passar dig!',
  openGraph: {
    title: 'Alla aktiviteter | Ungdomsappen',
    description: 'Utforska alla kommande aktiviteter och evenemang för unga. Hitta något som passar dig!',
    type: 'website',
    locale: 'sv_SE',
  },
};

export default function EventsListPage() {
  return <EventsListClient />;
}

