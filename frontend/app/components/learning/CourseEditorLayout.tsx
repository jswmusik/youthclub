'use client';

import { useState } from 'react';
import { Course } from '@/types/learning';
import CourseSettingsForm from './CourseSettingsForm';
import CurriculumBuilder from './CurriculumBuilder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
    course: Course;
}

export default function CourseEditorLayout({ course }: Props) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('settings');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin/super/knowledge/courses')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{course.title}</h1>
                        <p className="text-slate-500 text-sm">Editing Course</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
                    <TabsTrigger 
                        value="settings" 
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3"
                    >
                        Settings
                    </TabsTrigger>
                    <TabsTrigger 
                        value="curriculum" 
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3"
                    >
                        Curriculum
                    </TabsTrigger>
                    <TabsTrigger 
                        value="analytics" 
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3"
                    >
                        Analytics
                    </TabsTrigger>
                </TabsList>

                <div className="py-6">
                    <TabsContent value="settings">
                        <CourseSettingsForm initialData={course} isEditing />
                    </TabsContent>
                    
                    <TabsContent value="curriculum">
                        <CurriculumBuilder course={course} />
                    </TabsContent>

                    <TabsContent value="analytics">
                        <div className="p-8 text-center text-slate-500">
                            Analytics will appear here once users start taking the course.
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}