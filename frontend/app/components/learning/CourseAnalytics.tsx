'use client';

import { useState, useEffect } from 'react';
import { learningApi } from '@/lib/learning-api';
import { Users, CheckCircle2, Eye, TrendingUp, Star, BarChart3 } from 'lucide-react';

interface Props {
    courseSlug: string;
}

interface AnalyticsData {
    total_students: number;
    completions: number;
    viewed: number;
    completion_rate: number;
    average_rating: number;
    total_ratings: number;
}

export default function CourseAnalytics({ courseSlug }: Props) {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                setLoading(true);
                const response = await learningApi.getCourseAnalytics(courseSlug);
                console.log('Analytics data:', response.data);
                setAnalytics(response.data);
            } catch (err: any) {
                console.error('Failed to load analytics', err);
                setError(err.response?.data?.error || 'Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };

        if (courseSlug) {
            loadAnalytics();
        }
    }, [courseSlug]);

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                    <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--dark-600)] animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-5 w-32 bg-[var(--dark-600)] rounded animate-pulse" />
                                <div className="h-4 w-48 bg-[var(--dark-600)] rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-[var(--dark-700)] rounded-xl p-4 animate-pulse">
                                    <div className="h-4 w-20 bg-[var(--dark-600)] rounded mb-3" />
                                    <div className="h-8 w-16 bg-[var(--dark-600)] rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[var(--brand-red)]/20 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-[var(--brand-red)]" />
                </div>
                <p className="text-[var(--brand-red)] font-medium">{error}</p>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-[var(--brand-light)]/30" />
                </div>
                <p className="text-[var(--brand-light)]/50">No analytics data available.</p>
            </div>
        );
    }

    const stats = [
        {
            title: 'Started Course',
            value: analytics.total_students,
            icon: Users,
            gradient: 'from-[var(--brand-primary)] to-[var(--brand-purple)]',
            borderColor: 'border-l-[var(--brand-primary)]',
            description: 'Users who have started the course'
        },
        {
            title: 'Completed',
            value: analytics.completions,
            icon: CheckCircle2,
            gradient: 'from-[var(--brand-green)] to-[var(--brand-third)]',
            borderColor: 'border-l-[var(--brand-green)]',
            description: 'Users who completed the course'
        },
        {
            title: 'Viewed Only',
            value: analytics.viewed,
            icon: Eye,
            gradient: 'from-[var(--brand-red)] to-[var(--brand-peach)]',
            borderColor: 'border-l-[var(--brand-red)]',
            description: 'Users who viewed but didn\'t start'
        },
        {
            title: 'Completion Rate',
            value: `${analytics.completion_rate}%`,
            icon: TrendingUp,
            gradient: 'from-[var(--brand-blue)] to-[var(--brand-primary)]',
            borderColor: 'border-l-[var(--brand-blue)]',
            description: 'Percentage of starters who completed'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--brand-light)]">Course Analytics</h2>
                            <p className="text-sm text-[var(--brand-light)]/50">Track engagement and completion metrics</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {stats.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <div 
                                    key={stat.title} 
                                    className={`bg-[var(--dark-700)] rounded-xl p-4 border-l-4 ${stat.borderColor} hover:bg-[var(--dark-600)] transition-all`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-medium text-[var(--brand-light)]/60">
                                            {stat.title}
                                        </span>
                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                                            <Icon className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] mb-1">
                                        {stat.value}
                                    </div>
                                    <p className="text-xs text-[var(--brand-light)]/40">
                                        {stat.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Rating Card */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center">
                            <Star className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--brand-light)]">Average Rating</h2>
                            <p className="text-sm text-[var(--brand-light)]/50">User feedback and satisfaction</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="flex items-center gap-6 flex-wrap">
                        <div className="text-5xl font-bold text-[var(--brand-light)]">
                            {analytics.average_rating > 0 ? analytics.average_rating.toFixed(1) : 'N/A'}
                        </div>
                        {analytics.average_rating > 0 && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`w-6 h-6 ${
                                                star <= Math.round(analytics.average_rating)
                                                    ? 'text-[var(--brand-peach)] fill-[var(--brand-peach)]'
                                                    : 'text-[var(--dark-500)]'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <div className="text-sm text-[var(--brand-light)]/50">
                                    Based on {typeof analytics.total_ratings === 'number' ? analytics.total_ratings : 0} {analytics.total_ratings === 1 ? 'review' : 'reviews'}
                                </div>
                            </div>
                        )}
                        {analytics.average_rating === 0 && (
                            <p className="text-[var(--brand-light)]/50">No ratings yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
