'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Course } from '@/types/learning';
import CourseSettingsForm, { CourseSettingsFormRef } from './CourseSettingsForm';
import CurriculumBuilder from './CurriculumBuilder';
import CourseAnalytics from './CourseAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Settings, BookOpen, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
    course: Course;
}

export default function CourseEditorLayout({ course }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('settings');
    const [prevTab, setPrevTab] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
    const settingsFormRef = useRef<CourseSettingsFormRef>(null);
    const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

    // Tab order for animation direction
    const tabOrder = ['settings', 'curriculum', 'analytics'];

    // Update indicator position
    const updateIndicator = useCallback(() => {
        const activeTabElement = tabRefs.current[activeTab];
        if (activeTabElement) {
            const container = activeTabElement.parentElement?.parentElement; // TabsList -> container div
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
        // Small delay to ensure DOM is updated
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
        // Opens the player in a new tab
        window.open(`/admin/super/knowledge/courses/${course.slug}`, '_blank');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (activeTab === 'settings' && settingsFormRef.current) {
                await settingsFormRef.current.handleSave(false);
            }
            // For curriculum and analytics, changes are saved automatically
        } catch (error) {
            console.error('Save failed', error);
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
                router.push('/admin/super/knowledge/courses');
            }
        } catch (error) {
            console.error('Save failed', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/super/knowledge/courses">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Edit Course
                    </h1>
                    <p className="text-sm text-muted-foreground">{course.title}</p>
                </div>
                <div className="ml-auto flex gap-2">
                    <Button variant="outline" onClick={handlePreview}>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-1.5 mb-6 relative">
                    {/* Sliding Background Indicator */}
                    <div
                        className="absolute top-1.5 bottom-1.5 rounded-lg bg-gradient-to-r from-[#4D4DA4] to-[#6B6BC4] shadow-md transition-all duration-300 ease-in-out z-0"
                        style={{
                            left: `${indicatorStyle.left}px`,
                            width: `${indicatorStyle.width}px`,
                        }}
                    />
                    
                    <TabsList className="w-full justify-start bg-transparent p-0 h-auto gap-2 relative z-10">
                        <TabsTrigger 
                            ref={(el) => { tabRefs.current['settings'] = el; }}
                            value="settings" 
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-colors duration-200 relative z-10
                                data-[state=active]:text-white
                                data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900
                                data-[state=inactive]:hover:bg-gray-50
                                border-0 bg-transparent
                            `}
                        >
                            <Settings className="w-4 h-4" />
                            <span>Settings</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            ref={(el) => { tabRefs.current['curriculum'] = el; }}
                            value="curriculum" 
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-colors duration-200 relative z-10
                                data-[state=active]:text-white
                                data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900
                                data-[state=inactive]:hover:bg-gray-50
                                border-0 bg-transparent
                            `}
                        >
                            <BookOpen className="w-4 h-4" />
                            <span>Curriculum</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            ref={(el) => { tabRefs.current['analytics'] = el; }}
                            value="analytics" 
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-colors duration-200 relative z-10
                                data-[state=active]:text-white
                                data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900
                                data-[state=inactive]:hover:bg-gray-50
                                border-0 bg-transparent
                            `}
                        >
                            <BarChart3 className="w-4 h-4" />
                            <span>Analytics</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="py-6 relative overflow-hidden">
                    <div className="relative">
                        <TabsContent 
                            value="settings" 
                            key="settings"
                            className={`
                                mt-0 transition-all duration-500 ease-in-out
                                ${activeTab === 'settings' 
                                    ? 'opacity-100 translate-x-0 relative' 
                                    : slideDirection === 'right' 
                                        ? 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none' 
                                        : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'
                                }
                            `}
                        >
                            <div className="max-w-4xl mx-auto">
                                <CourseSettingsForm 
                                    ref={settingsFormRef}
                                    initialData={course} 
                                    isEditing 
                                    hideActions 
                                />
                            </div>
                        </TabsContent>
                        
                        <TabsContent 
                            value="curriculum" 
                            key="curriculum"
                            className={`
                                mt-0 transition-all duration-500 ease-in-out
                                ${activeTab === 'curriculum' 
                                    ? 'opacity-100 translate-x-0 relative' 
                                    : slideDirection === 'right' 
                                        ? 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none' 
                                        : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'
                                }
                            `}
                        >
                            <div className="max-w-4xl mx-auto">
                                <CurriculumBuilder course={course} />
                            </div>
                        </TabsContent>

                        <TabsContent 
                            value="analytics" 
                            key="analytics"
                            className={`
                                mt-0 transition-all duration-500 ease-in-out
                                ${activeTab === 'analytics' 
                                    ? 'opacity-100 translate-x-0 relative' 
                                    : slideDirection === 'right' 
                                        ? 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none' 
                                        : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'
                                }
                            `}
                        >
                            <div className="max-w-6xl mx-auto p-6">
                                <CourseAnalytics courseSlug={course.slug} />
                            </div>
                        </TabsContent>
                    </div>
                </div>
            </Tabs>

            {/* Global Actions */}
            <div className="flex justify-end gap-3 pb-10 border-t pt-6">
                <Button 
                    variant="ghost" 
                    type="button" 
                    onClick={() => router.push('/admin/super/knowledge/courses')}
                >
                    Cancel
                </Button>
                
                {activeTab === 'settings' && (
                    <Button 
                        type="button" 
                        variant="secondary" 
                        disabled={saving}
                        onClick={handleSave}
                    >
                        {saving ? 'Saving...' : 'Save & Continue Editing'}
                    </Button>
                )}
                
                <Button 
                    type="button" 
                    disabled={saving}
                    onClick={handleSaveAndExit}
                    className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white min-w-[150px]"
                >
                    {saving ? 'Saving...' : 'Save & Exit'}
                </Button>
            </div>
        </div>
    );
}