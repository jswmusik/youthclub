'use client';

import { useState, useEffect } from 'react';
import { learningApi } from '@/lib/learning-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle2, Eye, TrendingUp, Star } from 'lucide-react';

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="border-gray-200">
                            <CardHeader className="pb-3">
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                No analytics data available.
            </div>
        );
    }

    const stats = [
        {
            title: 'Started Course',
            value: analytics.total_students,
            icon: Users,
            color: 'text-[#4D4DA4]',
            bgColor: 'bg-[#4D4DA4]/10',
            description: 'Users who have started the course'
        },
        {
            title: 'Completed',
            value: analytics.completions,
            icon: CheckCircle2,
            color: 'text-[#10B981]',
            bgColor: 'bg-[#10B981]/10',
            description: 'Users who completed the course'
        },
        {
            title: 'Viewed Only',
            value: analytics.viewed,
            icon: Eye,
            color: 'text-[#FF5485]',
            bgColor: 'bg-[#FF5485]/10',
            description: 'Users who viewed but didn\'t start'
        },
        {
            title: 'Completion Rate',
            value: `${analytics.completion_rate}%`,
            icon: TrendingUp,
            color: 'text-[#4D4DA4]',
            bgColor: 'bg-[#4D4DA4]/10',
            description: 'Percentage of starters who completed'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.title} className="border-gray-200 hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <CardTitle className="text-sm font-medium text-gray-600">
                                    {stat.title}
                                </CardTitle>
                                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                    <Icon className={`w-4 h-4 ${stat.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-[#121213] mb-1">
                                    {stat.value}
                                </div>
                                <p className="text-xs text-gray-500">
                                    {stat.description}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Additional Info */}
            <Card className="border-gray-200">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        Average Rating
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="text-4xl font-bold text-[#121213]">
                            {analytics.average_rating > 0 ? analytics.average_rating.toFixed(1) : 'N/A'}
                        </div>
                        {analytics.average_rating > 0 && (
                            <>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`w-5 h-5 ${
                                                star <= Math.round(analytics.average_rating)
                                                    ? 'text-yellow-500 fill-yellow-500'
                                                    : 'text-gray-300'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <div className="text-sm text-gray-500 ml-2">
                                    ({typeof analytics.total_ratings === 'number' ? analytics.total_ratings : 0} {analytics.total_ratings === 1 ? 'vote' : 'votes'})
                                </div>
                            </>
                        )}
                        {analytics.average_rating === 0 && (
                            <p className="text-sm text-gray-500">No ratings yet</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

