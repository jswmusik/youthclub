'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface StatusBadgeProps {
    status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const t = useTranslations('knowledgeAdmin.courses.statusBadge');
    
    switch (status) {
        case 'PUBLISHED':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('published')}
                </span>
            );
        case 'DRAFT':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]">
                    <AlertCircle className="w-3 h-3" />
                    {t('draft')}
                </span>
            );
        case 'SCHEDULED':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border-[var(--brand-peach)]/30">
                    <Clock className="w-3 h-3" />
                    {t('scheduled')}
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]">
                    {status}
                </span>
            );
    }
}