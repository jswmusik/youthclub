import CategoryManager from "@/app/components/learning/CategoryManager";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CategoriesPage() {
    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-6 flex items-center gap-4">
                <Button variant="ghost" asChild>
                    <Link href="/admin/super/knowledge/courses">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Courses
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold">Manage Categories</h1>
            </div>
            
            <CategoryManager />
        </div>
    );
}

