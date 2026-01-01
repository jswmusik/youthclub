'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Course } from '@/types/learning';
import CourseSettingsForm, { CourseSettingsFormRef } from './CourseSettingsForm';
import CurriculumBuilder from './CurriculumBuilder';
import CourseAnalytics from './CourseAnalytics';
import { ArrowLeft, Eye, Settings, BookOpen, BarChart3, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../../hooks/useToast';

interface Props {
    course: Course;
    basePath?: string;
}

export default function CourseEditorLayout({ course, basePath = '/admin/super/knowledge' }: Props) {
    const t = useTranslations('knowledgeAdmin.courses.edit');
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('settings');

    // Build URL preserving pagination params
    const buildUrlWithParams = (path: string) => {
        const params = new URLSearchParams(searchParams.toString());
        return params.toString() ? `${path}?${params.toString()}` : path;
    };
    const [prevTab, setPrevTab] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
    const settingsFormRef = useRef<CourseSettingsFormRef>(null);
    const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const { success, error, info, warning } = useToast();

    // Tab order for animation direction
    const tabOrder = ['settings', 'curriculum', 'analytics'];

    const tabs = [
        { id: 'settings', label: t('tabs.settings'), icon: Settings },
        { id: 'curriculum', label: t('tabs.curriculum'), icon: BookOpen },
        { id: 'analytics', label: t('tabs.analytics'), icon: BarChart3 },
    ];

    // Update indicator position
    const updateIndicator = useCallback(() => {
        const activeTabElement = tabRefs.current[activeTab];
        if (activeTabElement) {
            const container = activeTabElement.parentElement;
            if (container) {
                const containerRect = container.getBoundingClientRect();
                const tabRect = activeTabElement.getBoundingClientRect();
                setIndicatorStyle({
                    left: tabRect.left - containerRect.left,
                    width: tabRect.width,
                });
            }
        }
    }, [activeTab]);

    // Check if there's a tab query param (e.g., from redirect after create)
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam && ['settings', 'curriculum', 'analytics'].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    // Initialize indicator position on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            updateIndicator();
        }, 100);
        return () => clearTimeout(timer);
    }, [updateIndicator]);

    // Track previous tab for animation direction
    const handleTabChange = (value: string) => {
        setPrevTab(activeTab);
        setActiveTab(value);
    };

    // Update indicator when tab changes
    useEffect(() => {
        const timer = setTimeout(() => {
            updateIndicator();
        }, 10);
        return () => clearTimeout(timer);
    }, [activeTab, updateIndicator]);

    // Update indicator on window resize
    useEffect(() => {
        window.addEventListener('resize', updateIndicator);
        return () => window.removeEventListener('resize', updateIndicator);
    }, [updateIndicator]);

    // Determine slide direction
    const getSlideDirection = () => {
        if (!prevTab) return 'none';
        const currentIndex = tabOrder.indexOf(activeTab);
        const prevIndex = tabOrder.indexOf(prevTab);
        return currentIndex > prevIndex ? 'right' : 'left';
    };

    const slideDirection = getSlideDirection();

    const handlePreview = () => {
        window.open(`${basePath}/courses/${course.slug}`, '_blank');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (activeTab === 'settings' && settingsFormRef.current) {
                await settingsFormRef.current.handleSave(false);
                success(t('toast.courseSaved'));
            }
        } catch (error) {
            console.error('Save failed', error);
            error(t('toast.failedToSave'));
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAndExit = async () => {
        setSaving(true);
        try {
            if (activeTab === 'settings' && settingsFormRef.current) {
                await settingsFormRef.current.handleSave(true);
            } else {
                router.push(buildUrlWithParams(`${basePath}/courses`));
            }
        } catch (error) {
            console.error('Save failed', error);
            error(t('toast.failedToSave'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
            <div className="sm:max-w-4xl sm:mx-auto sm:px-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8 px-4 sm:px-0">
                    <div className="flex items-center gap-4 flex-1">
                        <Link 
                            href={`${basePath}/courses`}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                                {t('pageTitle')}
                            </h1>
                            <p className="text-[var(--brand-light)]/50 text-sm mt-1 truncate">{course.title}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handlePreview}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
                    >
                        <Eye className="w-4 h-4" />
                        {t('preview')}
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-1.5 mb-6 relative">
                    {/* Sliding Background Indicator */}
                    <div
                        className="absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] shadow-lg transition-all duration-300 ease-in-out z-0"
                        style={{
                            left: `${indicatorStyle.left}px`,
                            width: `${indicatorStyle.width}px`,
                        }}
                    />
                    
                    <div className="flex relative z-10">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    ref={(el) => { tabRefs.current[tab.id] = el; }}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`
                                        flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-medium text-sm transition-colors duration-200
                                        ${isActive 
                                            ? 'text-white' 
                                            : 'text-[var(--brand-light)]/50 hover:text-[var(--brand-light)]/80 hover:bg-[var(--dark-700)]'
                                        }
                                    `}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="relative overflow-hidden">
                    {/* Settings Tab */}
                    <div 
                        className={`
                            transition-all duration-500 ease-in-out
                            ${activeTab === 'settings' 
                                ? 'opacity-100 translate-x-0 relative' 
                                : slideDirection === 'right' 
                                    ? 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none' 
                                    : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'
                            }
                        `}
                    >
                        {activeTab === 'settings' && (
                            <CourseSettingsForm 
                                ref={settingsFormRef}
                                initialData={course} 
                                isEditing 
                                hideActions 
                                basePath={basePath}
                            />
                        )}
                    </div>
                    
                    {/* Curriculum Tab */}
                    <div 
                        className={`
                            transition-all duration-500 ease-in-out
                            ${activeTab === 'curriculum' 
                                ? 'opacity-100 translate-x-0 relative' 
                                : slideDirection === 'right' 
                                    ? 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none' 
                                    : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'
                            }
                        `}
                    >
                        {activeTab === 'curriculum' && (
                            <CurriculumBuilder course={course} />
                        )}
                    </div>

                    {/* Analytics Tab */}
                    <div 
                        className={`
                            transition-all duration-500 ease-in-out
                            ${activeTab === 'analytics' 
                                ? 'opacity-100 translate-x-0 relative' 
                                : slideDirection === 'right' 
                                    ? 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none' 
                                    : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'
                            }
                        `}
                    >
                        {activeTab === 'analytics' && (
                            <CourseAnalytics courseSlug={course.slug} />
                        )}
                    </div>
                </div>

                {/* Global Actions */}
                <div className="px-4 sm:px-0 pb-8 pt-6 border-t border-[var(--dark-600)] mt-6">
                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                        <button 
                            type="button" 
                            onClick={() => router.push(buildUrlWithParams(`${basePath}/courses`))}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl text-[var(--brand-light)]/70 bg-[var(--dark-700)] border border-[var(--dark-500)] hover:bg-[var(--dark-600)] font-medium transition-all"
                        >
                            {t('actions.cancel')}
                        </button>
                        
                        {activeTab === 'settings' && (
                            <button 
                                type="button" 
                                disabled={saving}
                                onClick={handleSave}
                                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--dark-600)] text-[var(--brand-light)] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--dark-500)]"
                            >
                                {saving ? t('actions.saving') : t('actions.saveAndContinue')}
                            </button>
                        )}
                        
                        <button 
                            type="button" 
                            disabled={saving}
                            onClick={handleSaveAndExit}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-[var(--dark-900)]/30 border-t-[var(--dark-900)] rounded-full animate-spin" />
                                    {t('actions.saving')}
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {t('actions.saveAndExit')}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                </div>
        </div>
    );
}
